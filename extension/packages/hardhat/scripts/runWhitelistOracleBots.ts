import { network } from "hardhat";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fetchPriceFromUniswap } from "./fetchPriceFromUniswap.js";
import { sleep } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadDeploymentAddress(name: string): string {
  const path = join(__dirname, "..", "deployments", "default", `${name}.json`);
  return JSON.parse(readFileSync(path, "utf8")).address as string;
}

async function getAllOracles(ethers: Awaited<ReturnType<typeof network.connect>>["ethers"]) {
  const whitelistAddress = loadDeploymentAddress("WhitelistOracle");
  const whitelistContract = await ethers.getContractAt("WhitelistOracle", whitelistAddress);

  const oracleAddresses: string[] = [];
  let index = 0;
  try {
    while (true) {
      const oracle: string = await whitelistContract.oracles(index);
      oracleAddresses.push(oracle);
      index++;
    }
  } catch {
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

const runCycle = async (ethers: Awaited<ReturnType<typeof network.connect>>["ethers"], basePrice: bigint) => {
  try {
    const [deployer] = await ethers.getSigners();

    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`\n[Block ${blockNumber}] Starting new whitelist oracle cycle...`);
    const oracleAddresses = await getAllOracles(ethers);
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

      const simpleOracle = await ethers.getContractAt("SimpleOracle", oracleAddress, deployer);
      const tx = await simpleOracle.setPrice(randomPrice);
      await tx.wait();
    }
  } catch (error) {
    console.error("Error in oracle cycle:", error);
    throw error;
  }
};

async function run() {
  console.log("Starting whitelist oracle bots...");
  const { ethers } = await network.connect();
  const basePrice = await fetchPriceFromUniswap();

  while (true) {
    await runCycle(ethers, basePrice);
    await sleep(4000);
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

process.on("SIGINT", async () => {
  console.log("\nReceived SIGINT (Ctrl+C). Cleaning up...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nReceived SIGTERM. Cleaning up...");
  process.exit(0);
});

process.on("uncaughtException", async error => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
