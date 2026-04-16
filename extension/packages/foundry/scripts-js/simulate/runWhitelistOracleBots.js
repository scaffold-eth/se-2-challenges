import { getPublicClient, getWalletClients } from "./accounts.js";
import { getContract } from "./contractHelper.js";
import { sleep } from "./utils.js";
import { fetchPriceFromUniswap } from "./fetchPriceFromUniswap.js";

const simpleOracleAbi = [
  {
    type: "function",
    name: "setPrice",
    stateMutability: "nonpayable",
    inputs: [{ name: "_newPrice", type: "uint256" }],
    outputs: [],
  },
];

async function getAllOracles() {
  const { address, abi } = getContract("WhitelistOracle");
  const publicClient = getPublicClient();
  const oracleAddresses = [];
  let index = 0;

  try {
    while (true) {
      const oracle = await publicClient.readContract({
        address,
        abi,
        functionName: "oracles",
        args: [BigInt(index)],
      });
      oracleAddresses.push(oracle);
      index++;
    }
  } catch {
    console.log(`Found ${oracleAddresses.length} oracles`);
  }

  return oracleAddresses;
}

function getRandomPrice(basePrice) {
  const percentageShifts = [1, 2, 5, 7, 10, 15, 20];
  const randomIndex = Math.floor(Math.random() * percentageShifts.length);
  const percentage = BigInt(percentageShifts[randomIndex]);
  const direction = Math.random() < 0.5 ? -1n : 1n;
  const offset = (basePrice * percentage * direction) / 100n;
  return basePrice + offset;
}

const runCycle = async (basePrice) => {
  try {
    const walletClients = getWalletClients();
    const publicClient = getPublicClient();
    const blockNumber = await publicClient.getBlockNumber();
    console.log(
      `\n[Block ${blockNumber}] Starting new whitelist oracle cycle...`
    );

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
      console.log(
        `Setting price for oracle at ${oracleAddress} to ${randomPrice}`
      );

      await walletClients[0].writeContract({
        address: oracleAddress,
        abi: simpleOracleAbi,
        functionName: "setPrice",
        args: [randomPrice],
      });
    }
  } catch (error) {
    console.error("Error in oracle cycle:", error);
    throw error;
  }
};

async function run() {
  console.log("Starting whitelist oracle bots...");
  const basePrice = await fetchPriceFromUniswap();

  while (true) {
    await runCycle(basePrice);
    await sleep(4000);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

process.on("SIGINT", () => {
  console.log("\nReceived SIGINT (Ctrl+C). Cleaning up...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM. Cleaning up...");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
