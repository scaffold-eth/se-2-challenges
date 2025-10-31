import { HardhatRuntimeEnvironment } from "hardhat/types";
import hre from "hardhat";
import { sleep, getConfig } from "./utils";
import { parseEther } from "viem";
import { fetchPriceFromUniswap } from "./fetchPriceFromUniswap";

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
      if (node.firstBucket !== 0n) {
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

const runCycle = async (runtime: HardhatRuntimeEnvironment) => {
  try {
    const { address, abi } = await getStakingOracleDeployment(runtime);
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

    // Update base price from previous bucket, excluding slashable and already-slashed reports.
    // Fallback to contract's latest price, then to previous cached value.
    try {
      // Determine adjusted average from the previous bucket excluding outliers and slashed reports
      const previous = previousBucket;
      if (previous > 0n) {
        let adjustedAvg: bigint | null = null;
        try {
          const [outliers, nodeAddresses] = await Promise.all([
            publicClient.readContract({ address, abi, functionName: "getOutlierNodes", args: [previous] }) as Promise<
              `0x${string}`[]
            >,
            publicClient.readContract({ address, abi, functionName: "getNodeAddresses", args: [] }) as Promise<
              `0x${string}`[]
            >,
          ]);
          const outlierSet = new Set(outliers.map(a => a.toLowerCase()));
          const dataForNodes = await Promise.all(
            nodeAddresses.map(async nodeAddr => {
              try {
                const result: any = await publicClient.readContract({
                  address,
                  abi,
                  functionName: "getAddressDataAtBucket",
                  args: [nodeAddr, previous],
                });
                // result could be array-like [price, slashed] or object with named props
                const priceVal = Array.isArray(result) ? result[0] : (result?.[0] ?? result?.price);
                const slashedVal = Array.isArray(result) ? result[1] : (result?.[1] ?? result?.slashed);
                const price = BigInt(String(priceVal ?? 0));
                const slashed = Boolean(slashedVal);
                return { nodeAddr, price, slashed } as const;
              } catch {
                return { nodeAddr, price: 0n, slashed: false } as const;
              }
            }),
          );
          const valid = dataForNodes.filter(
            d => d.price > 0n && !d.slashed && !outlierSet.has(d.nodeAddr.toLowerCase()),
          );
          if (valid.length > 0) {
            const sum = valid.reduce((acc, d) => acc + d.price, 0n);
            adjustedAvg = sum / BigInt(valid.length);
          }
        } catch {
          // ignore and fall back
        }

        if (adjustedAvg !== null) {
          currentPrice = adjustedAvg;
        } else {
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

    // 2) Slashing: if previous bucket had outliers
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
            try {
              await slasher.writeContract({
                address,
                abi,
                functionName: "slashNode",
                args: [nodeAddr, previousBucket, index],
              });
              console.log(`Slashed node ${nodeAddr} for bucket ${previousBucket} at index ${index}`);
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

    // 3) Rewards: claim when there are unclaimed reports
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

  // Spin up nodes (register) for local testing if they aren't registered yet.
  try {
    const { address, abi } = await getStakingOracleDeployment(hre);
    const publicClient = await hre.viem.getPublicClient();
    const accounts = await hre.viem.getWalletClients();
    // Mirror deploy script: use accounts[1..10] as oracle nodes
    const nodeAccounts = accounts.slice(1, 11);
    const registerTxHashes: `0x${string}`[] = [];

    for (const account of nodeAccounts) {
      try {
        const rawNodeInfo = await publicClient.readContract({
          address,
          abi,
          functionName: "nodes",
          args: [account.account.address],
        });
        const node = normalizeNodeInfo(rawNodeInfo);
        if (node.firstBucket !== 0n) {
          console.log(`Node already registered: ${account.account.address}`);
          continue;
        }
      } catch {
        // If read fails, proceed to attempt registration
      }

      try {
        console.log(`Registering node ${account.account.address} with initial price ${currentPrice} and stake 15 ETH`);
        const txHash = await account.writeContract({
          address,
          abi,
          functionName: "registerNode",
          args: [currentPrice],
          value: parseEther("15"),
        });
        registerTxHashes.push(txHash as `0x${string}`);
      } catch (err: any) {
        if (err?.message?.includes("NodeAlreadyRegistered")) {
          console.log(`Node already registered during attempt: ${account.account.address}`);
        } else {
          console.warn(`Failed to register node ${account.account.address}:`, err?.message ?? err);
        }
      }
    }

    if (registerTxHashes.length > 0) {
      try {
        await Promise.all(registerTxHashes.map(h => publicClient.waitForTransactionReceipt({ hash: h } as any)));
        console.log("All node registration txs mined");
      } catch (err) {
        console.warn("Error waiting for registration receipts:", (err as Error).message);
      }
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
