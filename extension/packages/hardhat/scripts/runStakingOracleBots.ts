import { HardhatRuntimeEnvironment } from "hardhat/types";
import hre from "hardhat";
import { sleep, getConfig } from "./utils";
import { fetchPriceFromUniswap } from "./fetchPriceFromUniswap";
import { parseEther } from "viem";

const oraTokenAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

type WalletClient = Awaited<ReturnType<typeof hre.viem.getWalletClients>>[number];

const normalizeNodeInfo = (raw: any) => {
  const zero = 0n;
  if (!raw)
    return {
      stakedAmount: zero,
      lastReportedBucket: zero,
      reportCount: zero,
      claimedReportCount: zero,
      firstBucket: zero,
      active: false,
    };
  const get = (idx: number, name: string) => {
    const byName = raw[name];
    const byIndex = Array.isArray(raw) ? raw[idx] : undefined;
    if (typeof byName === "bigint") return byName as bigint;
    if (typeof byIndex === "bigint") return byIndex as bigint;
    const val = byName ?? byIndex ?? 0;
    try {
      return BigInt(String(val));
    } catch {
      return zero;
    }
  };
  return {
    stakedAmount: get(0, "stakedAmount"),
    lastReportedBucket: get(1, "lastReportedBucket"),
    reportCount: get(2, "reportCount"),
    claimedReportCount: get(3, "claimedReportCount"),
    firstBucket: get(4, "firstBucket"),
    active:
      typeof raw?.active === "boolean"
        ? (raw.active as boolean)
        : Array.isArray(raw) && typeof raw[5] === "boolean"
          ? (raw[5] as boolean)
          : false,
  };
};

// Current base price used by the bot. Initialized once at start from Uniswap
// and updated from on-chain contract prices thereafter.
let currentPrice: bigint | null = null;

const stringToBool = (value: string | undefined | null): boolean => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

// Feature flag: enable automatic slashing when the AUTO_SLASH environment variable is truthy
const AUTO_SLASH: boolean = stringToBool(process.env.AUTO_SLASH);

const getStakingOracleDeployment = async (runtime: HardhatRuntimeEnvironment) => {
  const deployment = await runtime.deployments.get("StakingOracle");
  return {
    address: deployment.address as `0x${string}`,
    abi: deployment.abi,
    deployedBlock: deployment.receipt?.blockNumber ? BigInt(deployment.receipt.blockNumber) : 0n,
  } as const;
};

const getActiveNodeWalletClients = async (
  runtime: HardhatRuntimeEnvironment,
  stakingAddress: `0x${string}`,
  stakingAbi: any,
): Promise<WalletClient[]> => {
  const accounts = await runtime.viem.getWalletClients();
  // Filter to only those that are registered (firstBucket != 0)
  const publicClient = await runtime.viem.getPublicClient();
  const nodeClients: WalletClient[] = [];
  for (const client of accounts) {
    try {
      const rawNodeInfo = await publicClient.readContract({
        address: stakingAddress,
        abi: stakingAbi,
        functionName: "nodes",
        args: [client.account.address],
      });
      const node = normalizeNodeInfo(rawNodeInfo);
      if (node.firstBucket !== 0n && node.active) {
        nodeClients.push(client);
      }
    } catch {
      // ignore
    }
  }
  return nodeClients;
};

const findNodeIndex = async (
  runtime: HardhatRuntimeEnvironment,
  stakingAddress: `0x${string}`,
  stakingAbi: any,
  nodeAddress: `0x${string}`,
): Promise<number | null> => {
  const publicClient = await runtime.viem.getPublicClient();
  // Iterate indices until out-of-bounds revert
  try {
    const addresses = (await publicClient.readContract({
      address: stakingAddress,
      abi: stakingAbi,
      functionName: "getNodeAddresses",
      args: [],
    })) as `0x${string}`[];
    return addresses.findIndex(addr => addr.toLowerCase() === nodeAddress.toLowerCase());
  } catch {}
  return null;
};

const getReportIndexForNode = async (
  publicClient: Awaited<ReturnType<typeof hre.viem.getPublicClient>>,
  stakingAddress: `0x${string}`,
  stakingAbi: any,
  bucketNumber: bigint,
  nodeAddress: `0x${string}`,
  fromBlock: bigint,
): Promise<number | null> => {
  try {
    const events = (await publicClient.getContractEvents({
      address: stakingAddress,
      abi: stakingAbi,
      eventName: "PriceReported",
      fromBlock,
      toBlock: "latest",
    })) as any[];
    const bucketEvents = events.filter((ev: any) => {
      const bucket = ev.args?.bucketNumber as bigint | undefined;
      return bucket !== undefined && bucket === bucketNumber;
    });
    const idx = bucketEvents.findIndex((ev: any) => {
      const reporter = (ev.args?.node as string | undefined) ?? "";
      return reporter.toLowerCase() === nodeAddress.toLowerCase();
    });
    return idx === -1 ? null : idx;
  } catch (error) {
    console.warn("Failed to compute report index:", (error as Error).message);
  }
  return null;
};

const runCycle = async (runtime: HardhatRuntimeEnvironment) => {
  try {
    const { address, abi, deployedBlock } = await getStakingOracleDeployment(runtime);
    const publicClient = await runtime.viem.getPublicClient();
    const allWalletClients = await runtime.viem.getWalletClients();
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`\n[Block ${blockNumber}] Starting new oracle cycle...`);

    // Read current bucket window and bucket number
    const [bucketWindow, currentBucket] = await Promise.all([
      publicClient
        .readContract({ address, abi, functionName: "BUCKET_WINDOW", args: [] })
        .then(value => BigInt(String(value))),
      publicClient
        .readContract({ address, abi, functionName: "getCurrentBucketNumber", args: [] })
        .then(value => BigInt(String(value))),
    ]);
    const previousBucket = currentBucket > 0n ? currentBucket - 1n : 0n;
    console.log(`BUCKET_WINDOW=${bucketWindow} | currentBucket=${currentBucket}`);

    // Update base price from previous bucket using the RECORDED MEDIAN (not an average of reports).
    // Fallback to contract's latest price, then to previous cached value.
    try {
      const previous = previousBucket;
      if (previous > 0n) {
        try {
          // `getPastPrice(bucket)` returns the recorded median for that bucket (0 if not recorded yet).
          const pastMedian = await publicClient.readContract({
            address,
            abi,
            functionName: "getPastPrice",
            args: [previous],
          });
          const median = BigInt(String(pastMedian));
          if (median > 0n) {
            currentPrice = median;
          }
        } catch {
          // ignore and fall back
        }

        if (currentPrice === null) {
          // Fallback to on-chain latest average (previous bucket average)
          try {
            const onchain = await publicClient.readContract({ address, abi, functionName: "getLatestPrice", args: [] });
            currentPrice = BigInt(String(onchain));
          } catch {
            // keep prior currentPrice
          }
        }
      }
    } catch {
      // keep prior currentPrice
    }

    // Load config once per cycle so runtime edits to the config file are picked up
    const cfg = getConfig();

    // 1) Reporting: each node only once per bucket
    const nodeWalletClients = await getActiveNodeWalletClients(runtime, address, abi);
    // Ensure we have an initial price (set once at startup in run())
    if (currentPrice === null) {
      currentPrice = await fetchPriceFromUniswap();
    }
    const reportTxHashes: `0x${string}`[] = [];
    for (const client of nodeWalletClients) {
      try {
        const rawNodeInfo = await publicClient.readContract({
          address,
          abi,
          functionName: "nodes",
          args: [client.account.address],
        });
        const node = normalizeNodeInfo(rawNodeInfo);
        if (node.lastReportedBucket !== currentBucket) {
          // Determine node config (probability to skip and variance)
          const nodeCfg = cfg.NODE_CONFIGS[client.account.address.toLowerCase()] || cfg.NODE_CONFIGS.default;
          const skipProb = Number(nodeCfg.PROBABILITY_OF_SKIPPING_REPORT ?? 0);
          if (Math.random() < skipProb) {
            console.log(`Skipping report (by probability) for ${client.account.address}`);
            continue;
          }
          // Compute deviated price as integer math using parts-per-million (ppm)
          const variancePpm = Math.floor((Number(nodeCfg.PRICE_VARIANCE) || 0) * 1_000_000);
          const randomPpm = variancePpm > 0 ? Math.floor(Math.random() * (variancePpm * 2 + 1)) - variancePpm : 0;
          const basePrice = currentPrice!; // derived from previous bucket excluding outliers
          const delta = (basePrice * BigInt(randomPpm)) / 1_000_000n;
          const priceToReport = basePrice + delta;

          console.log(
            `Reporting price for node ${client.account.address} in bucket ${currentBucket} (price=${priceToReport})...`,
          );
          const txHash = await client.writeContract({
            address,
            abi,
            functionName: "reportPrice",
            args: [priceToReport],
          });
          reportTxHashes.push(txHash as `0x${string}`);
        }
      } catch (err) {
        console.warn(`Skipping report for ${client.account.address}:`, (err as Error).message);
      }
    }

    // Wait for report transactions to be mined so subsequent reads (claiming) see the updated state.
    if (reportTxHashes.length > 0) {
      try {
        await Promise.all(reportTxHashes.map(hash => publicClient.waitForTransactionReceipt({ hash } as any)));
      } catch (err) {
        // If waiting fails, continue — claims will be attempted anyway but may not see the latest reports.
        console.warn("Error while waiting for report tx receipts:", (err as Error).message);
      }
    }

    // 2) Finalize median automatically when quorum is reached
    // You can only finalize buckets strictly in the past, so we finalize the *previous* bucket (current - 1).
    if (previousBucket > 0n) {
      let medianAlreadyRecorded = false;
      try {
        const median = await publicClient.readContract({
          address,
          abi,
          functionName: "getPastPrice",
          args: [previousBucket],
        });
        medianAlreadyRecorded = BigInt(String(median)) > 0n;
      } catch {
        medianAlreadyRecorded = false;
      }

      if (!medianAlreadyRecorded) {
        try {
          const activeNodeAddresses = (await publicClient.readContract({
            address,
            abi,
            functionName: "getNodeAddresses",
            args: [],
          })) as `0x${string}`[];

          const reportStatuses = await Promise.all(
            activeNodeAddresses.map(async nodeAddr => {
              try {
                const [price] = (await publicClient.readContract({
                  address,
                  abi,
                  functionName: "getSlashedStatus",
                  args: [nodeAddr, previousBucket],
                })) as [bigint, boolean];
                return price;
              } catch {
                return 0n;
              }
            }),
          );

          const reportedCount = reportStatuses.reduce((acc, price) => acc + (price > 0n ? 1n : 0n), 0n);
          const requiredReports =
            activeNodeAddresses.length === 0 ? 0n : (2n * BigInt(activeNodeAddresses.length) + 2n) / 3n;

          if (activeNodeAddresses.length === 0) {
            console.log("No active nodes; skipping recordBucketMedian evaluation.");
          } else if (reportedCount >= requiredReports) {
            const finalizer = allWalletClients[0];
            try {
              await finalizer.writeContract({
                address,
                abi,
                functionName: "recordBucketMedian",
                args: [previousBucket],
              });
              console.log(
                `Recorded median for bucket ${previousBucket} (reports ${reportedCount}/${requiredReports}).`,
              );
            } catch (err) {
              console.warn(`Failed to record median for bucket ${previousBucket}:`, (err as Error).message);
            }
          } else {
            console.log(
              `Skipping median recording for bucket ${previousBucket}; only ${reportedCount}/${requiredReports} reports.`,
            );
          }
        } catch (err) {
          console.warn("Unable to evaluate automatic recordBucketMedian:", (err as Error).message);
        }
      }
    }

    // 3) Slashing: if previous bucket had outliers
    if (AUTO_SLASH) {
      try {
        const outliers = (await publicClient.readContract({
          address,
          abi,
          functionName: "getOutlierNodes",
          args: [previousBucket],
        })) as `0x${string}`[];

        if (outliers.length > 0) {
          console.log(`Found ${outliers.length} outliers in bucket ${previousBucket}, attempting to slash...`);
          // Use the first wallet (deployer) to slash
          const slasher = allWalletClients[0];
          for (const nodeAddr of outliers) {
            const index = await findNodeIndex(runtime, address, abi, nodeAddr);
            if (index === null) {
              console.warn(`Index not found for node ${nodeAddr}, skipping slashing.`);
              continue;
            }
            const reportIndex = await getReportIndexForNode(
              publicClient,
              address,
              abi,
              previousBucket,
              nodeAddr,
              deployedBlock,
            );
            if (reportIndex === null) {
              console.warn(`Report index not found for node ${nodeAddr}, skipping slashing.`);
              continue;
            }
            try {
              await slasher.writeContract({
                address,
                abi,
                functionName: "slashNode",
                args: [nodeAddr, previousBucket, BigInt(reportIndex), BigInt(index)],
              });
              console.log(
                `Slashed node ${nodeAddr} for bucket ${previousBucket} at indices report=${reportIndex}, node=${index}`,
              );
            } catch (err) {
              console.warn(`Failed to slash ${nodeAddr}:`, (err as Error).message);
            }
          }
        }
      } catch (err) {
        // getOutlierNodes may revert for small sample sizes (e.g., 0 or 1 report)
        console.log(`Skipping slashing check for bucket ${previousBucket}:`, (err as Error).message);
      }
    } else {
      // Auto-slash disabled by flag
      console.log(`Auto-slash disabled; skipping slashing for bucket ${previousBucket}`);
    }

    // 4) Rewards: claim when there are unclaimed reports
    // Wait a couple seconds after reports have been mined before claiming
    console.log("Waiting 2s before claiming rewards...");
    await sleep(2000);
    for (const client of nodeWalletClients) {
      try {
        const rawNodeInfo = await publicClient.readContract({
          address,
          abi,
          functionName: "nodes",
          args: [client.account.address],
        });
        const node = normalizeNodeInfo(rawNodeInfo);
        if (node.reportCount > node.claimedReportCount) {
          await client.writeContract({ address, abi, functionName: "claimReward", args: [] });
          console.log(`Claimed rewards for ${client.account.address}`);
        }
      } catch (err) {
        console.warn(`Failed to claim rewards for ${client.account.address}:`, (err as Error).message);
      }
    }
  } catch (error) {
    console.error("Error in oracle cycle:", error);
  }
};

const run = async () => {
  console.log("Starting oracle bot system...");
  // Fetch Uniswap price once at startup; subsequent cycles will base price on on-chain reports
  currentPrice = await fetchPriceFromUniswap();
  console.log(`Initial base price from Uniswap: ${currentPrice}`);

  // Spin up nodes (fund + approve + register) for local testing if they aren't registered yet.
  try {
    const { address, abi } = await getStakingOracleDeployment(hre);
    const publicClient = await hre.viem.getPublicClient();
    const accounts = await hre.viem.getWalletClients();
    // Mirror deploy script: use accounts[1..10] as oracle nodes
    const nodeAccounts = accounts.slice(1, 11);
    const deployerClient = accounts[0];

    const [minimumStake, oraTokenAddress] = await Promise.all([
      publicClient.readContract({ address, abi, functionName: "MINIMUM_STAKE", args: [] }).then(v => BigInt(String(v))),
      publicClient
        .readContract({
          address,
          abi,
          functionName: "oracleToken",
          args: [],
        })
        .then(v => v as unknown as `0x${string}`),
    ]);

    // Default bot stake for local simulations (keep it small so it matches the new UX expectations)
    const defaultStake = parseEther("500");
    const stakeAmount = minimumStake > defaultStake ? minimumStake : defaultStake;

    // Build an idempotent setup plan based on current on-chain state (so restarts resume cleanly).
    const snapshots = await Promise.all(
      nodeAccounts.map(async nodeClient => {
        const nodeAddress = nodeClient.account.address;
        const [rawNodeInfo, balance, allowance] = await Promise.all([
          publicClient
            .readContract({ address, abi, functionName: "nodes", args: [nodeAddress] })
            .catch(() => null as any),
          publicClient.readContract({
            address: oraTokenAddress,
            abi: oraTokenAbi,
            functionName: "balanceOf",
            args: [nodeAddress],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: oraTokenAddress,
            abi: oraTokenAbi,
            functionName: "allowance",
            args: [nodeAddress, address],
          }) as Promise<bigint>,
        ]);

        const node = normalizeNodeInfo(rawNodeInfo);
        const effectiveStake = node.active
          ? await publicClient
              .readContract({ address, abi, functionName: "getEffectiveStake", args: [nodeAddress] })
              .then(v => BigInt(String(v)))
              .catch(() => 0n)
          : 0n;

        return { nodeClient, nodeAddress, node, effectiveStake, balance, allowance };
      }),
    );

    const transfers: { to: `0x${string}`; amount: bigint }[] = [];
    const perNodeActions: {
      nodeClient: WalletClient;
      nodeAddress: `0x${string}`;
      approveAmount: bigint;
      kind: "register" | "addStake" | "none";
      amount: bigint;
      note: string;
    }[] = [];

    for (const snap of snapshots) {
      const { nodeClient, nodeAddress, node, effectiveStake, balance, allowance } = snap;

      if (node.active) {
        if (effectiveStake < minimumStake) {
          const needed = minimumStake - effectiveStake;
          const transferAmount = balance < needed ? needed - balance : 0n;
          if (transferAmount > 0n) transfers.push({ to: nodeAddress, amount: transferAmount });

          const approveAmount = allowance < needed ? needed : 0n;
          perNodeActions.push({
            nodeClient,
            nodeAddress,
            approveAmount,
            kind: "addStake",
            amount: needed,
            note: `top up effectiveStake=${effectiveStake} by ${needed}`,
          });
        } else {
          perNodeActions.push({
            nodeClient,
            nodeAddress,
            approveAmount: 0n,
            kind: "none",
            amount: 0n,
            note: "already active (no action)",
          });
        }
        continue;
      }

      // Inactive -> fund/approve/register. On restart, we only do the missing pieces.
      const transferAmount = balance < stakeAmount ? stakeAmount - balance : 0n;
      if (transferAmount > 0n) transfers.push({ to: nodeAddress, amount: transferAmount });

      const approveAmount = allowance < stakeAmount ? stakeAmount : 0n;
      perNodeActions.push({
        nodeClient,
        nodeAddress,
        approveAmount,
        kind: "register",
        amount: stakeAmount,
        note: `register with stake=${stakeAmount}`,
      });
    }

    // 1) Fund nodes in one burst from deployer using nonce chaining.
    if (transfers.length > 0) {
      const deployerNonce = await publicClient.getTransactionCount({ address: deployerClient.account.address });
      const transferTxs: `0x${string}`[] = [];
      console.log(`Funding ${transfers.length} node(s) from deployer (burst)...`);
      for (const [i, t] of transfers.entries()) {
        const tx = await deployerClient.writeContract({
          address: oraTokenAddress,
          abi: oraTokenAbi,
          functionName: "transfer",
          nonce: deployerNonce + i,
          args: [t.to, t.amount],
        });
        transferTxs.push(tx as `0x${string}`);
      }
      await Promise.all(transferTxs.map(hash => publicClient.waitForTransactionReceipt({ hash })));
      console.log("Funding burst mined.");
    }

    // 2) For each node, chain approve -> (register|addStake) with explicit nonces, then wait for all receipts once.
    const nodeNonces = await Promise.all(
      perNodeActions.map(a => publicClient.getTransactionCount({ address: a.nodeAddress })),
    );
    const nodeTxs: `0x${string}`[] = [];

    for (const [idx, action] of perNodeActions.entries()) {
      const { nodeClient, nodeAddress, approveAmount, kind, amount, note } = action;
      let nonce = nodeNonces[idx];

      if (kind === "none") {
        console.log(`Node ${nodeAddress}: ${note}`);
        continue;
      }

      console.log(`Node ${nodeAddress}: ${note}`);

      if (approveAmount > 0n) {
        const tx = await nodeClient.writeContract({
          address: oraTokenAddress,
          abi: oraTokenAbi,
          functionName: "approve",
          nonce,
          args: [address, approveAmount],
        });
        nodeTxs.push(tx as `0x${string}`);
        nonce += 1;
      }

      if (kind === "register") {
        const tx = await nodeClient.writeContract({
          address,
          abi,
          functionName: "registerNode",
          nonce,
          args: [amount],
        });
        nodeTxs.push(tx as `0x${string}`);
      } else if (kind === "addStake") {
        const tx = await nodeClient.writeContract({
          address,
          abi,
          functionName: "addStake",
          nonce,
          args: [amount],
        });
        nodeTxs.push(tx as `0x${string}`);
      }
    }

    if (nodeTxs.length > 0) {
      console.log(`Waiting for ${nodeTxs.length} node tx(s) to be mined...`);
      await Promise.all(nodeTxs.map(hash => publicClient.waitForTransactionReceipt({ hash })));
      console.log("Node setup txs mined.");
    }
  } catch (err) {
    console.warn("Node registration step failed:", (err as Error).message);
  }
  while (true) {
    await runCycle(hre);
    await sleep(12000);
  }
};

run().catch(error => {
  console.error("Fatal error in oracle bot system:", error);
  process.exit(1);
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
