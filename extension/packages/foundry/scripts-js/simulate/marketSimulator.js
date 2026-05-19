import { parseEther, formatEther } from "viem";
import {
  getPublicClient,
  getDeployerClient,
  getBorrowerClients,
  getStakerClients,
  NUM_BORROWERS,
  NUM_STAKERS,
} from "./accounts.js";
import { getContract } from "./contractHelper.js";
import blessed from "blessed";
import contrib from "blessed-contrib";

// Configuration
const SIMULATION_INTERVAL_MS = 2000;
const UI_REFRESH_MS = 500;
const PRECISION = 10n ** 18n;

const publicClient = getPublicClient();
const deployer = getDeployerClient();

const engine = getContract("MyUSDEngine");
const myUSD = getContract("MyUSD");
const dex = getContract("DEX");
const oracle = getContract("Oracle");
const staking = getContract("MyUSDStaking");

// Build borrower/staker profiles from anvil accounts
const borrowerClients = getBorrowerClients();
const stakerClients = getStakerClients();

const borrowers = borrowerClients.map((client) => ({
  client,
  address: client.account.address,
  debtTolerance: 20 + Math.floor(Math.random() * 70),
  rateSensitivity: 25 + Math.floor(Math.random() * 75),
  maxAcceptableRate: 100 + Math.floor(Math.random() * 2100),
}));

const stakers = stakerClients.map((client) => ({
  client,
  address: client.account.address,
  yieldSensitivity: 25 + Math.floor(Math.random() * 75),
  minAcceptableRate: 200 + Math.floor(Math.random() * 800),
}));

// --- UI ---
let screen, grid, systemInfoBox, borrowersTable, stakersTable, activityLog;

function logActivity(message) {
  const timestamp = new Date().toLocaleTimeString();
  if (activityLog) {
    activityLog.log(`[${timestamp}] ${message}`);
    screen.render();
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

function initializeUI() {
  screen = blessed.screen({ smartCSR: true, title: "MyUSD Market Simulator" });
  screen.key(["escape", "q", "C-c"], () => process.exit(0));
  grid = new contrib.grid({ rows: 12, cols: 12, screen });

  systemInfoBox = grid.set(0, 0, 2, 12, blessed.box, {
    label: "System Status",
    tags: true,
    border: { type: "line" },
    style: { border: { fg: "blue" } },
  });

  borrowersTable = grid.set(2, 0, 4, 12, contrib.table, {
    label: "Borrowers",
    interactive: false,
    columnSpacing: 1,
    columnWidth: [14, 14, 14, 14, 40],
  });

  stakersTable = grid.set(6, 0, 4, 12, contrib.table, {
    label: "Stakers",
    interactive: false,
    columnSpacing: 1,
    columnWidth: [14, 14, 14, 14, 40],
  });

  activityLog = grid.set(10, 0, 2, 12, blessed.log, {
    label: "Activity Log",
    tags: true,
    scrollable: true,
    mouse: true,
    border: { type: "line" },
    scrollbar: { ch: " ", track: { bg: "cyan" }, style: { inverse: true } },
    style: { border: { fg: "green" } },
  });

  borrowersTable.setData({
    headers: ["Address", "Collateral", "Debt", "Max Rate", "Status"],
    data: [["Loading...", "...", "...", "...", "..."]],
  });
  stakersTable.setData({
    headers: ["Address", "MyUSD Bal", "Staked", "Min Rate", "Status"],
    data: [["Loading...", "...", "...", "...", "..."]],
  });

  logActivity("Market simulator started");
  screen.render();
}

// --- Status helpers ---

function getBorrowerStatus(borrower, currentDebt, collateralValue, currentBorrowRate) {
  if (currentBorrowRate > borrower.maxAcceptableRate) {
    return currentDebt > 0n ? "{yellow-fg}Rate too high, unwinding debt" : "{yellow-fg}Waiting for lower rate";
  }
  if (collateralValue <= 0n) return "{cyan-fg}Adding collateral";
  const maxPossibleDebt = (collateralValue * 2n) / 3n;
  if (currentDebt >= maxPossibleDebt) return "{red-fg}At max debt capacity";

  const rateFactor =
    1 -
    (Math.min(currentBorrowRate, borrower.maxAcceptableRate) / borrower.maxAcceptableRate) *
      (borrower.rateSensitivity / 100);
  const borrowingWillingness = (borrower.debtTolerance / 100) * rateFactor;
  const leverageRatio = collateralValue > 0n ? (Number(currentDebt) / Number(collateralValue)) * 100 : 0;

  if (borrowingWillingness > 0.7) {
    if (leverageRatio > 60) return "{magenta-fg}Leveraged to the max";
    if (leverageRatio > 40) return "{green-fg}Aggressively leveraging";
    return "{green-fg}Starting leverage cycle";
  }
  if (borrowingWillingness > 0.3) {
    return leverageRatio > 40 ? "{cyan-fg}Moderately leveraged" : "{green-fg}Modest leveraging";
  }
  return "{blue-fg}Cautious leveraging";
}

function getStakerStatus(staker, myUSDBalance, stakedShares, currentSavingsRate) {
  if (stakedShares > 0n) {
    if (currentSavingsRate < staker.minAcceptableRate) return "{yellow-fg}Rate too low, unstaking";
    const rateAppeal = Math.min(1, (currentSavingsRate - staker.minAcceptableRate) / 500);
    return rateAppeal > 0.5 ? "{green-fg}Staked, great yield" : "{cyan-fg}Staked, acceptable yield";
  }
  if (myUSDBalance > parseEther("0.5")) {
    if (currentSavingsRate >= staker.minAcceptableRate) {
      const rateAppeal = Math.min(1, (currentSavingsRate - staker.minAcceptableRate) / 500);
      const stakingWillingness = (staker.yieldSensitivity / 100) * rateAppeal;
      return stakingWillingness > 0.5 ? "{green-fg}Staking, good rate" : "{blue-fg}Considering staking";
    }
    return "{red-fg}Yield too low";
  }
  return currentSavingsRate >= staker.minAcceptableRate
    ? "{cyan-fg}Acquiring MyUSD"
    : "{gray-fg}Waiting for better rates";
}

// --- UI update ---

async function updateUI() {
  try {
    const ethToMyUSDPrice = await publicClient.readContract({
      ...dex,
      functionName: "currentPrice",
    });
    const ethPrice = await publicClient.readContract({
      ...oracle,
      functionName: "getETHUSDPrice",
    });
    const ethToMyUSDPriceNum = Number(formatEther(ethToMyUSDPrice));
    const ethPriceDecimal = Number(formatEther(ethPrice));
    const myUSDPriceInUSD = 1 / (ethToMyUSDPriceNum / ethPriceDecimal);

    const savingsRate = Number(
      await publicClient.readContract({ ...staking, functionName: "savingsRate" })
    );
    const borrowRate = Number(
      await publicClient.readContract({ ...engine, functionName: "borrowRate" })
    );
    const debtExchangeRate = await publicClient.readContract({
      ...engine,
      functionName: "debtExchangeRate",
    });
    const stakingExchangeRate = await publicClient.readContract({
      ...staking,
      functionName: "exchangeRate",
    });

    systemInfoBox.setContent(
      `MyUSD Price: {yellow-fg}${myUSDPriceInUSD.toFixed(6)}{/yellow-fg}  |  ` +
        `ETH Price: {cyan-fg}${ethToMyUSDPriceNum.toFixed(1)} MyUSD{/cyan-fg} | ` +
        `Savings Rate: {cyan-fg}${savingsRate > 0 ? savingsRate / 100 : 0}% {/cyan-fg}  |  ` +
        `Borrow Rate: {magenta-fg}${borrowRate > 0 ? borrowRate / 100 : 0}% {/magenta-fg}`
    );

    const borrowerRows = [];
    for (const b of borrowers) {
      const collateralAmount = await publicClient.readContract({
        ...engine,
        functionName: "s_userCollateral",
        args: [b.address],
      });
      const debtShares = await publicClient.readContract({
        ...engine,
        functionName: "s_userDebtShares",
        args: [b.address],
      });
      const debt = (debtShares * debtExchangeRate) / PRECISION;
      borrowerRows.push([
        b.address.slice(0, 6) + "...",
        Number(formatEther(collateralAmount).split(".")[0]).toLocaleString(),
        Number(formatEther(debt).split(".")[0]).toLocaleString(),
        (b.maxAcceptableRate / 100).toFixed(1) + "%",
        getBorrowerStatus(b, debt, collateralAmount, borrowRate),
      ]);
    }
    borrowersTable.setData({
      headers: ["Address", "Collateral", "Debt", "Max Rate", "Status"],
      data: borrowerRows,
    });

    const stakerRows = [];
    for (const s of stakers) {
      const myUSDBalance = await publicClient.readContract({
        ...myUSD,
        functionName: "balanceOf",
        args: [s.address],
      });
      const stakedShares = await publicClient.readContract({
        ...staking,
        functionName: "userShares",
        args: [s.address],
      });
      const stakedValue = (stakedShares * stakingExchangeRate) / PRECISION;
      stakerRows.push([
        s.address.slice(0, 6) + "...",
        Number(formatEther(myUSDBalance).split(".")[0]).toLocaleString(),
        Number(formatEther(stakedValue).split(".")[0]).toLocaleString(),
        (s.minAcceptableRate / 100).toFixed(1) + "%",
        getStakerStatus(s, myUSDBalance, stakedShares, savingsRate),
      ]);
    }
    stakersTable.setData({
      headers: ["Address", "MyUSD Bal", "Staked", "Min Rate", "Status"],
      data: stakerRows.length > 0 ? stakerRows : [["-", "-", "-", "-", "No stakers"]],
    });

    screen.render();
  } catch (error) {
    // silently ignore UI update errors
  }
}

// --- Account funding ---

const TARGET_ACCOUNT_BALANCE = parseEther("120");

async function capAccountBalances() {
  const allClients = [...borrowerClients, ...stakerClients];
  for (const client of allClients) {
    const balance = await publicClient.getBalance({ address: client.account.address });
    if (balance > TARGET_ACCOUNT_BALANCE) {
      const excess = balance - TARGET_ACCOUNT_BALANCE - parseEther("0.1");
      const hash = await client.sendTransaction({
        to: deployer.account.address,
        value: excess,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      logActivity(
        `Capped ${client.account.address.slice(0, 6)}... to 120 ETH (drained ${Math.round(Number(formatEther(excess)))} ETH)`
      );
    }
  }
}

async function fundAccountsIfNeeded() {
  const allClients = [...borrowerClients, ...stakerClients];
  for (let i = 0; i < allClients.length; i++) {
    const client = allClients[i];
    const balance = await publicClient.getBalance({ address: client.account.address });
    if (balance < parseEther("2")) {
      const randomEth = 30 + Math.random() * 100;
      const isStaker = i >= NUM_BORROWERS;
      const multiplier = isStaker ? 1.66 : 1;
      const hash = await deployer.sendTransaction({
        to: client.account.address,
        value: parseEther((randomEth * multiplier).toFixed(4)),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      logActivity(`Topped up ${client.account.address.slice(0, 6)}... with ${randomEth.toFixed(2)} ETH`);
    }
  }
}

// --- Borrower simulation ---

async function simulateBorrowing(currentBorrowRate) {
  for (const borrower of borrowers) {
    const collateralValue = await publicClient.readContract({
      ...engine,
      functionName: "calculateCollateralValue",
      args: [borrower.address],
    });
    const currentDebt = await publicClient.readContract({
      ...engine,
      functionName: "getCurrentDebtValue",
      args: [borrower.address],
    });

    const baseAmount = parseEther("100000");
    const riskMultiplier = (borrower.debtTolerance / 100) * (1 - borrower.rateSensitivity / 200);
    const amountToKeep = (baseAmount * BigInt(Math.floor(riskMultiplier * 100))) / 100n;

    // Rate too high — unwind debt
    if (currentDebt > amountToKeep && currentBorrowRate > borrower.maxAcceptableRate) {
      const myUSDBalance = await publicClient.readContract({
        ...myUSD,
        functionName: "balanceOf",
        args: [borrower.address],
      });

      if (myUSDBalance > parseEther("10")) {
        try {
          let amountToBurn = currentDebt - amountToKeep;
          if (amountToBurn < 0n) amountToBurn = 0n;
          if (amountToBurn > myUSDBalance) amountToBurn = myUSDBalance;

          let hash = await borrower.client.writeContract({
            ...myUSD,
            functionName: "approve",
            args: [engine.address, amountToBurn],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          hash = await borrower.client.writeContract({
            ...engine,
            functionName: "repayUpTo",
            args: [amountToBurn],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          logActivity(
            `Borrower ${borrower.address.slice(0, 6)}... repaid ${formatEther(amountToBurn).slice(0, 6)} MyUSD`
          );
        } catch {
          logActivity(`Failed to repay debt for ${borrower.address.slice(0, 6)}...`);
        }
        continue;
      } else {
        // Swap ETH for MyUSD to repay
        const ethBalance = await publicClient.getBalance({ address: borrower.address });
        const safeEthToSwap = ethBalance - parseEther("1");
        if (safeEthToSwap > 0n) {
          try {
            const hash = await borrower.client.writeContract({
              ...dex,
              functionName: "swap",
              args: [safeEthToSwap],
              value: safeEthToSwap,
            });
            await publicClient.waitForTransactionReceipt({ hash });
            logActivity(
              `Borrower ${borrower.address.slice(0, 6)}... swapped ${formatEther(safeEthToSwap).slice(0, 6)} ETH for MyUSD to repay`
            );
            continue;
          } catch {
            logActivity(`Failed to swap ETH for ${borrower.address.slice(0, 6)}...`);
          }
        }
      }
    }

    // Normal borrowing if rates acceptable
    if (currentBorrowRate <= borrower.maxAcceptableRate) {
      const rateFactor =
        1 -
        (Math.min(currentBorrowRate, borrower.maxAcceptableRate) / borrower.maxAcceptableRate) *
          (borrower.rateSensitivity / 100);
      const borrowingWillingness = (borrower.debtTolerance / 100) * rateFactor;

      if (collateralValue <= 0n) {
        const collateralToAdd = parseEther((1 + Math.random() * 5).toFixed(4));
        const balance = await publicClient.getBalance({ address: borrower.address });
        if (balance > collateralToAdd + parseEther("1")) {
          try {
            const hash = await borrower.client.writeContract({
              ...engine,
              functionName: "addCollateral",
              value: collateralToAdd,
            });
            await publicClient.waitForTransactionReceipt({ hash });
            logActivity(
              `Borrower ${borrower.address.slice(0, 6)}... added ${formatEther(collateralToAdd).slice(0, 6)} ETH as collateral`
            );
          } catch {
            logActivity(`Failed to add collateral for ${borrower.address.slice(0, 6)}...`);
          }
        }
        continue;
      }

      const maxPossibleDebt = (collateralValue * 2n) / 3n;
      if (currentDebt >= maxPossibleDebt) continue;

      const availableToBorrow = maxPossibleDebt - currentDebt;
      const borrowAmount = (availableToBorrow * BigInt(Math.floor(borrowingWillingness * 100))) / 100n;

      if (borrowAmount > parseEther("0.1")) {
        try {
          await executeLeveragedBorrowing(borrower, borrowAmount, borrowingWillingness, currentBorrowRate);
        } catch {
          logActivity(`Failed leveraged borrowing for ${borrower.address.slice(0, 6)}...`);
        }
      }
    }
  }
}

async function executeLeveragedBorrowing(borrower, borrowAmount, borrowingWillingness, currentBorrowRate) {
  // 1. Mint MyUSD
  let hash = await borrower.client.writeContract({
    ...engine,
    functionName: "mintMyUSD",
    args: [borrowAmount],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  // 2. Swap a portion of MyUSD for ETH
  let percentToSwapNum = 60 + borrower.debtTolerance * 0.3 - borrower.rateSensitivity * 0.2;
  percentToSwapNum = Math.max(10, Math.min(100, percentToSwapNum));
  const myUSDToSwap = (borrowAmount * BigInt(Math.round(percentToSwapNum))) / 100n;

  hash = await borrower.client.writeContract({
    ...myUSD,
    functionName: "approve",
    args: [dex.address, myUSDToSwap],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  hash = await borrower.client.writeContract({
    ...dex,
    functionName: "swap",
    args: [myUSDToSwap],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  // 3. Re-deposit ETH as collateral
  const ethBalance = await publicClient.getBalance({ address: borrower.address });
  const safetyMargin = parseEther("1");
  if (ethBalance > safetyMargin) {
    const ethToAdd = ((ethBalance - safetyMargin) * 90n) / 100n;
    if (ethToAdd > parseEther("0.05")) {
      hash = await borrower.client.writeContract({
        ...engine,
        functionName: "addCollateral",
        value: ethToAdd,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
  }

  logActivity(
    `Borrower ${borrower.address.slice(0, 6)}... leveraged ${formatEther(borrowAmount).slice(0, 6)} MyUSD ` +
      `(rate: ${currentBorrowRate} bps, willingness: ${(borrowingWillingness * 100).toFixed(1)}%)`
  );
}

// --- Staker simulation ---

async function simulateStaking(currentSavingsRate) {
  for (const staker of stakers) {
    const myUSDBalance = await publicClient.readContract({
      ...myUSD,
      functionName: "balanceOf",
      args: [staker.address],
    });
    const stakedShares = await publicClient.readContract({
      ...staking,
      functionName: "userShares",
      args: [staker.address],
    });

    // Unstake if rate too low
    if (stakedShares > 0n && currentSavingsRate < staker.minAcceptableRate) {
      try {
        let hash = await staker.client.writeContract({
          ...staking,
          functionName: "withdraw",
        });
        await publicClient.waitForTransactionReceipt({ hash });
        logActivity(
          `Staker ${staker.address.slice(0, 6)}... unstaked ALL (rate: ${currentSavingsRate} < min: ${staker.minAcceptableRate} bps)`
        );
      } catch {
        logActivity(`Failed to unstake for ${staker.address.slice(0, 6)}...`);
      }

      // Sell all MyUSD for ETH
      const sellableBalance = await publicClient.readContract({
        ...myUSD,
        functionName: "balanceOf",
        args: [staker.address],
      });
      if (sellableBalance > 0n) {
        try {
          let hash = await staker.client.writeContract({
            ...myUSD,
            functionName: "approve",
            args: [dex.address, sellableBalance],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          hash = await staker.client.writeContract({
            ...dex,
            functionName: "swap",
            args: [sellableBalance],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          logActivity(
            `Staker ${staker.address.slice(0, 6)}... sold ALL MyUSD (${formatEther(sellableBalance).slice(0, 6)}) for ETH`
          );
        } catch {
          logActivity(`Failed to sell MyUSD for ${staker.address.slice(0, 6)}...`);
        }
      }
      continue;
    }

    // Acquire MyUSD if needed
    const ethReserve = parseEther("0.1");
    if (myUSDBalance < ethReserve && currentSavingsRate >= staker.minAcceptableRate) {
      const ethBalance = await publicClient.getBalance({ address: staker.address });
      if (ethBalance > ethReserve) {
        try {
          const ethToSwap = ethBalance - ethReserve;
          const hash = await staker.client.writeContract({
            ...dex,
            functionName: "swap",
            args: [ethToSwap],
            value: ethToSwap,
          });
          await publicClient.waitForTransactionReceipt({ hash });
          logActivity(
            `Staker ${staker.address.slice(0, 6)}... swapped ${formatEther(ethToSwap).slice(0, 6)} ETH for MyUSD`
          );
        } catch {
          logActivity(`Failed to swap ETH for MyUSD for ${staker.address.slice(0, 6)}...`);
        }
        continue;
      }
    }

    // Stake if rate attractive
    if (currentSavingsRate >= staker.minAcceptableRate) {
      const rateDifference = currentSavingsRate - staker.minAcceptableRate;
      const rateAppeal = Math.min(1, rateDifference / 500);
      const stakingWillingness = (staker.yieldSensitivity / 100) * rateAppeal;
      const amountToStake = (myUSDBalance * BigInt(Math.floor(stakingWillingness * 100))) / 100n;

      if (amountToStake > 0n) {
        try {
          let hash = await staker.client.writeContract({
            ...myUSD,
            functionName: "approve",
            args: [staking.address, amountToStake],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          hash = await staker.client.writeContract({
            ...staking,
            functionName: "stake",
            args: [amountToStake],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          logActivity(
            `Staker ${staker.address.slice(0, 6)}... staked ${formatEther(amountToStake).slice(0, 6)} MyUSD ` +
              `(rate: ${currentSavingsRate} bps, willingness: ${(stakingWillingness * 100).toFixed(1)}%)`
          );
        } catch {
          logActivity(`Failed to stake for ${staker.address.slice(0, 6)}...`);
        }
      }
    }
  }
}

// --- Main ---

async function main() {
  initializeUI();
  logActivity("Initializing simulator...");
  logActivity(`Using ${NUM_BORROWERS} borrowers and ${NUM_STAKERS} stakers`);

  await capAccountBalances();
  await fundAccountsIfNeeded();
  logActivity("Accounts funded");

  // UI refresh timer
  setInterval(updateUI, UI_REFRESH_MS);

  // Market action timer
  setInterval(async () => {
    try {
      const latestBorrowRate = Number(
        await publicClient.readContract({ ...engine, functionName: "borrowRate" })
      );
      const latestSavingsRate = Number(
        await publicClient.readContract({ ...staking, functionName: "savingsRate" })
      );

      await fundAccountsIfNeeded();

      if (Math.random() < 0.5) {
        await simulateBorrowing(latestBorrowRate);
      }
      if (Math.random() < 0.5) {
        await simulateStaking(latestSavingsRate);
      }
    } catch (error) {
      logActivity(`Error in simulation: ${error}`);
    }
  }, SIMULATION_INTERVAL_MS);

  process.stdin.resume();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
