import { formatEther } from "viem";
import { getPublicClient, getDeployerClient } from "./accounts.js";
import { getContract } from "./contractHelper.js";

// --- Config ---
const TARGET_PRICE = 1;
const PRICE_TOLERANCE = 0.000005;
const RATE_ADJUSTMENT_INTERVAL = 2000; // ms
const BORROW_RATE_MIN = 200; // 2%
const BORROW_RATE_MAX = 3000; // 30%
const SAVINGS_RATE_MIN = 200; // 2%
const PRICE_WINDOW = 10;
const RATE_CHANGE_DELAY = 10;
const PEG_HIT_THRESHOLD = 2;
const RATE_SPREAD = 100; // 1% spread between borrow and savings rate

// --- State ---
const priceHistory = [];
let iterationsSinceLastChange = 0;
let isInitialized = false;
let isGrowthMode = false;
let pegHits = 0;
let lastRateDirection = null;

function logChange(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function getPriceDirection() {
  if (priceHistory.length < PRICE_WINDOW) return "FLAT";
  const a = priceHistory[0];
  const b = priceHistory[priceHistory.length - 1];
  if (a < b) return "UP";
  if (a > b) return "DOWN";
  return "FLAT";
}

function priceDeviation(price) {
  return (price - 1) / 1;
}

function getNextRate(state, direction, isPriceStable) {
  const { absoluteBounds, searchBounds, lastRate } = state;

  if (isPriceStable) {
    return {
      newRate: lastRate,
      newState: {
        absoluteBounds,
        searchBounds: { low: absoluteBounds.min, high: absoluteBounds.max },
        lastRate,
      },
    };
  }

  // If bounds are too tight (less than 10 bps apart), reset with 100 bps margin
  if (searchBounds.high - searchBounds.low < 10) {
    const midPoint = Math.floor((searchBounds.low + searchBounds.high) / 2);
    const newLow = Math.max(midPoint - 50, absoluteBounds.min);
    const newHigh = Math.min(midPoint + 50, absoluteBounds.max);
    return {
      newRate: lastRate,
      newState: {
        absoluteBounds,
        searchBounds: { low: newLow, high: newHigh },
        lastRate,
      },
    };
  }

  if (direction === "UP" || direction === "FLAT") {
    // Price too high, need lower rate
    const newRate = Math.floor((searchBounds.low + lastRate) / 2);
    return {
      newRate,
      newState: {
        absoluteBounds,
        searchBounds: {
          low: searchBounds.low,
          high: Math.min(lastRate + 100, absoluteBounds.max),
        },
        lastRate: newRate,
      },
    };
  } else {
    // Price too low, need higher rate
    const newRate = Math.floor((lastRate + searchBounds.high) / 2);
    return {
      newRate,
      newState: {
        absoluteBounds,
        searchBounds: {
          low: Math.max(lastRate - 100, absoluteBounds.min),
          high: searchBounds.high,
        },
        lastRate: newRate,
      },
    };
  }
}

function checkPegHit(direction) {
  if (direction === "FLAT") return false;
  const isHit = lastRateDirection !== null && lastRateDirection !== direction;
  lastRateDirection = direction;
  return isHit;
}

async function main() {
  const publicClient = getPublicClient();
  const deployer = getDeployerClient();

  const dex = getContract("DEX");
  const rateController = getContract("RateController");
  const engine = getContract("MyUSDEngine");
  const staking = getContract("MyUSDStaking");
  const oracle = getContract("Oracle");

  const ethPrice = await publicClient.readContract({
    address: oracle.address,
    abi: oracle.abi,
    functionName: "getETHUSDPrice",
  });

  const startBorrowRate = await publicClient.readContract({
    address: engine.address,
    abi: engine.abi,
    functionName: "borrowRate",
  });

  const startSavingsRate = await publicClient.readContract({
    address: staking.address,
    abi: staking.abi,
    functionName: "savingsRate",
  });

  logChange("Interest Rate Controller started in TEMPERED mode");

  // Ensure savings rate is 0 initially
  if (startSavingsRate > 0n) {
    logChange("Setting savings rate to 0 for tempered mode");
    await deployer.writeContract({
      address: rateController.address,
      abi: rateController.abi,
      functionName: "setSavingsRate",
      args: [0n],
    });
  }

  // Initialize binary search states
  const borrowState = {
    absoluteBounds: { min: BORROW_RATE_MIN, max: BORROW_RATE_MAX },
    searchBounds: { low: BORROW_RATE_MIN, high: BORROW_RATE_MAX },
    lastRate: Number(startBorrowRate),
  };

  const savingsState = {
    absoluteBounds: { min: SAVINGS_RATE_MIN, max: Number(startBorrowRate) },
    searchBounds: { low: SAVINGS_RATE_MIN, high: Number(startBorrowRate) },
    lastRate: Number(startSavingsRate),
  };

  setInterval(async () => {
    try {
      // --- Get price ---
      const currentPriceRaw = await publicClient.readContract({
        address: dex.address,
        abi: dex.abi,
        functionName: "currentPrice",
      });

      const currentPriceEth =
        1 / (Number(formatEther(currentPriceRaw)) / Number(formatEther(ethPrice)));
      priceHistory.push(currentPriceEth);
      if (priceHistory.length > PRICE_WINDOW) priceHistory.shift();
      const deviation = priceDeviation(currentPriceEth);
      const direction = getPriceDirection();
      const isPriceStable = Math.abs(deviation) <= PRICE_TOLERANCE;

      // Initialize if not done yet
      if (!isInitialized) {
        if (priceHistory.length >= PRICE_WINDOW) {
          logChange("Initial price direction established");
          isInitialized = true;
        } else {
          logChange("Waiting for initial price data...");
          return;
        }
      }

      // --- Borrow rate logic ---
      const isMovingTowardsPeg =
        (TARGET_PRICE > currentPriceEth && direction === "UP") ||
        (TARGET_PRICE < currentPriceEth && direction === "DOWN");
      const shouldChangeRate =
        Math.abs(deviation) > PRICE_TOLERANCE &&
        !isMovingTowardsPeg &&
        iterationsSinceLastChange >= RATE_CHANGE_DELAY;

      // Activate growth mode after stable peg detection
      if (
        iterationsSinceLastChange > RATE_CHANGE_DELAY * 2 &&
        isPriceStable &&
        !isGrowthMode
      ) {
        isGrowthMode = true;
        logChange("Activating GROWTH mode after stable peg detection!");

        const initialSavingsRate = borrowState.lastRate - RATE_SPREAD;
        await deployer.writeContract({
          address: rateController.address,
          abi: rateController.abi,
          functionName: "setSavingsRate",
          args: [BigInt(initialSavingsRate)],
        });
        borrowState.searchBounds.low = initialSavingsRate;
      }

      if (shouldChangeRate) {
        // Check for peg crossed over
        if (!isGrowthMode && checkPegHit(direction)) {
          pegHits++;
          logChange(`Peg hit detected! (${pegHits}/${PEG_HIT_THRESHOLD})`);

          if (pegHits >= PEG_HIT_THRESHOLD) {
            isGrowthMode = true;
            logChange("Activating GROWTH mode after stable peg detection!");
            borrowState.searchBounds.low = BORROW_RATE_MIN;
          }
        }

        const { newRate, newState } = getNextRate(borrowState, direction, isPriceStable);
        logChange(
          `Price ${currentPriceEth.toFixed(6)} ${currentPriceEth > TARGET_PRICE ? "above" : "below"} peg, ` +
            `adjusting borrow rate to ${newRate}bps [${newState.searchBounds.low}, ${newState.searchBounds.high}]`,
        );
        await deployer.writeContract({
          address: rateController.address,
          abi: rateController.abi,
          functionName: "setBorrowRate",
          args: [BigInt(newRate)],
        });
        Object.assign(borrowState, newState);
        iterationsSinceLastChange = 0;

        // --- Savings rate logic (only in growth mode) ---
        if (isGrowthMode) {
          const maximumRate = Math.max(borrowState.lastRate - RATE_SPREAD, SAVINGS_RATE_MIN);
          Object.assign(savingsState.absoluteBounds, { max: maximumRate });
          Object.assign(savingsState.searchBounds, { high: maximumRate });

          const savingsResult = getNextRate(savingsState, direction, isPriceStable);
          const boundedRate = Math.min(
            Math.max(savingsResult.newRate, SAVINGS_RATE_MIN),
            maximumRate,
          );
          logChange(
            `Price ${currentPriceEth.toFixed(6)} ${currentPriceEth > TARGET_PRICE ? "above" : "below"} peg, ` +
              `adjusting savings rate to ${boundedRate}bps [${savingsResult.newState.searchBounds.low}, ${maximumRate}]`,
          );
          await deployer.writeContract({
            address: rateController.address,
            abi: rateController.abi,
            functionName: "setSavingsRate",
            args: [BigInt(boundedRate)],
          });
          Object.assign(savingsState, savingsResult.newState);
          borrowState.searchBounds.low = savingsState.lastRate;
        }
      } else {
        iterationsSinceLastChange++;
      }
    } catch (e) {
      logChange(`Error: ${e}`);
    }
  }, RATE_ADJUSTMENT_INTERVAL);

  process.stdin.resume();
}

main().catch((e) => {
  logChange(`Fatal error: ${e}`);
  process.exit(1);
});
