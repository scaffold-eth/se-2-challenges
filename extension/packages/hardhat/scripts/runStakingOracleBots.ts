import { reportPrices } from "./oracle-bot/reporting";
import { claimRewards, validateNodes } from "./oracle-bot/validation";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import hre from "hardhat";
import { cleanup, sleep } from "./utils";

const runCycle = async (hre: HardhatRuntimeEnvironment) => {
  try {
    const publicClient = await hre.viem.getPublicClient();
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`\n[Block ${blockNumber}] Starting new oracle cycle...`);

    await publicClient.transport.request({ method: "evm_setAutomine", params: [false] });
    await reportPrices(hre);
    await publicClient.transport.request({ method: "evm_mine" });

    await validateNodes(hre);
    await claimRewards(hre);
    await publicClient.transport.request({ method: "evm_mine" });
    await publicClient.transport.request({ method: "evm_setAutomine", params: [true] });
  } catch (error) {
    console.error("Error in oracle cycle:", error);
  }
};

const run = async () => {
  console.log("Starting oracle bot system...");
  while (true) {
    await runCycle(hre);
    await sleep(3000);
  }
};

run().catch(error => {
  console.error("Fatal error in oracle bot system:", error);
  process.exit(1);
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
