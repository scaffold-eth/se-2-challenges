import { network } from "hardhat";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fetchPriceFromUniswap } from "./fetchPriceFromUniswap.js";
import { sleep } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type ViemConnection = Awaited<ReturnType<typeof network.connect>>["viem"];

function loadDeployment(name: string): { address: `0x${string}`; abi: any } {
  const path = join(__dirname, "..", "deployments", "default", `${name}.json`);
  const json = JSON.parse(readFileSync(path, "utf8"));
  return { address: json.address as `0x${string}`, abi: json.abi };
}

const simpleOracleAbi = [
  {
    type: "function",
    name: "setPrice",
    stateMutability: "nonpayable",
    inputs: [{ name: "_newPrice", type: "uint256" }],
    outputs: [],
  },
] as const;

async function getAllOracles(viem: ViemConnection): Promise<`0x${string}`[]> {
  const publicClient = await viem.getPublicClient();
  const whitelist = loadDeployment("WhitelistOracle");

  const oracleAddresses: `0x${string}`[] = [];
  // The public oracles(uint256) getter reverts once index passes the end of the array, ending the loop.
  let index = 0n;
  try {
    while (true) {
      const oracle = (await publicClient.readContract({
        address: whitelist.address,
        abi: whitelist.abi,
        functionName: "oracles",
        args: [index],
      })) as `0x${string}`;
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

const runCycle = async (viem: ViemConnection, basePrice: bigint) => {
  try {
    const publicClient = await viem.getPublicClient();
    const [walletClient] = await viem.getWalletClients();

    const blockNumber = await publicClient.getBlockNumber();
    console.log(`\n[Block ${blockNumber}] Starting new whitelist oracle cycle...`);
    const oracleAddresses = await getAllOracles(viem);
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

      const hash = await walletClient.writeContract({
        address: oracleAddress,
        abi: simpleOracleAbi,
        functionName: "setPrice",
        args: [randomPrice],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
  } catch (error) {
    console.error("Error in oracle cycle:", error);
    throw error;
  }
};

async function run() {
  console.log("Starting whitelist oracle bots...");
  const { viem } = await network.connect();
  const basePrice = await fetchPriceFromUniswap();

  while (true) {
    await runCycle(viem, basePrice);
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
