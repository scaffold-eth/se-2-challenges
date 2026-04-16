import { parseEther } from "viem";
import {
  getPublicClient,
  getWalletClients,
  getDeployerClient,
  DEPLOYER_INDEX,
} from "./accounts.js";
import { getContract } from "./contractHelper.js";
import { sleep, getConfig } from "./utils.js";
import { fetchPriceFromUniswap } from "./fetchPriceFromUniswap.js";

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
];

const normalizeNodeInfo = (raw) => {
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
  const get = (idx, name) => {
    const byName = raw[name];
    const byIndex = Array.isArray(raw) ? raw[idx] : undefined;
    if (typeof byName === "bigint") return byName;
    if (typeof byIndex === "bigint") return byIndex;
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
        ? raw.active
        : Array.isArray(raw) && typeof raw[5] === "boolean"
          ? raw[5]
          : false,
  };
};

let currentPrice = null;

const stringToBool = (value) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
};

const AUTO_SLASH = stringToBool(process.env.AUTO_SLASH);

const getActiveNodeWalletClients = async (address, abi) => {
  const publicClient = getPublicClient();
  const allClients = getWalletClients();
  const nodeClients = [];
  for (const client of allClients) {
    try {
      const rawNodeInfo = await publicClient.readContract({
        address,
        abi,
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

const findNodeIndex = async (address, abi, nodeAddress) => {
  const publicClient = getPublicClient();
  try {
    const addresses = await publicClient.readContract({
      address,
      abi,
      functionName: "getNodeAddresses",
      args: [],
    });
    return addresses.findIndex(
      (addr) => addr.toLowerCase() === nodeAddress.toLowerCase()
    );
  } catch {}
  return null;
};

const getReportIndexForNode = async (
  address,
  abi,
  bucketNumber,
  nodeAddress,
  fromBlock
) => {
  const publicClient = getPublicClient();
  try {
    const events = await publicClient.getContractEvents({
      address,
      abi,
      eventName: "PriceReported",
      fromBlock,
      toBlock: "latest",
    });
    const bucketEvents = events.filter((ev) => {
      const bucket = ev.args?.bucketNumber;
      return bucket !== undefined && bucket === bucketNumber;
    });
    const idx = bucketEvents.findIndex((ev) => {
      const reporter = ev.args?.node ?? "";
      return reporter.toLowerCase() === nodeAddress.toLowerCase();
    });
    return idx === -1 ? null : idx;
  } catch (error) {
    console.warn("Failed to compute report index:", error.message);
  }
  return null;
};

const runCycle = async () => {
  try {
    const { address, abi, deployedBlock } = getContract("StakingOracle");
    const publicClient = getPublicClient();
    const allWalletClients = getWalletClients();
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`\n[Block ${blockNumber}] Starting new oracle cycle...`);

    const [bucketWindow, currentBucket] = await Promise.all([
      publicClient
        .readContract({
          address,
          abi,
          functionName: "BUCKET_WINDOW",
          args: [],
        })
        .then((v) => BigInt(String(v))),
      publicClient
        .readContract({
          address,
          abi,
          functionName: "getCurrentBucketNumber",
          args: [],
        })
        .then((v) => BigInt(String(v))),
    ]);
    const previousBucket = currentBucket > 0n ? currentBucket - 1n : 0n;
    console.log(
      `BUCKET_WINDOW=${bucketWindow} | currentBucket=${currentBucket}`
    );

    // Update base price from previous bucket median
    try {
      if (previousBucket > 0n) {
        try {
          const pastMedian = await publicClient.readContract({
            address,
            abi,
            functionName: "getPastPrice",
            args: [previousBucket],
          });
          const median = BigInt(String(pastMedian));
          if (median > 0n) currentPrice = median;
        } catch {}

        if (currentPrice === null) {
          try {
            const onchain = await publicClient.readContract({
              address,
              abi,
              functionName: "getLatestPrice",
              args: [],
            });
            currentPrice = BigInt(String(onchain));
          } catch {}
        }
      }
    } catch {}

    const cfg = getConfig();

    // 1) Reporting
    const nodeWalletClients = await getActiveNodeWalletClients(address, abi);
    if (currentPrice === null) {
      currentPrice = await fetchPriceFromUniswap();
    }
    const reportTxHashes = [];
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
          const nodeCfg =
            cfg.NODE_CONFIGS[client.account.address.toLowerCase()] ||
            cfg.NODE_CONFIGS.default;
          const skipProb = Number(
            nodeCfg.PROBABILITY_OF_SKIPPING_REPORT ?? 0
          );
          if (Math.random() < skipProb) {
            console.log(
              `Skipping report (by probability) for ${client.account.address}`
            );
            continue;
          }
          const variancePpm = Math.floor(
            (Number(nodeCfg.PRICE_VARIANCE) || 0) * 1_000_000
          );
          const randomPpm =
            variancePpm > 0
              ? Math.floor(Math.random() * (variancePpm * 2 + 1)) -
                variancePpm
              : 0;
          const basePrice = currentPrice;
          const delta = (basePrice * BigInt(randomPpm)) / 1_000_000n;
          const priceToReport = basePrice + delta;

          console.log(
            `Reporting price for node ${client.account.address} in bucket ${currentBucket} (price=${priceToReport})...`
          );
          const txHash = await client.writeContract({
            address,
            abi,
            functionName: "reportPrice",
            args: [priceToReport],
          });
          reportTxHashes.push(txHash);
        }
      } catch (err) {
        console.warn(
          `Skipping report for ${client.account.address}:`,
          err.message
        );
      }
    }

    if (reportTxHashes.length > 0) {
      try {
        await Promise.all(
          reportTxHashes.map((hash) =>
            publicClient.waitForTransactionReceipt({ hash })
          )
        );
      } catch (err) {
        console.warn(
          "Error while waiting for report tx receipts:",
          err.message
        );
      }
    }

    // 2) Finalize median for previous bucket
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
          const activeNodeAddresses = await publicClient.readContract({
            address,
            abi,
            functionName: "getNodeAddresses",
            args: [],
          });

          const reportStatuses = await Promise.all(
            activeNodeAddresses.map(async (nodeAddr) => {
              try {
                const [price] = await publicClient.readContract({
                  address,
                  abi,
                  functionName: "getSlashedStatus",
                  args: [nodeAddr, previousBucket],
                });
                return price;
              } catch {
                return 0n;
              }
            })
          );

          const reportedCount = reportStatuses.reduce(
            (acc, price) => acc + (price > 0n ? 1n : 0n),
            0n
          );
          const requiredReports =
            activeNodeAddresses.length === 0
              ? 0n
              : (2n * BigInt(activeNodeAddresses.length) + 2n) / 3n;

          if (activeNodeAddresses.length === 0) {
            console.log(
              "No active nodes; skipping recordBucketMedian evaluation."
            );
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
                `Recorded median for bucket ${previousBucket} (reports ${reportedCount}/${requiredReports}).`
              );
            } catch (err) {
              console.warn(
                `Failed to record median for bucket ${previousBucket}:`,
                err.message
              );
            }
          } else {
            console.log(
              `Skipping median recording for bucket ${previousBucket}; only ${reportedCount}/${requiredReports} reports.`
            );
          }
        } catch (err) {
          console.warn(
            "Unable to evaluate automatic recordBucketMedian:",
            err.message
          );
        }
      }
    }

    // 3) Slashing
    if (AUTO_SLASH) {
      try {
        const outliers = await publicClient.readContract({
          address,
          abi,
          functionName: "getOutlierNodes",
          args: [previousBucket],
        });

        if (outliers.length > 0) {
          console.log(
            `Found ${outliers.length} outliers in bucket ${previousBucket}, attempting to slash...`
          );
          const slasher = allWalletClients[0];
          for (const nodeAddr of outliers) {
            const index = await findNodeIndex(address, abi, nodeAddr);
            if (index === null) {
              console.warn(
                `Index not found for node ${nodeAddr}, skipping slashing.`
              );
              continue;
            }
            const reportIndex = await getReportIndexForNode(
              address,
              abi,
              previousBucket,
              nodeAddr,
              deployedBlock
            );
            if (reportIndex === null) {
              console.warn(
                `Report index not found for node ${nodeAddr}, skipping slashing.`
              );
              continue;
            }
            try {
              await slasher.writeContract({
                address,
                abi,
                functionName: "slashNode",
                args: [
                  nodeAddr,
                  previousBucket,
                  BigInt(reportIndex),
                  BigInt(index),
                ],
              });
              console.log(
                `Slashed node ${nodeAddr} for bucket ${previousBucket} at indices report=${reportIndex}, node=${index}`
              );
            } catch (err) {
              console.warn(`Failed to slash ${nodeAddr}:`, err.message);
            }
          }
        }
      } catch (err) {
        console.log(
          `Skipping slashing check for bucket ${previousBucket}:`,
          err.message
        );
      }
    } else {
      console.log(
        `Auto-slash disabled; skipping slashing for bucket ${previousBucket}`
      );
    }

    // 4) Rewards
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
          await client.writeContract({
            address,
            abi,
            functionName: "claimReward",
            args: [],
          });
          console.log(`Claimed rewards for ${client.account.address}`);
        }
      } catch (err) {
        console.warn(
          `Failed to claim rewards for ${client.account.address}:`,
          err.message
        );
      }
    }
  } catch (error) {
    console.error("Error in oracle cycle:", error);
  }
};

const run = async () => {
  console.log("Starting oracle bot system...");
  currentPrice = await fetchPriceFromUniswap();
  console.log(`Initial base price from Uniswap: ${currentPrice}`);

  // Setup nodes: fund ORA, approve, register
  try {
    const { address, abi } = getContract("StakingOracle");
    const publicClient = getPublicClient();
    const allClients = getWalletClients();
    const deployerClient = getDeployerClient();

    // Use all non-deployer accounts as nodes
    const nodeAccounts = allClients.filter(
      (_, i) => i !== DEPLOYER_INDEX
    );

    const [minimumStake, oraTokenAddress] = await Promise.all([
      publicClient
        .readContract({
          address,
          abi,
          functionName: "MINIMUM_STAKE",
          args: [],
        })
        .then((v) => BigInt(String(v))),
      publicClient
        .readContract({
          address,
          abi,
          functionName: "oracleToken",
          args: [],
        })
        .then((v) => v),
    ]);

    const defaultStake = parseEther("500");
    const stakeAmount =
      minimumStake > defaultStake ? minimumStake : defaultStake;

    const snapshots = await Promise.all(
      nodeAccounts.map(async (nodeClient) => {
        const nodeAddress = nodeClient.account.address;
        const [rawNodeInfo, balance, allowance] = await Promise.all([
          publicClient
            .readContract({
              address,
              abi,
              functionName: "nodes",
              args: [nodeAddress],
            })
            .catch(() => null),
          publicClient.readContract({
            address: oraTokenAddress,
            abi: oraTokenAbi,
            functionName: "balanceOf",
            args: [nodeAddress],
          }),
          publicClient.readContract({
            address: oraTokenAddress,
            abi: oraTokenAbi,
            functionName: "allowance",
            args: [nodeAddress, address],
          }),
        ]);

        const node = normalizeNodeInfo(rawNodeInfo);
        const effectiveStake = node.active
          ? await publicClient
              .readContract({
                address,
                abi,
                functionName: "getEffectiveStake",
                args: [nodeAddress],
              })
              .then((v) => BigInt(String(v)))
              .catch(() => 0n)
          : 0n;

        return {
          nodeClient,
          nodeAddress,
          node,
          effectiveStake,
          balance,
          allowance,
        };
      })
    );

    const transfers = [];
    const perNodeActions = [];

    for (const snap of snapshots) {
      const {
        nodeClient,
        nodeAddress,
        node,
        effectiveStake,
        balance,
        allowance,
      } = snap;

      if (node.active) {
        if (effectiveStake < minimumStake) {
          const needed = minimumStake - effectiveStake;
          const transferAmount = balance < needed ? needed - balance : 0n;
          if (transferAmount > 0n)
            transfers.push({ to: nodeAddress, amount: transferAmount });

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

      const transferAmount =
        balance < stakeAmount ? stakeAmount - balance : 0n;
      if (transferAmount > 0n)
        transfers.push({ to: nodeAddress, amount: transferAmount });

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

    // 1) Fund nodes from deployer
    if (transfers.length > 0) {
      const deployerNonce = await publicClient.getTransactionCount({
        address: deployerClient.account.address,
      });
      const transferTxs = [];
      console.log(
        `Funding ${transfers.length} node(s) from deployer (burst)...`
      );
      for (const [i, t] of transfers.entries()) {
        const tx = await deployerClient.writeContract({
          address: oraTokenAddress,
          abi: oraTokenAbi,
          functionName: "transfer",
          nonce: deployerNonce + i,
          args: [t.to, t.amount],
        });
        transferTxs.push(tx);
      }
      await Promise.all(
        transferTxs.map((hash) =>
          publicClient.waitForTransactionReceipt({ hash })
        )
      );
      console.log("Funding burst mined.");
    }

    // 2) Approve + register/addStake per node
    const nodeNonces = await Promise.all(
      perNodeActions.map((a) =>
        publicClient.getTransactionCount({ address: a.nodeAddress })
      )
    );
    const nodeTxs = [];

    for (const [idx, action] of perNodeActions.entries()) {
      const { nodeClient, nodeAddress, approveAmount, kind, amount, note } =
        action;
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
        nodeTxs.push(tx);
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
        nodeTxs.push(tx);
      } else if (kind === "addStake") {
        const tx = await nodeClient.writeContract({
          address,
          abi,
          functionName: "addStake",
          nonce,
          args: [amount],
        });
        nodeTxs.push(tx);
      }
    }

    if (nodeTxs.length > 0) {
      console.log(`Waiting for ${nodeTxs.length} node tx(s) to be mined...`);
      await Promise.all(
        nodeTxs.map((hash) =>
          publicClient.waitForTransactionReceipt({ hash })
        )
      );
      console.log("Node setup txs mined.");
    }
  } catch (err) {
    console.warn("Node registration step failed:", err.message);
  }

  while (true) {
    await runCycle();
    await sleep(12000);
  }
};

run().catch((error) => {
  console.error("Fatal error in oracle bot system:", error);
  process.exit(1);
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
