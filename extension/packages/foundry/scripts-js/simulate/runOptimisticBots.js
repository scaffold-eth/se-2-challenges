import { zeroAddress, parseEther } from "viem";
import { getPublicClient, getWalletClients } from "./accounts.js";
import { getContract } from "./contractHelper.js";
import { getRandomQuestion, sleep } from "./utils.js";

const isHalfTimePassed = (assertion, currentTimestamp) => {
  const startTime = assertion.startTime;
  const endTime = assertion.endTime;
  const halfTimePassed = (endTime - startTime) / 2n;
  return (
    currentTimestamp > startTime &&
    startTime + halfTimePassed < currentTimestamp
  );
};

const stopTrackingAssertion = (
  accountToAssertionIds,
  accountAddress,
  assertionId
) => {
  accountToAssertionIds[accountAddress] = accountToAssertionIds[
    accountAddress
  ].filter((id) => id !== assertionId);
};

const canPropose = (assertion, currentTimestamp) => {
  const rangeOfSeconds = [10n, 20n, 30n, 40n, 50n, 60n, 70n, 80n, 90n, 100n];
  const randomSeconds =
    rangeOfSeconds[Math.floor(Math.random() * rangeOfSeconds.length)];
  return (
    assertion.proposer === zeroAddress &&
    currentTimestamp > assertion.startTime + randomSeconds &&
    currentTimestamp < assertion.endTime
  );
};

const readAssertion = async (publicClient, address, abi, assertionId) => {
  return publicClient.readContract({
    address,
    abi,
    functionName: "getAssertion",
    args: [assertionId],
  });
};

const createAssertions = async (
  address,
  abi,
  publicClient,
  otherAccounts,
  accountToAssertionIds
) => {
  const minReward = parseEther("0.01");
  let nextAssertionId = await publicClient.readContract({
    address,
    abi,
    functionName: "nextAssertionId",
    args: [],
  });

  for (const account of otherAccounts) {
    const accountAddr = account.account.address;
    const assertionIds = accountToAssertionIds[accountAddr];
    if (assertionIds.length === 0 && Math.random() < 0.5) {
      await account.writeContract({
        address,
        abi,
        functionName: "assertEvent",
        args: [getRandomQuestion(), 0n, 0n],
        value:
          minReward +
          (1n * 10n ** 18n * BigInt(Math.floor(Math.random() * 100))) / 100n,
      });
      console.log(`Created assertion ${nextAssertionId}`);

      if (Math.random() < 0.8) {
        accountToAssertionIds[accountAddr].push(nextAssertionId);
      }
      nextAssertionId++;
    }
  }
};

const proposeAssertions = async (
  trueResponder,
  falseResponder,
  randomResponder,
  address,
  abi,
  publicClient,
  currentTimestamp,
  otherAccounts,
  accountToAssertionIds
) => {
  for (const account of otherAccounts) {
    const accountAddr = account.account.address;
    const assertionIds = [...(accountToAssertionIds[accountAddr] || [])];
    for (const assertionId of assertionIds) {
      const assertion = await readAssertion(
        publicClient,
        address,
        abi,
        assertionId
      );
      // Drop expired assertions
      if (currentTimestamp >= assertion.endTime) {
        stopTrackingAssertion(accountToAssertionIds, accountAddr, assertionId);
        continue;
      }
      if (canPropose(assertion, currentTimestamp)) {
        const randomness = Math.random();
        if (randomness < 0.25) {
          await trueResponder.writeContract({
            address,
            abi,
            functionName: "proposeOutcome",
            args: [assertionId, true],
            value: assertion.bond,
          });
          console.log(
            `Proposed outcome=true for assertion ${assertionId}`
          );
        } else if (randomness < 0.5) {
          await falseResponder.writeContract({
            address,
            abi,
            functionName: "proposeOutcome",
            args: [assertionId, false],
            value: assertion.bond,
          });
          console.log(
            `Proposed outcome=false for assertion ${assertionId}`
          );
        } else if (randomness < 0.9) {
          const outcome = Math.random() < 0.5;
          await randomResponder.writeContract({
            address,
            abi,
            functionName: "proposeOutcome",
            args: [assertionId, outcome],
            value: assertion.bond,
          });
          console.log(
            `Proposed outcome=${outcome} for assertion ${assertionId}`
          );
          stopTrackingAssertion(
            accountToAssertionIds,
            accountAddr,
            assertionId
          );
        }
      }
    }
  }
};

const disputeAssertions = async (
  trueResponder,
  falseResponder,
  address,
  abi,
  publicClient,
  currentTimestamp,
  accountToAssertionIds,
  otherAccounts
) => {
  for (const account of otherAccounts) {
    const accountAddr = account.account.address;
    const assertionIds = [...(accountToAssertionIds[accountAddr] || [])];
    for (const assertionId of assertionIds) {
      const assertion = await readAssertion(
        publicClient,
        address,
        abi,
        assertionId
      );
      // Skip if not yet proposed or already disputed
      if (assertion.proposer === zeroAddress || assertion.disputer !== zeroAddress) {
        continue;
      }
      if (
        assertion.proposer.toLowerCase() ===
          trueResponder.account.address.toLowerCase() &&
        isHalfTimePassed(assertion, currentTimestamp)
      ) {
        await falseResponder.writeContract({
          address,
          abi,
          functionName: "disputeOutcome",
          args: [assertionId],
          value: assertion.bond,
        });
        console.log(`Disputed assertion ${assertionId}`);
        stopTrackingAssertion(
          accountToAssertionIds,
          accountAddr,
          assertionId
        );
      } else if (
        assertion.proposer.toLowerCase() ===
          falseResponder.account.address.toLowerCase() &&
        isHalfTimePassed(assertion, currentTimestamp)
      ) {
        await trueResponder.writeContract({
          address,
          abi,
          functionName: "disputeOutcome",
          args: [assertionId],
          value: assertion.bond,
        });
        console.log(`Disputed assertion ${assertionId}`);
        stopTrackingAssertion(
          accountToAssertionIds,
          accountAddr,
          assertionId
        );
      }
    }
  }
};

let currentAction = 0;

const runCycle = async (accountToAssertionIds, accounts) => {
  try {
    const trueResponder = accounts[0];
    const falseResponder = accounts[1];
    const randomResponder = accounts[2];
    const otherAccounts = accounts.slice(3);

    const { address, abi } = getContract("OptimisticOracle");
    const publicClient = getPublicClient();

    const latestBlock = await publicClient.getBlock();
    const currentTimestamp = latestBlock.timestamp;

    if (currentAction === 0) {
      console.log(`\n=== CREATING ASSERTIONS PHASE ===`);
      await createAssertions(
        address,
        abi,
        publicClient,
        otherAccounts,
        accountToAssertionIds
      );
    } else if (currentAction === 1) {
      console.log(`\n=== PROPOSING OUTCOMES PHASE ===`);
      await proposeAssertions(
        trueResponder,
        falseResponder,
        randomResponder,
        address,
        abi,
        publicClient,
        currentTimestamp,
        otherAccounts,
        accountToAssertionIds
      );
    } else if (currentAction === 2) {
      console.log(`\n=== DISPUTING ASSERTIONS PHASE ===`);
      await disputeAssertions(
        trueResponder,
        falseResponder,
        address,
        abi,
        publicClient,
        currentTimestamp,
        accountToAssertionIds,
        otherAccounts
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
  const accountToAssertionIds = {};

  const accounts = getWalletClients().slice(0, 8);
  for (const account of accounts) {
    accountToAssertionIds[account.account.address] = [];
  }
  while (true) {
    await runCycle(accountToAssertionIds, accounts);
    await sleep(3000);
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
