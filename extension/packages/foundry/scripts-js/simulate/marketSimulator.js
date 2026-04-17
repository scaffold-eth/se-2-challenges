import { parseEther, formatEther } from "viem";
import {
  getPublicClient,
  getWalletClients,
  getDeployerClient,
  DEPLOYER_INDEX,
} from "./accounts.js";
import { getContract } from "./contractHelper.js";

const NUM_ACCOUNTS = 5;
const CHANCE_TO_BORROW = 0.3;
const CHANCE_TO_ADD_COLLATERAL = 0.2;

const liquidationInProgress = new Set();

const publicClient = getPublicClient();
const walletClients = getWalletClients();
const deployer = getDeployerClient();

// Use anvil accounts 0-4 as bot accounts (deployer is account 9)
const botClients = walletClients.slice(0, NUM_ACCOUNTS);

const lending = getContract("Lending");
const corn = getContract("Corn");
const cornDEX = getContract("CornDEX");
const movePrice = getContract("MovePrice");

async function fundAccountsIfNeeded() {
  for (const client of botClients) {
    const balance = await publicClient.getBalance({
      address: client.account.address,
    });
    if (balance < parseEther("2")) {
      const randomEth = 3 + Math.random() * 10;
      const hash = await deployer.sendTransaction({
        to: client.account.address,
        value: parseEther(randomEth.toFixed(4)),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(
        `Topped up ${client.account.address} with ${randomEth.toFixed(2)} ETH`
      );
    }
  }
}

async function simulateBorrowing() {
  const client = botClients[Math.floor(Math.random() * botClients.length)];

  const collateralValue = await publicClient.readContract({
    address: lending.address,
    abi: lending.abi,
    functionName: "calculateCollateralValue",
    args: [client.account.address],
  });
  if (collateralValue <= 0n) return;

  const aggressive = Math.random() < CHANCE_TO_BORROW;
  const percentage = aggressive
    ? 85 + Math.random() * 14
    : 30 + Math.random() * 40;

  const maxBorrowAmount =
    (collateralValue * BigInt(Math.floor(percentage * 10))) / 1000n;
  if (maxBorrowAmount <= 0n) return;

  try {
    const hash = await client.writeContract({
      address: lending.address,
      abi: lending.abi,
      functionName: "borrowCorn",
      args: [maxBorrowAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(
      `${client.account.address} borrowed ${formatEther(maxBorrowAmount)} CORN (${aggressive ? "aggressive" : "conservative"}, ${((Number(maxBorrowAmount) * 100) / Number(collateralValue)).toFixed(1)}% of collateral)`
    );
  } catch {
    // position would be unsafe, skip
  }
}

async function simulateAddCollateral() {
  const client = botClients[Math.floor(Math.random() * botClients.length)];

  const balance = await publicClient.getBalance({
    address: client.account.address,
  });

  if (balance > parseEther("3")) {
    const maxPossible = balance - parseEther("2");
    const percentage = 20 + Math.random() * 60;
    const amountToAdd =
      (maxPossible * BigInt(Math.floor(percentage * 10))) / 1000n;

    if (amountToAdd > parseEther("0.1")) {
      try {
        const hash = await client.writeContract({
          address: lending.address,
          abi: lending.abi,
          functionName: "addCollateral",
          value: amountToAdd,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        console.log(
          `${client.account.address} added ${formatEther(amountToAdd)} ETH as collateral`
        );
      } catch {
        // skip
      }
    }
  }
}

async function checkAndPerformLiquidations() {
  // Get all users who have added collateral via events
  const logs = await publicClient.getLogs({
    address: lending.address,
    event: {
      type: "event",
      name: "CollateralAdded",
      inputs: [
        { name: "user", type: "address", indexed: true },
        { name: "amount", type: "uint256", indexed: true },
        { name: "price", type: "uint256", indexed: false },
      ],
    },
    fromBlock: lending.deployedBlock,
  });

  const users = [...new Set(logs.map((log) => log.args.user))];

  for (const user of users) {
    if (liquidationInProgress.has(user.toLowerCase())) continue;

    const amountBorrowed = await publicClient.readContract({
      address: lending.address,
      abi: lending.abi,
      functionName: "s_userBorrowed",
      args: [user],
    });
    if (amountBorrowed === 0n) continue;

    const isLiquidatable = await publicClient.readContract({
      address: lending.address,
      abi: lending.abi,
      functionName: "isLiquidatable",
      args: [user],
    });
    if (!isLiquidatable) continue;

    // Find a liquidator that isn't the user being liquidated
    const liquidators = botClients.filter(
      (c) => c.account.address.toLowerCase() !== user.toLowerCase()
    );

    // Check which liquidators have enough CORN
    let liquidator = null;
    for (const candidate of liquidators) {
      const cornBalance = await publicClient.readContract({
        address: corn.address,
        abi: corn.abi,
        functionName: "balanceOf",
        args: [candidate.account.address],
      });
      if (cornBalance >= amountBorrowed) {
        liquidator = candidate;
        break;
      }
    }

    // If no one has enough CORN, try to swap ETH for CORN
    if (!liquidator) {
      const swapper =
        liquidators[Math.floor(Math.random() * liquidators.length)];
      if (!swapper) continue;

      const currentPrice = await publicClient.readContract({
        address: cornDEX.address,
        abi: cornDEX.abi,
        functionName: "currentPrice",
      });

      const ethNeeded =
        (amountBorrowed * currentPrice * 110n) / (1000n * parseEther("1"));
      const balance = await publicClient.getBalance({
        address: swapper.account.address,
      });
      const maxETH =
        ethNeeded > balance ? balance - parseEther("0.1") : ethNeeded;
      if (maxETH < parseEther("0.01")) continue;

      try {
        const hash = await swapper.writeContract({
          address: cornDEX.address,
          abi: cornDEX.abi,
          functionName: "swap",
          args: [maxETH],
          value: maxETH,
        });
        await publicClient.waitForTransactionReceipt({ hash });

        const newBalance = await publicClient.readContract({
          address: corn.address,
          abi: corn.abi,
          functionName: "balanceOf",
          args: [swapper.account.address],
        });
        if (newBalance >= amountBorrowed) {
          liquidationInProgress.add(user.toLowerCase());
          console.log(
            `${swapper.account.address} swapped ${formatEther(maxETH)} ETH for CORN`
          );
          liquidator = swapper;
        }
      } catch {
        console.error("Failed to swap ETH for CORN");
      }
    }

    if (!liquidator) continue;
    liquidationInProgress.add(user.toLowerCase());
    console.log(
      `${liquidator.account.address} found liquidatable position for user: ${user}`
    );

    try {
      // Approve lending contract to pull CORN
      const approveHash = await liquidator.writeContract({
        address: corn.address,
        abi: corn.abi,
        functionName: "approve",
        args: [lending.address, amountBorrowed],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Liquidate
      const liqHash = await liquidator.writeContract({
        address: lending.address,
        abi: lending.abi,
        functionName: "liquidate",
        args: [user],
      });
      await publicClient.waitForTransactionReceipt({ hash: liqHash });

      // Re-deposit some collateral with the proceeds
      const liqBalance = await publicClient.getBalance({
        address: liquidator.account.address,
      });
      if (liqBalance > parseEther("2")) {
        try {
          const depHash = await liquidator.writeContract({
            address: lending.address,
            abi: lending.abi,
            functionName: "addCollateral",
            value: liqBalance - parseEther("2"),
          });
          await publicClient.waitForTransactionReceipt({ hash: depHash });
        } catch {
          // skip
        }
      }

      console.log(`Successfully liquidated position for user ${user}`);
    } catch {
      console.error(`Failed to liquidate user ${user}`);
    } finally {
      liquidationInProgress.delete(user.toLowerCase());
    }

    break;
  }
}

async function main() {
  console.log("Starting lending market simulation...");
  console.log(`Using ${NUM_ACCOUNTS} bot accounts`);
  console.log(`Deployer: ${deployer.account.address}`);

  let trend = Math.random() > 0.5 ? 1 : -1;
  let trendDuration = 0;
  let maxTrendDuration = Math.floor(Math.random() * 8) + 7;

  const run = async () => {
    try {
      // 1. Move price
      trendDuration++;
      if (trendDuration >= maxTrendDuration) {
        trend *= -1;
        trendDuration = 0;
        maxTrendDuration = Math.floor(Math.random() * 8) + 7;
        console.log(`Trend reversed to ${trend > 0 ? "upward" : "downward"}`);
      }

      const noise = Math.random() * 2.5 - 1.6;
      const direction = trend + noise;
      const amount = parseEther("24");
      const amountToSell = direction > 0 ? amount : -amount * 1000n;

      // Skip if MovePrice lacks the asset it would spend
      if (amountToSell > 0n) {
        const mpEth = await publicClient.getBalance({ address: movePrice.address });
        if (mpEth < amountToSell) {
          trend = -1;
          trendDuration = 0;
        }
      } else {
        const mpCorn = await publicClient.readContract({
          address: corn.address,
          abi: corn.abi,
          functionName: "balanceOf",
          args: [movePrice.address],
        });
        if (mpCorn < -amountToSell) {
          trend = 1;
          trendDuration = 0;
        }
      }

      const finalAmount = trend > 0 ? amount : -amount * 1000n;
      const mpHas = trend > 0
        ? await publicClient.getBalance({ address: movePrice.address })
        : await publicClient.readContract({
            address: corn.address,
            abi: corn.abi,
            functionName: "balanceOf",
            args: [movePrice.address],
          });
      const needed = trend > 0 ? finalAmount : -finalAmount;

      if (mpHas >= needed) {
        await deployer.writeContract({
          address: movePrice.address,
          abi: movePrice.abi,
          functionName: "movePrice",
          args: [finalAmount],
        });
      }

      // 2. Fund accounts if needed
      await fundAccountsIfNeeded();

      // 3. Random borrowing
      if (Math.random() < CHANCE_TO_BORROW) {
        await simulateBorrowing();
      }

      // 4. Random collateral addition
      if (Math.random() < CHANCE_TO_ADD_COLLATERAL) {
        await simulateAddCollateral();
      }

      // 5. Check for liquidations
      await checkAndPerformLiquidations();
    } catch (error) {
      if (process.env.DEBUG) {
        console.error("Simulation error:", error);
      }
    }
  };

  setInterval(run, 2000);

  // Keep alive
  process.stdin.resume();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
