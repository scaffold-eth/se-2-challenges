import { HDNodeWallet, parseEther } from "ethers";
import hre from "hardhat";
import { CornDEX, Lending, Corn, MovePrice } from "../typechain-types";
const ethers = hre.ethers;

interface SimulatedAccount {
  wallet: HDNodeWallet;
  initialEth: bigint;
}

const NUM_ACCOUNTS = 5; // Number of simulated accounts
const CHANCE_TO_BORROW = 0.3; // 30% chance to borrow
const CHANCE_TO_ADD_COLLATERAL = 0.2; // 20% chance to add collateral

const liquidationInProgress = new Set<string>();

async function fundAccountsIfNeeded(accounts: SimulatedAccount[], deployer: any) {
  for (const account of accounts) {
    const currentBalance = await ethers.provider.getBalance(account.wallet.address);

    // Fund if balance drops below 2 ETH
    if (currentBalance < ethers.parseEther("2")) {
      // Random amount between 3-13 ETH
      const randomEth = 3 + Math.random() * 10;
      const topUpAmount = ethers.parseEther(randomEth.toString());

      const tx = await deployer.sendTransaction({
        to: account.wallet.address,
        value: topUpAmount,
      });
      await tx.wait();
      console.log(`Topped up ${account.wallet.address} with ${randomEth.toFixed(2)} ETH`);
    }
  }
}

async function setupAccounts(): Promise<SimulatedAccount[]> {
  console.log("Setting up simulated accounts...");

  const accounts: SimulatedAccount[] = [];
  const initialEth = ethers.parseEther("12"); // 12 ETH each
  const [deployer] = await ethers.getSigners();

  // Create deterministic wallets using a base mnemonic
  const baseMnemonic = "test test test test test test test test test test test junk";

  // Create 5 deterministic wallets
  for (let i = 0; i < NUM_ACCOUNTS; i++) {
    const wallet = ethers.HDNodeWallet.fromPhrase(baseMnemonic, `m/44'/60'/0'/0/${i}`).connect(ethers.provider);
    accounts.push({
      wallet,
      initialEth,
    });
  }

  // Do initial funding
  await fundAccountsIfNeeded(accounts, deployer);

  return accounts;
}

async function simulateMarketActions(
  movePrice: MovePrice,
  lending: Lending,
  corn: Corn,
  accounts: SimulatedAccount[],
  deployer: any,
) {
  console.log("Starting market simulation...");

  let trend = Math.random() > 0.5 ? 1 : -1;
  let trendDuration = 0;
  let maxTrendDuration = Math.floor(Math.random() * 8) + 7;

  // Run market actions every 2 seconds
  setInterval(async () => {
    try {
      // 1. Update price
      trendDuration++;
      if (trendDuration >= maxTrendDuration) {
        trend *= -1;
        trendDuration = 0;
        maxTrendDuration = Math.floor(Math.random() * 8) + 7;
        console.log(`Trend reversed to ${trend > 0 ? "upward" : "downward"}`);
      }

      const noise = Math.random() * 2.5 - 1.6;
      const direction = trend + noise;
      const amount = parseEther("24000");
      const amountToSell = direction > 0 ? amount : -amount * 1000n;

      await movePrice.movePrice(amountToSell);

      // 2. Check and fund accounts if needed
      await fundAccountsIfNeeded(accounts, deployer);

      // 3. Random borrowing (30% chance)
      if (Math.random() < CHANCE_TO_BORROW) {
        await simulateBorrowing(lending, accounts);
      }

      // 4. Random collateral addition (20% chance)
      if (Math.random() < CHANCE_TO_ADD_COLLATERAL) {
        await simulateAddCollateral(lending, accounts);
      }

      // 5. Check for and perform liquidations
      await checkAndPerformLiquidations(lending, corn, accounts);
    } catch (error) {
      console.error("Error in market simulation interval");
      if (process.env.DEBUG) {
        console.error(error);
      }
    }
  }, 2000); // 2 second interval
}

async function simulateBorrowing(lending: Lending, accounts: SimulatedAccount[]) {
  const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
  const lendingWithAccount = lending.connect(randomAccount.wallet);

  const collateralValue = await lending.calculateCollateralValue(randomAccount.wallet.address);
  if (collateralValue <= 0n) return;

  const aggressiveBorrower = Math.random() < CHANCE_TO_BORROW;

  // Calculate max borrow amount
  const percentage = aggressiveBorrower
    ? 85 + Math.random() * 14 // Aggressive: 85-99%
    : 30 + Math.random() * 40; // Conservative: 30-70%

  const maxBorrowAmount = (collateralValue * BigInt(Math.floor(percentage * 10))) / 1000n;

  if (maxBorrowAmount > 0n) {
    try {
      await lendingWithAccount.borrowCorn(maxBorrowAmount);
      console.log(
        `Account ${randomAccount.wallet.address} borrowed ${ethers.formatEther(maxBorrowAmount)} CORN ` +
          `(${aggressiveBorrower ? "aggressive" : "conservative"}, ` +
          `${((Number(maxBorrowAmount) * 100) / Number(collateralValue)).toFixed(1)}% of collateral)`,
      );
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(error);
      }
    }
  }
}

async function simulateAddCollateral(lending: Lending, accounts: SimulatedAccount[]) {
  const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
  const lendingWithAccount = lending.connect(randomAccount.wallet);

  const balance = await ethers.provider.getBalance(randomAccount.wallet.address);
  const currentCollateral = await lending.s_userCollateral(randomAccount.wallet.address);

  if (balance > ethers.parseEther("3")) {
    const maxPossible = balance - ethers.parseEther("2"); // Keep 2 ETH for operations
    const percentage = 20 + Math.random() * 60;
    const amountToAdd = (maxPossible * BigInt(Math.floor(percentage * 10))) / 1000n;

    if (amountToAdd > ethers.parseEther("0.1")) {
      try {
        const tx = await lendingWithAccount.addCollateral({ value: amountToAdd });
        await tx.wait();

        console.log(
          `Account ${randomAccount.wallet.address} added ${ethers.formatEther(amountToAdd)} ETH as collateral ` +
            `(${percentage.toFixed(1)}% of available balance, ` +
            `total collateral: ${ethers.formatEther(currentCollateral + amountToAdd)} ETH)`,
        );
      } catch (error) {
        if (process.env.DEBUG) {
          console.error(error);
        }
      }
    }
  }
}

async function checkAndPerformLiquidations(lending: Lending, corn: Corn, accounts: SimulatedAccount[]) {
  const cornDEX = await ethers.getContract<CornDEX>("CornDEX");

  const filter = lending.filters.CollateralAdded();
  const events = await lending.queryFilter(filter);
  const users = [...new Set(events.map(event => event.args[0]))];

  for (const user of users) {
    if (liquidationInProgress.has(user.toLowerCase())) continue;

    const amountBorrowed = await lending.s_userBorrowed(user);
    if (amountBorrowed === 0n) continue;

    const isLiquidatable = await lending.isLiquidatable(user);
    if (!isLiquidatable) continue;

    const eligibleLiquidators = accounts.filter(account => account.wallet.address.toLowerCase() !== user.toLowerCase());

    if (eligibleLiquidators.length === 0) {
      const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
      if (randomAccount.wallet.address.toLowerCase() !== user.toLowerCase()) {
        const cornDEXWithAccount = cornDEX.connect(randomAccount.wallet);

        const currentPrice = await cornDEX.currentPrice();
        const ethNeeded = (amountBorrowed * currentPrice * 110n) / (1000n * parseEther("1"));
        const balance = await ethers.provider.getBalance(randomAccount.wallet.address);
        const maxETHPossible = ethNeeded > balance ? balance - ethers.parseEther("0.1") : ethNeeded;
        if (maxETHPossible < ethers.parseEther("0.01")) continue;
        try {
          const swapTx = await cornDEXWithAccount.swap(maxETHPossible, {
            value: maxETHPossible,
          });
          await swapTx.wait();

          const newBalance = await corn.balanceOf(randomAccount.wallet.address);
          if (newBalance >= amountBorrowed) {
            liquidationInProgress.add(user.toLowerCase());
            console.log(
              `Account ${randomAccount.wallet.address} swapped ${ethers.formatEther(ethNeeded)} ETH for CORN`,
            );
          }
        } catch (error) {
          console.error(`Failed to swap ETH for CORN`);
          if (process.env.DEBUG) {
            console.error(error);
          }
        }
      }
    }

    const liquidator = eligibleLiquidators[Math.floor(Math.random() * eligibleLiquidators.length)];
    if (!liquidator) continue;

    liquidationInProgress.add(user.toLowerCase());
    console.log(`Account ${liquidator.wallet.address} found liquidatable position for user: ${user}`);

    const lendingWithLiquidator = lending.connect(liquidator.wallet);
    const cornWithLiquidator = corn.connect(liquidator.wallet);

    try {
      const approveTx = await cornWithLiquidator.approve(lending.target, amountBorrowed);
      await approveTx.wait();

      const tx = await lendingWithLiquidator.liquidate(user);
      await tx.wait();

      const balance = await ethers.provider.getBalance(user);
      const twoETH = parseEther("2");
      if (balance > twoETH) {
        await lendingWithLiquidator.addCollateral({ value: balance - twoETH });
      }

      console.log(`Successfully liquidated position for user ${user}`);
    } catch (error) {
      console.error(`Failed to liquidate user ${user}`);
      if (process.env.DEBUG) {
        console.error(error);
      }
    } finally {
      liquidationInProgress.delete(user.toLowerCase());
    }

    break;
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const movePriceContract = await ethers.getContract<MovePrice>("MovePrice", deployer);
  const lending = await ethers.getContract<Lending>("Lending", deployer);
  const corn = await ethers.getContract<Corn>("Corn", deployer);

  const accounts = await setupAccounts();

  // Start the combined market simulation
  await simulateMarketActions(movePriceContract, lending, corn, accounts, deployer);

  // Keep the script running
  process.stdin.resume();
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
