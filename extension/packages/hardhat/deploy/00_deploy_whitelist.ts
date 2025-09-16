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

    // Create SimpleOracle instances through WhitelistOracle.addOracle()
    // This creates new SimpleOracle contracts owned by the specified addresses
    const createdOracleAddresses: string[] = [];

    for (let i = 0; i < nodeAccounts.length; i++) {
      const ownerAddress = nodeAccounts[i].account.address;
      console.log(`Creating SimpleOracle ${i + 1}/10 with owner: ${ownerAddress}`);

      // Call addOracle which creates a new SimpleOracle instance
      const txHash = await deployerAccount.writeContract({
        address: whitelistOracleAddress,
        abi: whitelistOracleAbi,
        functionName: "addOracle",
        args: [ownerAddress],
      });

      // Wait for transaction and get the created oracle address from event
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
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

      if (oracleAddedEvent) {
        const decoded = decodeEventLog({
          abi: whitelistOracleAbi,
          data: oracleAddedEvent.data,
          topics: oracleAddedEvent.topics,
        }) as { eventName: string; args: { oracleAddress: string; oracleOwner: string } };
        const oracleAddress = decoded.args.oracleAddress;
        createdOracleAddresses.push(oracleAddress);
        console.log(`✅ Created SimpleOracle at: ${oracleAddress}`);
      }
    }

    // Set initial prices for each created SimpleOracle
    console.log("Setting initial prices for each SimpleOracle...");
    const initialPrice = await fetchPriceFromUniswap();

    for (let i = 0; i < createdOracleAddresses.length; i++) {
      const account = nodeAccounts[i];
      const oracleAddress = createdOracleAddresses[i] as `0x${string}`;

      // Get SimpleOracle ABI from deployments
      const simpleOracleDeployment = await hre.deployments.getArtifact("SimpleOracle");
      const simpleOracleAbi = simpleOracleDeployment.abi;

      await account.writeContract({
        address: oracleAddress,
        abi: simpleOracleAbi,
        functionName: "setPrice",
        args: [initialPrice],
      });

      await publicClient.transport.request({
        method: "evm_mine",
      });

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
