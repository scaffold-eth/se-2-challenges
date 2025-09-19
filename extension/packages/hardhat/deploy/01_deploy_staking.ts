import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "viem";
import { fetchPriceFromUniswap } from "../scripts/fetchPriceFromUniswap";

const deployStakingOracle: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { viem } = hre;

  console.log("Deploying Staking Oracle contract...");
  const deployment = await deploy("StakingOracle", {
    contract: "StakingOracle",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const stakingOracleAddress = deployment.address as `0x${string}`;
  console.log("StakingOracle deployed at:", stakingOracleAddress);

  if (hre.network.name === "localhost") {
    const accounts = await viem.getWalletClients();
    const nodeAccounts = accounts.slice(1, 11);

    const publicClient = await viem.getPublicClient();

    const oraTokenAddress = await publicClient.readContract({
      address: stakingOracleAddress,
      abi: deployment.abi,
      functionName: "oracleToken",
      args: [],
    });
    console.log("ORA Token deployed at:", oraTokenAddress);
    const initialPrice = await fetchPriceFromUniswap();

    try {
      await Promise.all(
        nodeAccounts.map(account => {
          return account.writeContract({
            address: stakingOracleAddress,
            abi: deployment.abi,
            functionName: "registerNode",
            args: [initialPrice],
            value: parseEther("15"),
          });
        }),
      );
    } catch (error: any) {
      if (error.message?.includes("NodeAlreadyRegistered")) {
        console.error("\n❌ Deployment failed: Nodes already registered!\n");
        console.error("🔧 Please retry with:");
        console.error("yarn deploy --reset\n");
        process.exit(1);
      } else {
        throw error;
      }
    }

    const nodeAddresses = await publicClient.readContract({
      address: stakingOracleAddress,
      abi: deployment.abi,
      functionName: "getNodeAddresses",
      args: [],
    });

    // Map node addresses to their corresponding wallet clients
    const nodeWalletClients = nodeAddresses
      .map(nodeAddress => {
        return nodeAccounts.find(client => client.account.address === nodeAddress);
      })
      .filter(client => client !== undefined);

    await Promise.all(
      nodeWalletClients.map(walletClient => {
        return walletClient.writeContract({
          address: stakingOracleAddress,
          abi: deployment.abi,
          functionName: "reportPrice",
          args: [initialPrice],
        });
      }),
    );
  }
};

export default deployStakingOracle;
