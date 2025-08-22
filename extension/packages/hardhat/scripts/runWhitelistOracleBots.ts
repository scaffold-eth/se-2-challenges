import { ethers } from "hardhat";
import { WhitelistOracle } from "../typechain-types";
import hre from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { fetchPriceFromUniswap } from "./fetchPriceFromUniswap";
import { cleanup, sleep } from "./utils";

async function getAllOracles() {
  const [deployer] = await ethers.getSigners();
  const whitelistContract = await ethers.getContract<WhitelistOracle>("WhitelistOracle", deployer.address);

  const oracleAddresses = [];
  let index = 0;

  try {
    while (true) {
      const oracle = await whitelistContract.oracles(index);
      oracleAddresses.push(oracle);
      index++;
    }
  } catch {
    // When we hit an out-of-bounds error, we've found all oracles
    console.log(`Found ${oracleAddresses.length} oracles`);
  }

  return oracleAddresses;
}

function getRandomPrice(basePrice: bigint): bigint {
  const percentageShifts = [1, 2, 5, 7, 10, 15, 20];
  const randomIndex = Math.floor(Math.random() * percentageShifts.length);
  const percentage = BigInt(percentageShifts[randomIndex]);

  const direction = Math.random() < 0.5 ? -1n : 1n;
  const offset = (basePrice * percentage * direction) / 100n;

  return basePrice + offset;
}

const runCycle = async (hre: HardhatRuntimeEnvironment, basePrice: bigint) => {
  try {
    const accounts = await hre.viem.getWalletClients();
    const simpleOracleFactory = await ethers.getContractFactory("SimpleOracle");
    const publicClient = await hre.viem.getPublicClient();

    await publicClient.transport.request({ method: "evm_setAutomine", params: [false] });
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`\n[Block ${blockNumber}] Starting new whitelist oracle cycle...`);
    const oracleAddresses = await getAllOracles();
    if (oracleAddresses.length === 0) {
      console.log("No oracles found");
      return;
    }

    for (const oracleAddress of oracleAddresses) {
      if (Math.random() < 0.4) {
        console.log(`Skipping oracle at ${oracleAddress}`);
        continue;
      }

      const randomPrice = getRandomPrice(basePrice);
      console.log(`Setting price for oracle at ${oracleAddress} to ${randomPrice}`);

      await accounts[0].writeContract({
        address: oracleAddress as `0x${string}`,
        abi: simpleOracleFactory.interface.fragments,
        functionName: "setPrice",
        args: [randomPrice],
      });
    }

    await publicClient.transport.request({ method: "evm_mine" });
    await publicClient.transport.request({ method: "evm_setAutomine", params: [true] });
  } catch (error) {
    console.error("Error in oracle cycle:", error);
    throw error;
  }
};

async function run() {
  console.log("Starting whitelist oracle bots...");
  const basePrice = await fetchPriceFromUniswap();

  while (true) {
    await runCycle(hre, basePrice);
    await sleep(4000);
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

// Handle process termination signals
process.on("SIGINT", async () => {
  console.log("\nReceived SIGINT (Ctrl+C). Cleaning up...");
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nReceived SIGTERM. Cleaning up...");
  await cleanup();
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", async error => {
  console.error("Uncaught Exception:", error);
  await cleanup();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  await cleanup();
  process.exit(1);
});
