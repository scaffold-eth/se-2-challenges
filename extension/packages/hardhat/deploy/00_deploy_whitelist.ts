import { artifacts, deployScript } from "../rocketh/deploy.js";
import { fetchPriceFromUniswap } from "../scripts/fetchPriceFromUniswap.js";

/**
 * Deploys a WhitelistOracle contract and creates SimpleOracle instances through it.
 */
export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    console.log("Deploying WhitelistOracle contract...");
    const whitelistOracle = await env.deploy("WhitelistOracle", {
      account: deployer,
      artifact: artifacts.WhitelistOracle,
      args: [],
    });

    // Skip the rest of the setup if we are on a live network
    if (env.name === "default" || env.name === "localhost") {
      // Use the hardhat node's own accounts as oracle owners: deployer + the first 9 unnamed accounts.
      const nodeOwners = [deployer, ...env.unnamedAccounts.slice(0, 9)] as `0x${string}`[];

      console.log("Creating SimpleOracle instances through WhitelistOracle...");
      for (let i = 0; i < nodeOwners.length; i++) {
        console.log(`Creating SimpleOracle ${i + 1}/${nodeOwners.length} with owner: ${nodeOwners[i]}`);
        await env.execute(whitelistOracle, {
          functionName: "addOracle",
          args: [nodeOwners[i]],
          account: deployer,
        });
      }

      // WhitelistOracle appends each created SimpleOracle to its `oracles` array, so oracles(i) is the
      // instance owned by nodeOwners[i].
      const createdOracleAddresses: `0x${string}`[] = [];
      for (let i = 0; i < nodeOwners.length; i++) {
        const oracleAddress = (await env.read(whitelistOracle, {
          functionName: "oracles",
          args: [BigInt(i)],
        })) as `0x${string}`;
        createdOracleAddresses.push(oracleAddress);
        console.log(`✅ Created SimpleOracle at: ${oracleAddress}`);
      }

      // Set initial prices for each created SimpleOracle. These instances are created at runtime via
      // addOracle (not deployed through rocketh), so they are targeted by { address, abi } rather than a
      // deployment object. Each owner sets the price on its own oracle.
      console.log("Setting initial prices for each SimpleOracle...");
      const initialPrice = await fetchPriceFromUniswap();
      const simpleOracleAbi = artifacts.SimpleOracle.abi;
      for (let i = 0; i < createdOracleAddresses.length; i++) {
        await env.execute(
          { address: createdOracleAddresses[i], abi: simpleOracleAbi },
          { functionName: "setPrice", args: [initialPrice], account: nodeOwners[i] },
        );
        console.log(`Set price for SimpleOracle ${i + 1} to: ${initialPrice}`);
      }

      // Calculate initial median price
      console.log("Calculating initial median price...");
      const medianPrice = await env.read(whitelistOracle, { functionName: "getPrice", args: [] });
      console.log(`Initial median price: ${medianPrice.toString()}`);
    }
    console.log("WhitelistOracle contract deployed and configured successfully!");
  },
  { tags: ["Oracles"] },
);
