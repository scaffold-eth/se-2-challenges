import { artifacts, deployScript } from "../rocketh/deploy.js";
import { parseEther } from "viem";

/**
 * Deploys a contract named "Vendor" using the deployer account.
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
  async env => {
    const { deployer } = env.namedAccounts;
    const yourToken = env.get<typeof artifacts.YourToken.abi>("YourToken");

    /**
     * Student TODO:
     * - Put the address you're using in the frontend here (leave "" to default to the deployer)
     */
    const FRONTEND_ADDRESS = "";

    /**
     * Mode switch:
     * - If true: deploy Vendor and seed it with the token balance
     * - If false: send tokens to your frontend address (or deployer if unset)
     */
    const SEND_TOKENS_TO_VENDOR = false; // Don't switch until Checkpoint 2!

    const recipientAddress =
      FRONTEND_ADDRESS && FRONTEND_ADDRESS.trim().length > 0 ? (FRONTEND_ADDRESS as `0x${string}`) : deployer;

    if (!SEND_TOKENS_TO_VENDOR) {
      // Send the entire initial supply to the wallet you use in the UI (useful when deployer != UI wallet).
      // If FRONTEND_ADDRESS is "", this defaults to the deployer (no-op transfer).
      if (recipientAddress !== deployer) {
        await env.execute(yourToken, {
          functionName: "transfer",
          args: [recipientAddress, parseEther("1000")],
          account: deployer,
        });
      }
      return;
    } else {
      // Deploy Vendor
      const vendor = await env.deploy("Vendor", {
        account: deployer,
        artifact: artifacts.Vendor,
        args: [yourToken.address],
      });

      // Transfer tokens to Vendor (seed inventory)
      await env.execute(yourToken, {
        functionName: "transfer",
        args: [vendor.address, parseEther("1000")],
        account: deployer,
      });

      // Make the UI wallet the owner (for withdraw(), etc). Defaults to deployer if unset.
      await env.execute(vendor, {
        functionName: "transferOwnership",
        args: [recipientAddress],
        account: deployer,
      });
    }
  },
  // Tags are useful if you have multiple deploy files and only want to run one of them.
  // e.g. yarn deploy --tags Vendor
  { tags: ["Vendor"] },
);
