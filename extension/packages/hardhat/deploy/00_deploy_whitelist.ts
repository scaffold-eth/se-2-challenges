import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { fetchPriceFromUniswap } from "../scripts/fetchPriceFromUniswap";

/**
 * Deploys SimpleOracle instances and a WhitelistOracle contract using viem
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployWhitelistOracleContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { viem } = hre;

  const publicClient = await viem.getPublicClient();

  console.log("Deploying WhitelistOracle contracts...");

  // Get 10 wallet clients (accounts)
  const accounts = await viem.getWalletClients();
  const nodeAccounts = accounts.slice(0, 10);
  const simpleOracleAddresses: string[] = [];

  // Deploy 10 SimpleOracle contracts, each owned by a different account
  for (let i = 0; i < nodeAccounts.length; i++) {
    const account = nodeAccounts[i];
    console.log(`Deploying SimpleOracle ${i + 1}/10 from account: ${account.account.address}`);
    const simpleOracle = await deploy(`SimpleOracle_${i + 1}`, {
      contract: "SimpleOracle",
      from: account.account.address,
      args: [],
      log: true,
      autoMine: true,
    });
    simpleOracleAddresses.push(simpleOracle.address);
  }

  console.log("Deploying WhitelistOracle...");

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
    // Add all SimpleOracle addresses to WhitelistOracle
    console.log("Adding SimpleOracle instances to WhitelistOracle...");
    const deployerAccount = accounts.find(a => a.account.address.toLowerCase() === deployer.toLowerCase());
    if (!deployerAccount) throw new Error("Deployer account not found in wallet clients");

    try {
      for (let i = 0; i < simpleOracleAddresses.length; i++) {
        const oracleAddress = simpleOracleAddresses[i] as `0x${string}`;
        console.log(`Adding SimpleOracle ${i + 1}/10: ${oracleAddress}`);
        await deployerAccount.writeContract({
          address: whitelistOracleAddress,
          abi: whitelistOracleAbi,
          functionName: "addOracle",
          args: [oracleAddress],
        });
      }
    } catch (error: any) {
      if (hre.network.name === "localhost") {
        if (error.message?.includes("Oracle already exists")) {
          console.error("\n❌ Deployment failed: Oracle contracts already exist!\n");
          console.error("🔧 Please retry with:");
          console.error("yarn deploy --reset\n");
          process.exit(1);
        } else {
          throw error;
        }
      }
    }

    // Set initial prices for each SimpleOracle
    console.log("Setting initial prices for each SimpleOracle...");
    const initialPrice = await fetchPriceFromUniswap();
    for (let i = 0; i < nodeAccounts.length; i++) {
      const account = nodeAccounts[i];
      const simpleOracleDeployment = await hre.deployments.get(`SimpleOracle_${i + 1}`);
      const simpleOracleAbi = simpleOracleDeployment.abi;
      const simpleOracleAddress = simpleOracleDeployment.address as `0x${string}`;
      await account.writeContract({
        address: simpleOracleAddress,
        abi: simpleOracleAbi,
        functionName: "setPrice",
        args: [initialPrice],
      });

      await publicClient.transport.request({
        method: "evm_mine",
      });

      console.log(`Set price for SimpleOracle_${i + 1} to: ${initialPrice}`);
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
  console.log("All oracle contracts deployed and configured successfully!");
};

export default deployWhitelistOracleContracts;
deployWhitelistOracleContracts.tags = ["Oracles"];
