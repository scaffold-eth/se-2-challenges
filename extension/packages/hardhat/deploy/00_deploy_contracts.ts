import { artifacts, deployScript } from "../rocketh/deploy.js";
import { parseEther } from "viem";

/**
 * Deploys "Corn", "CornDEX", "Lending" and "MovePrice" using the deployer account.
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

    const cornToken = await env.deploy("Corn", {
      account: deployer,
      artifact: artifacts.Corn,
      args: [],
    });

    const cornDEX = await env.deploy("CornDEX", {
      account: deployer,
      artifact: artifacts.CornDEX,
      args: [cornToken.address],
    });

    const lending = await env.deploy("Lending", {
      account: deployer,
      artifact: artifacts.Lending,
      args: [cornDEX.address, cornToken.address],
    });

    // Set up the move price contract
    const movePrice = await env.deploy("MovePrice", {
      account: deployer,
      artifact: artifacts.MovePrice,
      args: [cornDEX.address, cornToken.address],
    });

    // Only set up contract state on local network
    if (env.name === "default" || env.name === "localhost") {
      // Give ETH and CORN to the move price contract
      await env.network.provider.request<{ params: [`0x${string}`, `0x${string}`]; result: null }>({
        method: "hardhat_setBalance",
        params: [movePrice.address, `0x${parseEther("10000000000000000000000").toString(16)}`],
      });
      await env.execute(cornToken, {
        functionName: "mintTo",
        args: [movePrice.address, parseEther("10000000000000000000000")],
        account: deployer,
      });
      // Lenders deposit CORN to the lending contract
      await env.execute(cornToken, {
        functionName: "mintTo",
        args: [lending.address, parseEther("10000000000000000000000")],
        account: deployer,
      });
      // Give CORN and ETH to the deployer
      await env.execute(cornToken, {
        functionName: "mintTo",
        args: [deployer, parseEther("1000000000000")],
        account: deployer,
      });
      await env.network.provider.request<{ params: [`0x${string}`, `0x${string}`]; result: null }>({
        method: "hardhat_setBalance",
        params: [deployer, `0x${parseEther("100000000000").toString(16)}`],
      });

      await env.execute(cornToken, {
        functionName: "approve",
        args: [cornDEX.address, parseEther("1000000000")],
        account: deployer,
      });
      await env.execute(cornDEX, {
        functionName: "init",
        args: [parseEther("1000000000")],
        value: parseEther("1000000"),
        account: deployer,
      });
    }
  },
  { tags: ["Lending"] },
);
