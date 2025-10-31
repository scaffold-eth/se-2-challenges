import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { decodeEventLog } from "viem";
import { fetchPriceFromUniswap } from "../scripts/fetchPriceFromUniswap";

/**
 * Deploys a WhitelistOracle contract and creates SimpleOracle instances through it
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployWhitelistOracleContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { viem } = hre;

  const publicClient = await viem.getPublicClient();

  console.log("Deploying WhitelistOracle contract...");
  const whitelistOracleDeployment = await deploy("WhitelistOracle", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  const whitelistOracleAddress = whitelistOracleDeployment.address as `0x${string}`;
  const whitelistOracleAbi = whitelistOracleDeployment.abi;

  // Skip the rest of the setup if we are on a live network
  if (hre.network.name === "localhost") {
    // Get 10 wallet clients (accounts) to be oracle owners
    const accounts = await viem.getWalletClients();
    const nodeAccounts = accounts.slice(0, 10);

    console.log("Creating SimpleOracle instances through WhitelistOracle...");
    const deployerAccount = accounts.find(a => a.account.address.toLowerCase() === deployer.toLowerCase());
    if (!deployerAccount) throw new Error("Deployer account not found in wallet clients");

    // Create SimpleOracle instances through WhitelistOracle.addOracle() concurrently
    // This creates new SimpleOracle contracts owned by the specified addresses
    const nonce = await publicClient.getTransactionCount({ address: deployerAccount.account.address });
    const addOracleTxPromises = nodeAccounts.map((nodeAccount, i) => {
      const ownerAddress = nodeAccount.account.address;
      console.log(`Creating SimpleOracle ${i + 1}/10 with owner: ${ownerAddress}`);
      return deployerAccount.writeContract({
        address: whitelistOracleAddress,
        abi: whitelistOracleAbi,
        functionName: "addOracle",
        args: [ownerAddress],
        nonce: nonce + i,
      });
    });

    const addOracleTxHashes = await Promise.all(addOracleTxPromises);
    const addOracleReceipts = await Promise.all(
      addOracleTxHashes.map(hash => publicClient.waitForTransactionReceipt({ hash })),
    );

    // Map owner => created oracle address from events
    const ownerToOracleAddress = new Map<string, string>();
    for (const receipt of addOracleReceipts) {
      const oracleAddedEvent = receipt.logs.find(log => {
        try {
          const decoded = decodeEventLog({
            abi: whitelistOracleAbi,
            data: log.data,
            topics: log.topics,
          }) as { eventName: string; args: { oracleAddress: string; oracleOwner: string } };
          return decoded.eventName === "OracleAdded";
        } catch {
          return false;
        }
      });
      if (!oracleAddedEvent) continue;
      const decoded = decodeEventLog({
        abi: whitelistOracleAbi,
        data: oracleAddedEvent.data,
        topics: oracleAddedEvent.topics,
      }) as { eventName: string; args: { oracleAddress: string; oracleOwner: string } };
      ownerToOracleAddress.set(decoded.args.oracleOwner.toLowerCase(), decoded.args.oracleAddress);
      console.log(`✅ Created SimpleOracle at: ${decoded.args.oracleAddress}`);
    }

    const createdOracleAddresses: string[] = nodeAccounts.map(acc => {
      const addr = ownerToOracleAddress.get(acc.account.address.toLowerCase());
      if (!addr) throw new Error(`Missing oracle address for owner ${acc.account.address}`);
      return addr;
    });

    // Set initial prices for each created SimpleOracle
    console.log("Setting initial prices for each SimpleOracle...");
    const initialPrice = await fetchPriceFromUniswap();
    // Get SimpleOracle ABI from deployments
    const simpleOracleDeployment = await hre.deployments.getArtifact("SimpleOracle");
    const simpleOracleAbi = simpleOracleDeployment.abi;
    // Fire all setPrice transactions concurrently from each node owner
    const setPriceTxPromises = nodeAccounts.map((account, i) => {
      const oracleAddress = createdOracleAddresses[i];
      return account.writeContract({
        address: oracleAddress as `0x${string}`,
        abi: simpleOracleAbi,
        functionName: "setPrice",
        args: [initialPrice],
      });
    });
    const setPriceTxHashes = await Promise.all(setPriceTxPromises);
    await Promise.all(setPriceTxHashes.map(hash => publicClient.waitForTransactionReceipt({ hash })));
    for (let i = 0; i < createdOracleAddresses.length; i++) {
      console.log(`Set price for SimpleOracle ${i + 1} to: ${initialPrice}`);
    }

    // Calculate initial median price
    console.log("Calculating initial median price...");
    const medianPrice = await publicClient.readContract({
      address: whitelistOracleAddress,
      abi: whitelistOracleAbi,
      functionName: "getPrice",
      args: [],
    });
    console.log(`Initial median price: ${medianPrice.toString()}`);
  }
  console.log("WhitelistOracle contract deployed and configured successfully!");
};

export default deployWhitelistOracleContracts;
deployWhitelistOracleContracts.tags = ["Oracles"];
