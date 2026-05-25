import { parseEther } from "viem";
import { artifacts, deployScript } from "../rocketh/deploy.js";

/**
 * Deploys "Balloons" and "DEX".
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
  async ({ deploy, execute, namedAccounts }) => {
    const { deployer } = namedAccounts;

    const balloons = await deploy("Balloons", {
      account: deployer,
      artifact: artifacts.Balloons,
      args: [],
    });

    const dex = await deploy("DEX", {
      account: deployer,
      artifact: artifacts.DEX,
      args: [balloons.address],
    });

    // // CHECKPOINT 2: Replace with your front-end address to get 10 balloons on deploy.
    // // Default is the Hardhat test account #1 — works out-of-the-box on local.
    // const frontendAddress = "YOUR_FRONTEND_ADDRESS";
    // await execute(balloons, { functionName: "transfer", args: [frontendAddress, parseEther("10")], account: deployer });

    // // CHECKPOINT 3: Uncomment to init DEX on deploy:
    // console.log("Approving DEX (" + dex.address + ") to take Balloons from main account...");
    // await execute(balloons, { functionName: "approve", args: [dex.address, parseEther("100")], account: deployer });
    // console.log("INIT exchange...");
    // await execute(dex, { functionName: "init", args: [parseEther("5")], value: parseEther("5"), account: deployer });
  },
  // Tags are useful if you have multiple deploy files and only want to run one of them.
  // e.g. yarn deploy --tags DEX
  { tags: ["Balloons", "DEX"] },
);
