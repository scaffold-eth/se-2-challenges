import { HardhatRuntimeEnvironment } from "hardhat/types";

const getStakedAmount = async (publicClient: any, nodeAddress: `0x${string}`, oracleContract: any) => {
  const nodeInfo = (await publicClient.readContract({
    address: oracleContract.address as `0x${string}`,
    abi: oracleContract.abi,
    functionName: "nodes",
    args: [nodeAddress],
  })) as any[];

  const [, stakedAmount] = nodeInfo;
  return stakedAmount as bigint;
};

export const claimRewards = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;
  const oracleContract = await deployments.get("StakingOracle");
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

  try {
    return Promise.all(
      oracleNodeAccounts.map(async account => {
        const stakedAmount = await getStakedAmount(publicClient, account.account.address, oracleContract);

        // Only claim rewards if the node has sufficient stake
        if (stakedAmount >= minimumStake) {
          try {
            console.log(`Claiming rewards for ${account.account.address}`);
            return await account.writeContract({
              address: oracleContract.address as `0x${string}`,
              abi: oracleContract.abi,
              functionName: "claimReward",
              args: [],
            });
          } catch (error: any) {
            if (error.message && error.message.includes("No rewards available")) {
              console.log(`Skipping reward claim for ${account.account.address} - no rewards available`);
              return Promise.resolve();
            }
            throw error;
          }
        } else {
          console.log(`Skipping reward claim for ${account.account.address} - insufficient stake`);
          return Promise.resolve();
        }
      }),
    );
  } catch (error) {
    console.error("Error claiming rewards:", error);
  }
};

// Keep the old validateNodes function for backward compatibility if needed
export const validateNodes = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;
  const [account] = await hre.viem.getWalletClients();
  const oracleContract = await deployments.get("StakingOracle");

  try {
    return await account.writeContract({
      address: oracleContract.address as `0x${string}`,
      abi: oracleContract.abi,
      functionName: "slashNodes",
      args: [],
    });
  } catch (error) {
    console.error("Error validating nodes:", error);
  }
};
