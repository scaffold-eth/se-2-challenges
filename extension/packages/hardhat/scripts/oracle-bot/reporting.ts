import { PublicClient } from "viem";
import { getRandomPrice } from "./price";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getConfig } from "../utils";
import { fetchPriceFromUniswap } from "../fetchPriceFromUniswap";
import { DeployedContract } from "hardhat-deploy/types";

const getStakedAmount = async (
  publicClient: PublicClient,
  nodeAddress: `0x${string}`,
  oracleContract: DeployedContract,
) => {
  const nodeInfo = (await publicClient.readContract({
    address: oracleContract.address as `0x${string}`,
    abi: oracleContract.abi,
    functionName: "nodes",
    args: [nodeAddress],
  })) as any[];

  const [, stakedAmount] = nodeInfo;
  return stakedAmount as bigint;
};

export const reportPrices = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;
  const oracleContract = await deployments.get("StakingOracle");
  const config = getConfig();
  const accounts = await hre.viem.getWalletClients();
  const oracleNodeAccounts = accounts.slice(1, 11);
  const publicClient = await hre.viem.getPublicClient();

  // Get minimum stake requirement from contract
  const minimumStake = (await publicClient.readContract({
    address: oracleContract.address as `0x${string}`,
    abi: oracleContract.abi,
    functionName: "MINIMUM_STAKE",
    args: [],
  })) as unknown as bigint;

  const currentPrice = Number(await fetchPriceFromUniswap());
  try {
    return Promise.all(
      oracleNodeAccounts.map(async account => {
        const nodeConfig = config.NODE_CONFIGS[account.account.address] || config.NODE_CONFIGS.default;
        const shouldReport = Math.random() > nodeConfig.PROBABILITY_OF_SKIPPING_REPORT;
        const stakedAmount = await getStakedAmount(publicClient, account.account.address, oracleContract);
        if (stakedAmount < minimumStake) {
          console.log(`Insufficient stake for ${account.account.address} for price reporting`);
          return Promise.resolve();
        }

        if (shouldReport) {
          const price = BigInt(await getRandomPrice(account.account.address, currentPrice));
          console.log(`Reporting price ${price} from ${account.account.address}`);
          try {
            return await account.writeContract({
              address: oracleContract.address as `0x${string}`,
              abi: oracleContract.abi,
              functionName: "reportPrice",
              args: [price],
            });
          } catch (error: any) {
            if (error.message && error.message.includes("Not enough stake")) {
              console.log(
                `Skipping price report from ${account.account.address} - insufficient stake during execution`,
              );
              return Promise.resolve();
            }
            throw error;
          }
        } else {
          console.log(`Skipping price report from ${account.account.address}`);
          return Promise.resolve();
        }
      }),
    );
  } catch (error) {
    console.error("Error reporting prices:", error);
  }
};
