import { artifacts, deployScript } from "../rocketh/deploy.js";
import { getContractAddress } from "viem";

export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    console.log("Deploying OptimisticOracle...");
    // Get the deployer's current nonce
    const nonceHex = (await env.network.provider.request({
      method: "eth_getTransactionCount",
      params: [deployer, "pending"],
    })) as `0x${string}`;
    const deployerNonce = Number(BigInt(nonceHex));

    const futureDeciderAddress = getContractAddress({
      from: deployer,
      nonce: BigInt(deployerNonce + 1), // +1 because it will be our second deployment
    });

    // Deploy the OptimisticOracle contract with deployer as temporary decider
    const optimisticOracle = await env.deploy("OptimisticOracle", {
      account: deployer,
      artifact: artifacts.OptimisticOracle,
      args: [futureDeciderAddress],
    });

    // Deploy the Decider contract
    const decider = await env.deploy("Decider", {
      account: deployer,
      artifact: artifacts.Decider,
      args: [optimisticOracle.address],
    });

    // Check if the decider address matches the expected address
    if (decider.address.toLowerCase() !== futureDeciderAddress.toLowerCase()) {
      throw new Error("Decider address does not match expected address");
    }

    console.log("OptimisticOracle deployed to:", optimisticOracle.address);
    console.log("Decider deployed to:", decider.address);
  },
  { tags: ["OptimisticOracle"] },
);
