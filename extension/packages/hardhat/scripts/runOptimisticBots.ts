import { network } from "hardhat";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parseEther, zeroAddress } from "viem";
import { getRandomQuestion, sleep } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type ViemConnection = Awaited<ReturnType<typeof network.connect>>["viem"];
type WalletClient = Awaited<ReturnType<ViemConnection["getWalletClients"]>>[number];
type Deployment = { address: `0x${string}`; abi: any };
type OptimisticOracleReader = {
  nextAssertionId(): Promise<bigint>;
  assertions(id: bigint): Promise<{
    asserter: `0x${string}`;
    proposer: `0x${string}`;
    disputer: `0x${string}`;
    proposedOutcome: boolean;
    resolvedOutcome: boolean;
    reward: bigint;
    bond: bigint;
    startTime: bigint;
    endTime: bigint;
    claimed: boolean;
    winner: `0x${string}`;
    description: string;
  }>;
};

let _viem: ViemConnection;

function loadDeployment(name: string): Deployment {
  const path = join(__dirname, "..", "deployments", "default", `${name}.json`);
  const json = JSON.parse(readFileSync(path, "utf8"));
  return { address: json.address as `0x${string}`, abi: json.abi };
}

function makeOptimisticReader(deployment: Deployment): OptimisticOracleReader {
  return {
    async nextAssertionId() {
      const publicClient = await _viem.getPublicClient();
      const value = await publicClient.readContract({
        address: deployment.address,
        abi: deployment.abi,
        functionName: "nextAssertionId",
        args: [],
      });
      return BigInt(String(value));
    },
    async assertions(id: bigint) {
      const publicClient = await _viem.getPublicClient();
      const raw = (await publicClient.readContract({
        address: deployment.address,
        abi: deployment.abi,
        functionName: "getAssertion",
        args: [id],
      })) as any;
      return raw;
    },
  };
}

const isHalfTimePassed = (assertion: any, currentTimestamp: bigint) => {
  const startTime: bigint = assertion.startTime;
  const endTime: bigint = assertion.endTime;
  const halfTimePassed = (endTime - startTime) / 2n;
  return currentTimestamp > startTime && startTime + halfTimePassed < currentTimestamp;
};

const stopTrackingAssertion = (
  accountToAssertionIds: Record<string, bigint[]>,
  account: WalletClient,
  assertionId: bigint,
) => {
  accountToAssertionIds[account.account.address] = accountToAssertionIds[account.account.address].filter(
    id => id !== assertionId,
  );
};

const canPropose = (assertion: any, currentTimestamp: bigint) => {
  const rangeOfSeconds = [10n, 20n, 30n, 40n, 50n, 60n, 70n, 80n, 90n, 100n];
  const randomSeconds = rangeOfSeconds[Math.floor(Math.random() * rangeOfSeconds.length)];
  return assertion.proposer === zeroAddress && currentTimestamp > assertion.startTime + randomSeconds;
};

const createAssertions = async (
  optimisticDeployment: Deployment,
  optimisticOracle: OptimisticOracleReader,
  otherAccounts: WalletClient[],
  accountToAssertionIds: Record<string, bigint[]>,
) => {
  const minReward = parseEther("0.01");
  let nextAssertionId = await optimisticOracle.nextAssertionId();

  for (const account of otherAccounts) {
    const assertionIds = accountToAssertionIds[account.account.address];
    if (assertionIds.length === 0 && Math.random() < 0.5) {
      await account.writeContract({
        address: optimisticDeployment.address as `0x${string}`,
        abi: optimisticDeployment.abi,
        functionName: "assertEvent",
        args: [getRandomQuestion(), 0n, 0n],
        value: minReward + (1n * 10n ** 18n * BigInt(Math.floor(Math.random() * 100))) / 100n,
      });
      console.log(`✅ created assertion ${nextAssertionId}`);

      // Track the assertion for 80% of cases; otherwise, leave it untracked so it will expire
      if (Math.random() < 0.8) {
        accountToAssertionIds[account.account.address].push(nextAssertionId);
      }
      nextAssertionId++;
    }
  }
};

const proposeAssertions = async (
  trueResponder: WalletClient,
  falseResponder: WalletClient,
  randomResponder: WalletClient,
  optimisticDeployment: Deployment,
  optimisticOracle: OptimisticOracleReader,
  currentTimestamp: bigint,
  otherAccounts: WalletClient[],
  accountToAssertionIds: Record<string, bigint[]>,
) => {
  for (const account of otherAccounts) {
    const assertionIds = accountToAssertionIds[account.account.address];
    if (assertionIds.length !== 0) {
      for (const assertionId of assertionIds) {
        const assertion = await optimisticOracle.assertions(assertionId);
        if (canPropose(assertion, currentTimestamp)) {
          const randomness = Math.random();
          if (randomness < 0.25) {
            await trueResponder.writeContract({
              address: optimisticDeployment.address as `0x${string}`,
              abi: optimisticDeployment.abi,
              functionName: "proposeOutcome",
              args: [assertionId, true],
              value: assertion.bond,
            });
            console.log(`✅ proposed outcome=true for assertion ${assertionId}`);
          } else if (randomness < 0.5) {
            await falseResponder.writeContract({
              address: optimisticDeployment.address as `0x${string}`,
              abi: optimisticDeployment.abi,
              functionName: "proposeOutcome",
              args: [assertionId, false],
              value: assertion.bond,
            });
            console.log(`❌ proposed outcome=false for assertion ${assertionId} `);
          } else if (randomness < 0.9) {
            const outcome = Math.random() < 0.5;
            await randomResponder.writeContract({
              address: optimisticDeployment.address as `0x${string}`,
              abi: optimisticDeployment.abi,
              functionName: "proposeOutcome",
              args: [assertionId, outcome],
              value: assertion.bond,
            });
            console.log(`${outcome ? "✅" : "❌"} proposed outcome=${outcome} for assertion ${assertionId}`);
            // if randomly wallet proposed, then remove the assertion from the account (No need to track and dispute)
            stopTrackingAssertion(accountToAssertionIds, account, assertionId);
          }
        }
      }
    }
  }
};

const disputeAssertions = async (
  trueResponder: WalletClient,
  falseResponder: WalletClient,
  optimisticDeployment: Deployment,
  optimisticOracle: OptimisticOracleReader,
  currentTimestamp: bigint,
  accountToAssertionIds: Record<string, bigint[]>,
  otherAccounts: WalletClient[],
) => {
  for (const account of otherAccounts) {
    const assertionIds = accountToAssertionIds[account.account.address];
    for (const assertionId of assertionIds) {
      const assertion = await optimisticOracle.assertions(assertionId);
      if (
        assertion.proposer.toLowerCase() === trueResponder.account.address.toLowerCase() &&
        isHalfTimePassed(assertion, currentTimestamp)
      ) {
        await falseResponder.writeContract({
          address: optimisticDeployment.address as `0x${string}`,
          abi: optimisticDeployment.abi,
          functionName: "disputeOutcome",
          args: [assertionId],
          value: assertion.bond,
        });
        console.log(`⚔️ disputed assertion ${assertionId}`);
        // if disputed, then remove the assertion from the account
        stopTrackingAssertion(accountToAssertionIds, account, assertionId);
      } else if (
        assertion.proposer.toLowerCase() === falseResponder.account.address.toLowerCase() &&
        isHalfTimePassed(assertion, currentTimestamp)
      ) {
        await trueResponder.writeContract({
          address: optimisticDeployment.address as `0x${string}`,
          abi: optimisticDeployment.abi,
          functionName: "disputeOutcome",
          args: [assertionId],
          value: assertion.bond,
        });
        console.log(`⚔️ disputed assertion ${assertionId}`);
        // if disputed, then remove the assertion from the account
        stopTrackingAssertion(accountToAssertionIds, account, assertionId);
      }
    }
  }
};

let currentAction = 0;

const runCycle = async (accountToAssertionIds: Record<string, bigint[]>, accounts: WalletClient[]) => {
  try {
    const trueResponder = accounts[0];
    const falseResponder = accounts[1];
    const randomResponder = accounts[2];
    const otherAccounts = accounts.slice(3);

    const optimisticDeployment = loadDeployment("OptimisticOracle");
    const optimisticOracle = makeOptimisticReader(optimisticDeployment);
    const publicClient = await _viem.getPublicClient();

    // get current timestamp
    const latestBlock = await publicClient.getBlock();
    const currentTimestamp = latestBlock.timestamp;
    // also track thex of the account start from the third account
    if (currentAction === 0) {
      console.log(`\n📝 === CREATING ASSERTIONS PHASE ===`);
      await createAssertions(optimisticDeployment, optimisticOracle, otherAccounts, accountToAssertionIds);
    } else if (currentAction === 1) {
      console.log(`\n🎯 === PROPOSING OUTCOMES PHASE ===`);
      await proposeAssertions(
        trueResponder,
        falseResponder,
        randomResponder,
        optimisticDeployment,
        optimisticOracle,
        currentTimestamp,
        otherAccounts,
        accountToAssertionIds,
      );
    } else if (currentAction === 2) {
      console.log(`\n⚔️ === DISPUTING ASSERTIONS PHASE ===`);
      await disputeAssertions(
        trueResponder,
        falseResponder,
        optimisticDeployment,
        optimisticOracle,
        currentTimestamp,
        accountToAssertionIds,
        otherAccounts,
      );
    }
    currentAction = (currentAction + 1) % 3;
  } catch (error) {
    console.error("Error in oracle cycle:", error);
    throw error;
  }
};

async function run() {
  console.log("Starting optimistic oracle bots...");
  ({ viem: _viem } = await network.connect());
  const accountToAssertionIds: Record<string, bigint[]> = {};

  const accounts = (await _viem.getWalletClients()).slice(0, 8);
  for (const account of accounts) {
    accountToAssertionIds[account.account.address] = [];
  }
  while (true) {
    await runCycle(accountToAssertionIds, accounts);
    await sleep(3000);
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

// Handle process termination signals
process.on("SIGINT", async () => {
  console.log("\nReceived SIGINT (Ctrl+C). Cleaning up...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nReceived SIGTERM. Cleaning up...");
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", async error => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
