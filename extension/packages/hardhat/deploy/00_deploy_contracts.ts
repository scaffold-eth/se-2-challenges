import { artifacts, deployScript } from "../rocketh/deploy.js";
import { parseEther, getContractAddress } from "viem";
import { fetchPriceFromUniswap } from "../scripts/fetchPriceFromUniswap.js";

/**
 * Deploys "RateController", "MyUSD", "DEX", "Oracle", "MyUSDStaking" and "MyUSDEngine" using the deployer account.
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

    const ethPrice = await fetchPriceFromUniswap();

    // Add the account that you want to be the owner of your contracts when deployment is complete
    const CONTRACT_OWNER = deployer; // Change this if you want to update the rates with a different account than the deployer

    // Get the deployer's current nonce
    const nonceHex = (await env.network.provider.request({
      method: "eth_getTransactionCount",
      params: [deployer, "pending"],
    })) as `0x${string}`;
    const deployerNonce = Number(BigInt(nonceHex));

    // Calculate future addresses based on nonce
    const futureStakingAddress = getContractAddress({
      from: deployer,
      nonce: BigInt(deployerNonce + 4), // +4 because it will be our fifth deployment (after MyUSD, DEX, Oracle, RateController)
    });

    const futureEngineAddress = getContractAddress({
      from: deployer,
      nonce: BigInt(deployerNonce + 5), // +5 because it will be our sixth deployment (after MyUSD, DEX, Oracle, Staking, RateController)
    });

    const rateController = await env.deploy("RateController", {
      account: deployer,
      artifact: artifacts.RateController,
      args: [futureEngineAddress, futureStakingAddress],
    });

    const stablecoin = await env.deploy("MyUSD", {
      account: deployer,
      artifact: artifacts.MyUSD,
      args: [futureEngineAddress, futureStakingAddress],
    });

    const DEX = await env.deploy("DEX", {
      account: deployer,
      artifact: artifacts.DEX,
      args: [stablecoin.address],
    });

    const oracle = await env.deploy("Oracle", {
      account: deployer,
      artifact: artifacts.Oracle,
      args: [DEX.address, ethPrice],
    });

    const staking = await env.deploy("MyUSDStaking", {
      account: deployer,
      artifact: artifacts.MyUSDStaking,
      args: [stablecoin.address, futureEngineAddress, rateController.address],
    });

    // Finally deploy the engine at the predicted address
    const engine = await env.deploy("MyUSDEngine", {
      account: deployer,
      artifact: artifacts.MyUSDEngine,
      args: [oracle.address, stablecoin.address, staking.address, rateController.address],
    });

    if (engine.address.toLowerCase() !== futureEngineAddress.toLowerCase()) {
      throw new Error(
        "Engine address does not match predicted address, did you add transactions above this line that would skew the nonce set for 'futureEngineAddress'?",
      );
    }

    if (env.name === "default" || env.name === "localhost") {
      // Set deployer ETH balance
      // hardhat_setBalance is not part of the provider's typed RPC schema, so we
      // override the schema to type the params for this single call.
      await env.network.provider.request<{ params: [string, string]; result: null }>({
        method: "hardhat_setBalance",
        params: [deployer, `0x${parseEther("100000000000000000000").toString(16)}`],
      });

      // The deployer is going to provide liquidity to the DEX so that we can swap tokens
      // First they will borrow stablecoins and then provide liquidity to the DEX
      // We will make the deployer account deposit a tone of collateral so they are rarely at risk of liquidation
      const ethCollateralAmount = parseEther("10000000000000000000");
      // Set initial price of stablecoin (as determined by DEX liquidity)
      const ethDEXAmount = parseEther("10000000");
      const myUSDAmount = ethPrice * 10000000n;

      // Borrow stablecoins
      await env.execute(engine, {
        functionName: "addCollateral",
        args: [],
        value: ethCollateralAmount,
        account: deployer,
      });
      await env.execute(engine, {
        functionName: "mintMyUSD",
        args: [myUSDAmount],
        account: deployer,
      });

      const confirmedBalance = (await env.read(stablecoin, {
        functionName: "balanceOf",
        args: [deployer],
      })) as bigint;
      // Don't add DEX liquidity if the deployer account doesn't have the stablecoins
      if (confirmedBalance === myUSDAmount) {
        // Approve DEX to use tokens and initialize DEX
        await env.execute(stablecoin, {
          functionName: "approve",
          args: [DEX.address, myUSDAmount],
          account: deployer,
        });
        await env.execute(DEX, {
          functionName: "init",
          args: [myUSDAmount],
          value: ethDEXAmount,
          account: deployer,
        });
      }

      // Set the owner of the engine and staking contracts
      if (CONTRACT_OWNER !== deployer) {
        await env.execute(engine, {
          functionName: "transferOwnership",
          args: [CONTRACT_OWNER],
          account: deployer,
        });
        await env.execute(staking, {
          functionName: "transferOwnership",
          args: [CONTRACT_OWNER],
          account: deployer,
        });
      }
    }
  },
  { tags: ["MyUSDEngine"] },
);
