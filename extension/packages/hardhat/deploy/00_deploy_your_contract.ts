import { artifacts, deployScript } from "../rocketh/deploy.js";
import { parseEther } from "viem";
import * as fs from "fs";

/**
 * Deploys a contract named "PredictionMarket" using the deployer account.
 *
 * On localhost, the deployer account is the one that comes with Hardhat, which is already funded.
 *
 * When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
 * should have sufficient balance to pay for the gas fees for contract creation.
 *
 * You can generate a random account with `yarn generate` or `yarn account:import` to import your
 * existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (used in hardhat.config.ts).
 * Run `yarn account` to check the deployer balance on every network.
 */
export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    const question = "Will the green car win the race?";
    const initialLiquidity = parseEther("1");
    const initialTokenValue = parseEther("0.01");
    const initialProbability = 50;
    const percentageLocked = 10;
    const liquidityProvider = deployer;
    const oracle = deployer;

    const predictionMarket = await env.deploy("PredictionMarket", {
      account: deployer,
      artifact: artifacts.PredictionMarket,
      args: [liquidityProvider, oracle, question, initialTokenValue, initialProbability, percentageLocked],
      value: initialLiquidity,
    });

    console.log("PredictionMarket deployed to:", predictionMarket.address);

    // Get the deployed contract's address and ABI for the YES and NO tokens and copy them to the deployments directory
    try {
      const i_yesToken = (await env.read(predictionMarket, { functionName: "i_yesToken" })) as `0x${string}`;
      const i_noToken = (await env.read(predictionMarket, { functionName: "i_noToken" })) as `0x${string}`;
      const abi = artifacts.PredictionMarketToken.abi;
      const yesToken = { address: i_yesToken, abi };
      const noToken = { address: i_noToken, abi };

      const chainDir = `./deployments/${env.name}`;
      fs.writeFileSync(`${chainDir}/PredictionMarketTokenYes.json`, JSON.stringify(yesToken, null, 2));
      fs.writeFileSync(`${chainDir}/PredictionMarketTokenNo.json`, JSON.stringify(noToken, null, 2));
      console.log("Token JSON files written successfully");
    } catch (error) {
      console.error("Error handling token files:", error);
    }
  },
  // Tags are useful if you have multiple deploy files and only want to run one of them.
  // e.g. yarn deploy --tags PredictionMarket
  { tags: ["PredictionMarket"] },
);
