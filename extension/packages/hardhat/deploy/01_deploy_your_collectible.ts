import { artifacts, deployScript } from "../rocketh/deploy.js";

/**
 * Deploys a contract named "YourCollectible".
 *
 * On localhost, the deployer account is the one that comes with Hardhat, which is already funded.
 *
 * When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
 * should have sufficient balance to pay for the gas fees for contract creation.
 *
 * You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED
 * in the .env file (used in hardhat.config.ts).
 * Run `yarn account` to check the deployer balance on every network.
 */
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("YourCollectible", {
      account: deployer,
      artifact: artifacts.YourCollectible,
      args: [],
    });
  },
  // Tags are useful if you have multiple deploy files and only want to run one of them.
  // e.g. yarn deploy --tags YourCollectible
  { tags: ["YourCollectible"] },
);
