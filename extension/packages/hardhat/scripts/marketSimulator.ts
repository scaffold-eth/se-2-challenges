/* eslint-disable @typescript-eslint/no-unused-vars */
import { HDNodeWallet } from "ethers";
import hre from "hardhat";
import { DEX, MyUSDEngine, MyUSD, MyUSDStaking, Oracle } from "../typechain-types";
import * as blessed from "blessed";
import * as contrib from "blessed-contrib";
const ethers = hre.ethers;

// Account types and preferences
interface BorrowerProfile {
  type: "borrower";
  wallet: HDNodeWallet;
  debtTolerance: number; // 0-100, higher = willing to borrow more of their collateral value
  rateSensitivity: number; // 0-100, higher = more sensitive to high borrow rates
  maxAcceptableRate: number; // Basis points - will still borrow if rate below this
  initialEth: bigint;
}

interface StakerProfile {
  type: "staker";
  wallet: HDNodeWallet;
  yieldSensitivity: number; // 0-100, higher = more sensitive to staking yield
  minAcceptableRate: number; // Basis points - minimum acceptable savings rate
  initialEth: bigint;
}

type SimulatedAccount = BorrowerProfile | StakerProfile;

// Configuration
const NUM_BORROWERS = 5;
const NUM_STAKERS = 5;
const SIMULATION_INTERVAL_MS = 2000;
const UI_REFRESH_MS = 500;

// UI global variables
let screen: blessed.Widgets.Screen;
let grid: any;
let systemInfoBox: blessed.Widgets.BoxElement;
let borrowersTable: any;
let stakersTable: any;
let activityLog: blessed.Widgets.Log;

// Activity log with timestamp
function logActivity(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  if (activityLog) {
    activityLog.log(`[${timestamp}] ${message}`);
    screen.render();
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

// Initialize UI
function initializeUI() {
  // Create blessed screen
  screen = blessed.screen({
    smartCSR: true,
    title: "MyUSD Stablecoin Market Simulator",
  });

  // Help user exit
  screen.key(["escape", "q", "C-c"], function () {
    return process.exit(0);
  });

  // Create layout grid
  grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

  // System info box - full width, 2 rows
  systemInfoBox = grid.set(0, 0, 2, 12, blessed.box, {
    label: "System Status",
    tags: true,
    border: { type: "line" },
    style: {
      border: { fg: "blue" },
    },
  });

  // Borrowers table - full width, 3 rows
  borrowersTable = grid.set(2, 0, 4, 12, contrib.table, {
    label: "Borrowers",
    keys: true,
    vi: true,
    interactive: false,
    selectedFg: "white",
    selectedBg: "blue",
    columnSpacing: 1,
    columnWidth: [14, 14, 14, 14, 40],
  });

  // Stakers table - full width, 3 rows
  stakersTable = grid.set(6, 0, 4, 12, contrib.table, {
    label: "Stakers",
    keys: true,
    vi: true,
    interactive: false,
    selectedFg: "white",
    selectedBg: "blue",
    columnSpacing: 1,
    columnWidth: [14, 14, 14, 14, 40],
  });

  // Activity log - full width, 4 rows at the bottom
  activityLog = grid.set(10, 0, 2, 12, blessed.log, {
    label: "Activity Log",
    tags: true,
    scrollable: true,
    mouse: true,
    keys: true,
    vi: true,
    border: { type: "line" },
    scrollbar: {
      ch: " ",
      track: {
        bg: "cyan",
      },
      style: {
        inverse: true,
      },
    },
    style: {
      border: { fg: "green" },
    },
  });

  // Setup tables
  borrowersTable.setData({
    headers: ["Address", "Collateral", "Debt", "Max Rate", "Status"],
    data: [["Loading...", "...", "...", "...", "..."]],
  });

  stakersTable.setData({
    headers: ["Address", "MyUSD Bal", "Staked", "Min Rate", "Status"],
    data: [["Loading...", "...", "...", "...", "..."]],
  });

  // Initial render
  logActivity("Market simulator started");
  screen.render();
}

// Get borrower status description based on conditions
function getBorrowerStatus(
  borrower: BorrowerProfile,
  currentDebt: bigint,
  collateralValue: bigint,
  currentBorrowRate: number,
): string {
  // Check rate acceptability first
  if (currentBorrowRate > borrower.maxAcceptableRate) {
    if (currentDebt > 0n) {
      return "{yellow-fg}Rate too high, unwinding debt";
    } else {
      return "{yellow-fg}Waiting for lower rate";
    }
  }

  // If no collateral at all but rate is acceptable
  if (collateralValue <= 0n) {
    return "{cyan-fg}Adding collateral";
  }

  // Max debt check
  const maxPossibleDebt = (collateralValue * 2n) / 3n; // ~66% of collateral value
  if (currentDebt >= maxPossibleDebt) {
    return "{red-fg}At max debt capacity";
  }

  // Determine borrowing willingness
  const rateFactor =
    1 -
    (Math.min(currentBorrowRate, borrower.maxAcceptableRate) / borrower.maxAcceptableRate) *
      (borrower.rateSensitivity / 100);

  const borrowingWillingness = (borrower.debtTolerance / 100) * rateFactor;

  // Calculate leverage ratio (debt to collateral)
  const leverageRatio = collateralValue > 0n ? (Number(currentDebt) / Number(collateralValue)) * 100 : 0;

  if (borrowingWillingness > 0.7) {
    if (leverageRatio > 60) {
      return "{magenta-fg}Leveraged to the max";
    } else if (leverageRatio > 40) {
      return "{green-fg}Aggressively leveraging";
    } else {
      return "{green-fg}Starting leverage cycle";
    }
  } else if (borrowingWillingness > 0.3) {
    if (leverageRatio > 40) {
      return "{cyan-fg}Moderately leveraged";
    } else {
      return "{green-fg}Modest leveraging";
    }
  } else {
    return "{blue-fg}Cautious leveraging";
  }
}

// Get staker status description based on conditions
function getStakerStatus(
  staker: StakerProfile,
  myUSDBalance: bigint,
  stakedShares: bigint,
  currentSavingsRate: number,
): string {
  // Check if staker has any staked position
  if (stakedShares > 0n) {
    if (currentSavingsRate < staker.minAcceptableRate) {
      return "{yellow-fg}Rate too low, unstaking";
    } else {
      // If current rate exceeds minimum by a lot, it's very appealing
      const rateDifference = currentSavingsRate - staker.minAcceptableRate;
      const rateAppeal = Math.min(1, rateDifference / 500); // Cap at 1.0 for very high rates

      if (rateAppeal > 0.5) {
        return "{green-fg}Staked, great yield";
      } else {
        return "{cyan-fg}Staked, acceptable yield";
      }
    }
  }

  // No staked position
  if (myUSDBalance > ethers.parseEther("0.5")) {
    if (currentSavingsRate >= staker.minAcceptableRate) {
      // Positive rate difference means attractive staking opportunity
      const rateDifference = currentSavingsRate - staker.minAcceptableRate;
      const rateAppeal = Math.min(1, rateDifference / 500); // Cap at 1.0 for very high rates
      const stakingWillingness = (staker.yieldSensitivity / 100) * rateAppeal;

      if (stakingWillingness > 0.5) {
        return "{green-fg}Staking, good rate";
      } else {
        return "{blue-fg}Considering staking";
      }
    } else {
      return "{red-fg}Yield too low";
    }
  } else {
    if (currentSavingsRate >= staker.minAcceptableRate) {
      return "{cyan-fg}Acquiring MyUSD";
    } else {
      return "{gray-fg}Waiting for better rates";
    }
  }
}

// Update UI with latest data
async function updateUI(
  dex: DEX,
  ethPrice: bigint,
  engine: MyUSDEngine,
  myUSD: MyUSD,
  staking: MyUSDStaking,
  borrowers: BorrowerProfile[],
  stakers: StakerProfile[],
) {
  try {
    // Get price data
    const ethToMyUSDPrice = await dex.currentPrice();
    const ethToMyUSDPriceNum = Number(ethers.formatEther(ethToMyUSDPrice));
    const ethPriceDecimal = Number(ethers.formatEther(ethPrice));
    const myUSDPriceInUSD = 1 / (ethToMyUSDPriceNum / ethPriceDecimal);

    // Get common data needed by multiple sections
    const savingsRate = Number(await staking.savingsRate());
    const borrowRate = Number(await engine.borrowRate());
    const debtExchangeRate = await engine.debtExchangeRate();
    const stakingExchangeRate = await staking.exchangeRate();

    // Update system info
    try {
      systemInfoBox.setContent(
        `MyUSD Price: {yellow-fg}${myUSDPriceInUSD.toFixed(6)}{/yellow-fg}  |  ` +
          `ETH Price: {cyan-fg}${ethToMyUSDPriceNum.toFixed(1)} MyUSD{/cyan-fg} | ` +
          `Savings Rate: {cyan-fg}${savingsRate > 0 ? savingsRate / 100 : 0}% {/cyan-fg}  |  ` +
          `Borrow Rate: {magenta-fg}${borrowRate > 0 ? borrowRate / 100 : 0}% {/magenta-fg}`,
      );
    } catch (error: any) {
      console.log(`Error updating system info: ${error}`);
    }

    // Update borrowers table
    try {
      const borrowerRows: string[][] = [];
      for (const borrower of borrowers) {
        const collateralAmount = await engine.s_userCollateral(borrower.wallet.address);
        const debtShares = await engine.s_userDebtShares(borrower.wallet.address);
        const debt = (debtShares * debtExchangeRate) / BigInt(1e18);

        // Get status text based on borrower's position and market conditions
        const statusText = getBorrowerStatus(borrower, debt, collateralAmount, borrowRate);

        borrowerRows.push([
          borrower.wallet.address.slice(0, 6) + "...",
          Number(ethers.formatEther(collateralAmount).split(".")[0]).toLocaleString(),
          Number(ethers.formatEther(debt).split(".")[0]).toLocaleString(),
          (borrower.maxAcceptableRate / 100).toFixed(1) + "%",
          statusText,
        ]);
      }

      borrowersTable.setData({
        headers: ["Address", "Collateral", "Debt", "Max Rate", "Status"],
        data: borrowerRows,
      });
    } catch (error: any) {
      console.log(`Error updating borrowers table: ${error}`);
    }

    // Update stakers table
    try {
      const stakerRows: string[][] = [];
      for (const staker of stakers) {
        const myUSDBalance = await myUSD.balanceOf(staker.wallet.address);
        const stakedShares = await staking.userShares(staker.wallet.address);
        const stakedValue = (stakedShares * stakingExchangeRate) / BigInt(1e18);

        // Get status text based on staker's position and market conditions
        const statusText = getStakerStatus(staker, myUSDBalance, stakedShares, savingsRate);

        stakerRows.push([
          staker.wallet.address.slice(0, 6) + "...",
          Number(ethers.formatEther(myUSDBalance).split(".")[0]).toLocaleString(),
          Number(ethers.formatEther(stakedValue).split(".")[0]).toLocaleString(),
          (staker.minAcceptableRate / 100).toFixed(1) + "%",
          statusText,
        ]);
      }

      stakersTable.setData({
        headers: ["Address", "MyUSD Bal", "Staked", "Min Rate", "Status"],
        data: stakerRows.length > 0 ? stakerRows : [["-", "-", "-", "-", "No stakers"]],
      });
      stakersTable.show();
    } catch (error: any) {
      console.log(`Error updating stakers table: ${error}`);
    }

    // Render the screen
    screen.render();
  } catch (error: any) {
    console.log(`Error updating UI: ${error}`);
  }
}

// Account fund management
async function fundAccountsIfNeeded(accounts: SimulatedAccount[], deployer: any) {
  for (const account of accounts) {
    const currentBalance = await ethers.provider.getBalance(account.wallet.address);

    // Fund if balance drops below 2 ETH
    if (currentBalance < ethers.parseEther("2")) {
      // Random amount between 30-130 ETH
      const randomEth = 30 + Math.random() * 100;
      // Stakers receive more since they can't use leverage to have a compounded effect on the price.
      const multiplier = account.type === "staker" ? 1.66 : 1;
      const topUpAmount = ethers.parseEther((randomEth * multiplier).toString());

      const tx = await deployer.sendTransaction({
        to: account.wallet.address,
        value: topUpAmount,
      });
      await tx.wait();
      logActivity(`Topped up ${account.wallet.address.slice(0, 6)}... with ${randomEth.toFixed(2)} ETH`);
    }
  }
}

// Create accounts with different profiles
async function setupAccounts(): Promise<SimulatedAccount[]> {
  const accounts: SimulatedAccount[] = [];
  const initialEth = ethers.parseEther("120"); // 120 ETH each
  const [deployer] = await ethers.getSigners();

  // Create deterministic wallets using a base mnemonic
  const baseMnemonic = "test test test test test test test test test test test junk";

  // Create borrower accounts
  for (let i = 0; i < NUM_BORROWERS; i++) {
    const wallet = ethers.HDNodeWallet.fromPhrase(baseMnemonic, `m/44'/60'/0'/0/${i}`).connect(ethers.provider);

    // Create varied profiles
    accounts.push({
      type: "borrower",
      wallet,
      debtTolerance: 20 + Math.floor(Math.random() * 70), // 20-90%
      rateSensitivity: 25 + Math.floor(Math.random() * 75), // 25-100%
      maxAcceptableRate: 100 + Math.floor(Math.random() * 2100), // 100-2200 basis points
      initialEth,
    });
  }

  // Create staker accounts
  for (let i = 0; i < NUM_STAKERS; i++) {
    const wallet = ethers.HDNodeWallet.fromPhrase(baseMnemonic, `m/44'/60'/0'/0/${i + NUM_BORROWERS}`).connect(
      ethers.provider,
    );

    accounts.push({
      type: "staker",
      wallet,
      yieldSensitivity: 25 + Math.floor(Math.random() * 75), // 25-100%
      minAcceptableRate: 200 + Math.floor(Math.random() * 800), // 200-1000 basis points
      initialEth,
    });
  }

  // Do initial funding
  await fundAccountsIfNeeded(accounts, deployer);

  return accounts;
}

// Simulate borrower behavior
async function simulateBorrowing(
  engine: MyUSDEngine,
  myUSD: MyUSD,
  dex: DEX,
  borrowers: BorrowerProfile[],
  currentBorrowRate: number,
) {
  for (const borrower of borrowers) {
    const engineWithBorrower = engine.connect(borrower.wallet);
    const myUSDWithBorrower = myUSD.connect(borrower.wallet);

    // Get current debt and collateral
    const collateralValue = await engine.calculateCollateralValue(borrower.wallet.address);
    const currentDebt = await engine.getCurrentDebtValue(borrower.wallet.address);
    // Calculate fixed amount to keep based on borrower's profile
    const baseAmount = ethers.parseEther("100000"); // Base amount of 100000 MyUSD
    const riskMultiplier = (borrower.debtTolerance / 100) * (1 - borrower.rateSensitivity / 200);
    const amountToKeep = (baseAmount * BigInt(Math.floor(riskMultiplier * 100))) / 100n;
    // Check if borrower should pay down debt due to high rates
    if (currentDebt > amountToKeep && currentBorrowRate > borrower.maxAcceptableRate) {
      const myUSDBalance = await myUSD.balanceOf(borrower.wallet.address);

      if (myUSDBalance > ethers.parseEther("10")) {
        try {
          // Calculate amount to burn (current debt - amount to keep)
          let amountToBurn = currentDebt - amountToKeep;
          if (amountToBurn < 0n) amountToBurn = 0n;
          if (amountToBurn > myUSDBalance) {
            amountToBurn = myUSDBalance;
          }

          // Approve and burn debt
          await myUSDWithBorrower.approve(engine.target, amountToBurn);
          await engineWithBorrower.repayUpTo(amountToBurn);

          logActivity(
            `Borrower ${borrower.wallet.address.slice(0, 6)}... repaid ${ethers.formatEther(amountToBurn).slice(0, 6)} MyUSD ` +
              `(keeping ${ethers.formatEther(amountToKeep).slice(0, 6)} MyUSD)`,
          );
        } catch (error: any) {
          logActivity(`Failed to repay debt for ${borrower.wallet.address.slice(0, 6)}...`);
        }
        continue;
      } else {
        // If no MyUSD balance but rates are too high, try to get some by swapping ETH
        const ethBalance = await ethers.provider.getBalance(borrower.wallet.address);
        const safeEthToSwap = ethBalance - ethers.parseEther("1"); // Keep 1 ETH minimum

        if (safeEthToSwap > 0n) {
          try {
            // Swap ETH for MyUSD to repay
            const dexWithBorrower = dex.connect(borrower.wallet);
            await dexWithBorrower.swap(safeEthToSwap, { value: safeEthToSwap });

            logActivity(
              `Borrower ${borrower.wallet.address.slice(0, 6)}... swapped ${ethers.formatEther(safeEthToSwap).slice(0, 6)} ETH for MyUSD ` +
                `to repay debt (rate: ${currentBorrowRate} > ${borrower.maxAcceptableRate})`,
            );
            continue;
          } catch (error: any) {
            logActivity(`Failed to swap ETH for MyUSD for ${borrower.wallet.address.slice(0, 6)}...`);
          }
        }
      }
    }

    // Normal borrowing behavior if rates acceptable
    if (currentBorrowRate <= borrower.maxAcceptableRate) {
      // Calculate willingness based on rate sensitivity
      const rateFactor =
        1 -
        (Math.min(currentBorrowRate, borrower.maxAcceptableRate) / borrower.maxAcceptableRate) *
          (borrower.rateSensitivity / 100);

      // Higher tolerance + lower rate sensitivity = more borrowing
      const borrowingWillingness = (borrower.debtTolerance / 100) * rateFactor;

      if (collateralValue <= 0n) {
        // Add some collateral if none exists
        const collateralToAdd = ethers.parseEther((1 + Math.random() * 5).toString());
        const balance = await ethers.provider.getBalance(borrower.wallet.address);

        if (balance > collateralToAdd + ethers.parseEther("1")) {
          try {
            await engineWithBorrower.addCollateral({ value: collateralToAdd });
            logActivity(
              `Borrower ${borrower.wallet.address.slice(0, 6)}... added ${ethers.formatEther(collateralToAdd).slice(0, 6)} ETH as collateral`,
            );
          } catch (error: any) {
            logActivity(`Failed to add collateral for ${borrower.wallet.address.slice(0, 6)}...`);
          }
        }
        continue;
      }

      // Calculate max possible debt (based on 150% collateralization)
      const maxPossibleDebt = (collateralValue * 2n) / 3n; // ~66% of collateral value (150% collateralization)

      if (currentDebt >= maxPossibleDebt) {
        logActivity(`Borrower ${borrower.wallet.address.slice(0, 6)}... at max debt capacity`);
        continue;
      }

      // Calculate amount to borrow based on willingness
      const availableToBorrow = maxPossibleDebt - currentDebt;
      const borrowAmount = (availableToBorrow * BigInt(Math.floor(borrowingWillingness * 100))) / 100n;

      if (borrowAmount > 0n) {
        try {
          // Leveraged borrowing strategy - performs one leverage cycle each time
          await executeBorrowing(borrower, engine, myUSD, dex, borrowAmount, borrowingWillingness, currentBorrowRate);
        } catch (error: any) {
          logActivity(
            `Failed to execute leveraged borrowing for ${borrower.wallet.address.slice(0, 6)}... Error: ${error}`,
          );
        }
      }
    }
  }
}

// Execute single-cycle leveraged borrowing strategy
async function executeBorrowing(
  borrower: BorrowerProfile,
  engine: MyUSDEngine,
  myUSD: MyUSD,
  dex: DEX,
  borrowAmount: bigint,
  borrowingWillingness: number,
  currentBorrowRate: number,
) {
  const engineWithBorrower = engine.connect(borrower.wallet);
  const myUSDWithBorrower = myUSD.connect(borrower.wallet);
  const dexWithBorrower = dex.connect(borrower.wallet);

  // If remaining amount is too small, don't bother
  if (borrowAmount < ethers.parseEther("0.1")) {
    return;
  }

  try {
    // 1. Borrow MyUSD
    await engineWithBorrower.mintMyUSD(borrowAmount);

    // 2. Approve and swap MyUSD for ETH (percent based on risk appetite)
    let percentToSwapNum = 60 + borrower.debtTolerance * 0.3 - borrower.rateSensitivity * 0.2;
    percentToSwapNum = Math.max(10, Math.min(100, percentToSwapNum));
    const percentToSwap = BigInt(Math.round(percentToSwapNum));
    const myUSDToSwap = (borrowAmount * percentToSwap) / 100n;
    await myUSDWithBorrower.approve(dex.target, myUSDToSwap);
    const swapTx = await dexWithBorrower.swap(myUSDToSwap);
    await swapTx.wait();

    // 4. Add the ETH as collateral (use 90% of balance above 1 ETH safety margin)
    const ethBalance = await ethers.provider.getBalance(borrower.wallet.address);
    const safetyMargin = ethers.parseEther("1");

    if (ethBalance > safetyMargin) {
      const ethToAdd = ((ethBalance - safetyMargin) * 90n) / 100n; // Add 90% of available ETH

      if (ethToAdd > ethers.parseEther("0.05")) {
        // Only if it's a meaningful amount
        const addCollateralTx = await engineWithBorrower.addCollateral({ value: ethToAdd });
        await addCollateralTx.wait();
      }
    }

    logActivity(
      `Borrower ${borrower.wallet.address.slice(0, 6)}... leveraged borrowed ${ethers.formatEther(borrowAmount).slice(0, 6)} MyUSD ` +
        `(rate: ${currentBorrowRate} bps, willingness: ${(borrowingWillingness * 100).toFixed(1)}%)`,
    );
  } catch (error: any) {
    logActivity(`Leveraged borrowing failed for ${borrower.wallet.address.slice(0, 6)}... Error: ${error}`);
  }
}

// Simulate staker behavior
async function simulateStaking(
  dex: DEX,
  myUSD: MyUSD,
  staking: MyUSDStaking,
  stakers: StakerProfile[],
  currentSavingsRate: number,
) {
  for (const staker of stakers) {
    // Get current MyUSD balance and staked amount
    const myUSDBalance = await myUSD.balanceOf(staker.wallet.address);
    const stakedShares = await staking.userShares(staker.wallet.address);

    const stakingWithStaker = staking.connect(staker.wallet);
    const myUSDWithStaker = myUSD.connect(staker.wallet);
    const dexWithStaker = dex.connect(staker.wallet);

    // Determine if staker should unstake based on rate
    if (stakedShares > 0n && currentSavingsRate < staker.minAcceptableRate) {
      try {
        // Unstake ALL shares when rate is below minimum acceptable rate
        if (stakedShares > 0n) {
          // Unstake all shares
          await stakingWithStaker.withdraw();

          logActivity(
            `Staker ${staker.wallet.address.slice(0, 6)}... unstaked ALL shares ` +
              `(rate: ${currentSavingsRate} bps < min rate: ${staker.minAcceptableRate} bps)`,
          );
        }
      } catch (error: any) {
        logActivity(`Failed to unstake for ${staker.wallet.address.slice(0, 6)}...`);
      }

      // Sell ALL MyUSD for ETH if unstaked or have existing balance
      const sellableBalance = await myUSD.balanceOf(staker.wallet.address);

      if (sellableBalance > 0n) {
        try {
          // Swap ALL MyUSD for ETH when rate is below minimum
          if (sellableBalance > 0n) {
            // Approve and swap MyUSD for ETH
            await myUSDWithStaker.approve(dex.target, sellableBalance);
            await dexWithStaker.swap(sellableBalance);

            logActivity(
              `Staker ${staker.wallet.address.slice(0, 6)}... sold ALL MyUSD (${ethers.formatEther(sellableBalance).slice(0, 6)}) for ETH ` +
                `(rate too low: ${currentSavingsRate} < ${staker.minAcceptableRate} bps)`,
            );
          }
        } catch (error: any) {
          logActivity(`Failed to sell MyUSD for ${staker.wallet.address.slice(0, 6)}...: ${error}`);
        }
      }

      continue;
    }

    // Determine if staker should acquire MyUSD
    const ethReserve = ethers.parseEther("0.1"); // For gas
    if (myUSDBalance < ethReserve && currentSavingsRate >= staker.minAcceptableRate) {
      const ethBalance = await ethers.provider.getBalance(staker.wallet.address);
      if (ethBalance > ethReserve) {
        try {
          // Swap ETH for MyUSD
          const ethToSwap = ethBalance - ethReserve;
          await dexWithStaker.swap(ethToSwap, { value: ethToSwap });
          logActivity(
            `Staker ${staker.wallet.address.slice(0, 6)}... swapped ${ethers.formatEther(ethToSwap).slice(0, 6)} ETH for MyUSD`,
          );
        } catch (error: any) {
          logActivity(`Failed to swap ETH for MyUSD for ${staker.wallet.address.slice(0, 6)}...`);
        }
        continue;
      }
    }

    // Decide whether to stake based on current rate
    if (currentSavingsRate >= staker.minAcceptableRate) {
      // Calculate staking willingness based on rate and sensitivity
      // For higher rates, increase willingness proportionally
      const rateDifference = currentSavingsRate - staker.minAcceptableRate;
      const rateAppeal = Math.min(1, rateDifference / 500); // Cap at 1.0 for very high rates
      const stakingWillingness = (staker.yieldSensitivity / 100) * rateAppeal;

      // Calculate amount to stake
      const amountToStake = (myUSDBalance * BigInt(Math.floor(stakingWillingness * 100))) / 100n;

      if (amountToStake > 0n) {
        try {
          // Approve and stake
          await myUSDWithStaker.approve(staking.target, amountToStake);
          await stakingWithStaker.stake(amountToStake);
          logActivity(
            `Staker ${staker.wallet.address.slice(0, 6)}... staked ${ethers.formatEther(amountToStake).slice(0, 6)} MyUSD ` +
              `(rate: ${currentSavingsRate} bps, willingness: ${(stakingWillingness * 100).toFixed(1)}%)`,
          );
        } catch (error: any) {
          logActivity(`Failed to stake for ${staker.wallet.address.slice(0, 6)}...`);
        }
      }
    }
  }
}

// Main simulation function
async function simulateMarket(
  dex: DEX,
  ethPrice: bigint,
  engine: MyUSDEngine,
  myUSD: MyUSD,
  staking: MyUSDStaking,
  accounts: SimulatedAccount[],
  deployer: any,
) {
  logActivity("Starting market simulation...");

  // Separate accounts by type
  const borrowers = accounts.filter(a => a.type === "borrower") as BorrowerProfile[];
  const stakers = accounts.filter(a => a.type === "staker") as StakerProfile[];

  logActivity(`Initialized with ${borrowers.length} borrowers and ${stakers.length} stakers`);

  // Get current rates from contracts
  const currentSavingsRate = Number(await staking.savingsRate());
  const currentBorrowRate = Number(await engine.borrowRate());

  logActivity(`Initial rates - Savings: ${currentSavingsRate} bps, Borrow: ${currentBorrowRate} bps`);

  // Start UI update timer
  setInterval(() => updateUI(dex, ethPrice, engine, myUSD, staking, borrowers, stakers), UI_REFRESH_MS);

  // Run market actions on interval
  setInterval(async () => {
    try {
      // Get latest rates
      const latestSavingsRate = Number(await staking.savingsRate());
      const latestBorrowRate = Number(await engine.borrowRate());

      // Check and fund accounts if needed
      await fundAccountsIfNeeded(accounts, deployer);

      // Simulate borrower behavior (50% chance each cycle)
      if (Math.random() < 0.5) {
        await simulateBorrowing(engine, myUSD, dex, borrowers, latestBorrowRate);
      }

      // Simulate staker behavior (50% chance each cycle)
      if (Math.random() < 0.5) {
        await simulateStaking(dex, myUSD, staking, stakers, latestSavingsRate);
      }
    } catch (error: any) {
      logActivity(`Error in market simulation interval: ${error}`);
    }
  }, SIMULATION_INTERVAL_MS);
}

async function main() {
  try {
    // Initialize UI first
    initializeUI();
    logActivity("Initializing simulator...");

    const [deployer] = await ethers.getSigners();
    const dex = await ethers.getContract<DEX>("DEX", deployer);
    const oracle = await ethers.getContract<Oracle>("Oracle", deployer);
    const ethPrice = await oracle.getETHUSDPrice();
    const engine = await ethers.getContract<MyUSDEngine>("MyUSDEngine", deployer);
    const myUSD = await ethers.getContract<MyUSD>("MyUSD", deployer);
    const staking = await ethers.getContract<MyUSDStaking>("MyUSDStaking", deployer);

    logActivity("Connected to deployed contracts");
    const accounts = await setupAccounts();
    logActivity("Created simulated accounts");

    // Start the market simulation
    await simulateMarket(dex, ethPrice, engine, myUSD, staking, accounts, deployer);
  } catch (error: any) {
    logActivity(`Fatal error: ${error}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
