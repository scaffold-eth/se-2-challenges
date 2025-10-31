import React, { useEffect, useMemo, useRef, useState } from "react";
import TooltipInfo from "../TooltipInfo";
import { ConfigSlider } from "./ConfigSlider";
import { NodeRow, NodeRowEditRequest } from "./NodeRow";
import { SelfNodeRow } from "./SelfNodeRow";
import { parseEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import {
  useDeployedContractInfo,
  useScaffoldEventHistory,
  useScaffoldReadContract,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";

const LoadingRow = ({ colCount = 5 }: { colCount?: number }) => (
  <tr>
    <td colSpan={colCount} className="animate-pulse">
      <div className="h-8 bg-secondary rounded w-full" />
    </td>
  </tr>
);
const NoNodesRow = ({ colSpan = 5 }: { colSpan?: number }) => (
  <tr>
    <td colSpan={colSpan} className="text-center">
      No nodes found
    </td>
  </tr>
);

const SlashAllButton = ({ selectedBucket }: { selectedBucket: bigint }) => {
  const publicClient = usePublicClient();
  const { data: stakingDeployment } = useDeployedContractInfo({ contractName: "StakingOracle" });
  const { writeContractAsync: writeStakingOracle } = useScaffoldWriteContract({ contractName: "StakingOracle" });
  const { data: outliers } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getOutlierNodes",
    args: [selectedBucket] as any,
    watch: true,
  }) as { data: string[] | undefined };
  const { data: nodeAddresses } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getNodeAddresses",
    watch: true,
  }) as { data: string[] | undefined };

  const [unslashed, setUnslashed] = React.useState<string[]>([]);

  React.useEffect(() => {
    const check = async () => {
      if (!outliers || !publicClient || !stakingDeployment) {
        setUnslashed([]);
        return;
      }
      const list: string[] = [];
      for (const addr of outliers) {
        try {
          const [, isSlashed] = (await publicClient.readContract({
            address: stakingDeployment.address as `0x${string}`,
            abi: stakingDeployment.abi as any,
            functionName: "getAddressDataAtBucket",
            args: [addr, selectedBucket],
          })) as [bigint, boolean];
          if (!isSlashed) list.push(addr);
        } catch {
          // assume not slashed on read error
          list.push(addr);
        }
      }
      setUnslashed(list);
    };
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, [outliers, selectedBucket, publicClient, stakingDeployment]);

  const handleSlashAll = async () => {
    if (!unslashed.length || !nodeAddresses) return;
    try {
      for (const addr of unslashed) {
        const idx = nodeAddresses.findIndex(a => a?.toLowerCase() === addr.toLowerCase());
        if (idx === -1) continue;
        try {
          await writeStakingOracle({
            functionName: "slashNode",
            args: [addr as `0x${string}`, selectedBucket, BigInt(idx)],
          });
        } catch {
          // continue slashing the rest
        }
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <button
      className="btn btn-error btn-sm mr-2"
      onClick={handleSlashAll}
      disabled={unslashed.length === 0}
      title={unslashed.length ? `Slash ${unslashed.length} outlier node(s)` : "No slashable nodes"}
    >
      Slash{unslashed.length ? ` (${unslashed.length})` : ""}
    </button>
  );
};

export const NodesTable = ({
  selectedBucket: externalSelectedBucket,
  onBucketChange,
}: {
  selectedBucket?: bigint | "current";
  onBucketChange?: (bucket: bigint | "current") => void;
} = {}) => {
  const [editingNode, setEditingNode] = useState<{ address: string; pos: { top: number; left: number } } | null>(null);
  const [showInlineSettings, setShowInlineSettings] = useState(false);
  const handleEditRequest = (req: NodeRowEditRequest) => {
    setEditingNode({ address: req.address, pos: { top: req.buttonRect.bottom + 8, left: req.buttonRect.left } });
  };
  const handleCloseEditor = () => setEditingNode(null);
  const { address: connectedAddress } = useAccount();
  const { data: currentBucketData } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getCurrentBucketNumber",
  }) as { data: bigint | undefined };
  const currentBucket = currentBucketData ?? undefined;
  const [internalSelectedBucket, setInternalSelectedBucket] = useState<bigint | "current">("current");
  const selectedBucket = externalSelectedBucket ?? internalSelectedBucket;
  const setSelectedBucket = (bucket: bigint | "current") => {
    setInternalSelectedBucket(bucket);
    onBucketChange?.(bucket);
  };
  const [animateDir, setAnimateDir] = useState<"left" | "right" | null>(null);
  const [animateKey, setAnimateKey] = useState(0);
  const [entering, setEntering] = useState(true);
  const lastCurrentBucketRef = useRef<bigint | null>(null);
  const { data: registeredEvents, isLoading: isLoadingRegistered } = useScaffoldEventHistory({
    contractName: "StakingOracle",
    eventName: "NodeRegistered",
    watch: true,
  });
  const { data: exitedEvents, isLoading: isLoadingExited } = useScaffoldEventHistory({
    contractName: "StakingOracle",
    eventName: "NodeExited",
    watch: true,
  });
  const eventDerivedNodeAddresses: string[] = (() => {
    const set = new Set<string>();
    (registeredEvents || []).forEach(ev => {
      const addr = (ev?.args?.node as string | undefined)?.toLowerCase();
      if (addr) set.add(addr);
    });
    (exitedEvents || []).forEach(ev => {
      const addr = (ev?.args?.node as string | undefined)?.toLowerCase();
      if (addr) set.delete(addr);
    });
    return Array.from(set.values());
  })();
  const hasEverRegisteredSelf = useMemo(() => {
    if (!connectedAddress) return false;
    const lower = connectedAddress.toLowerCase();
    return (registeredEvents || []).some(ev => {
      const addr = (ev?.args?.node as string | undefined)?.toLowerCase();
      return addr === lower;
    });
  }, [registeredEvents, connectedAddress]);
  useEffect(() => {
    if (currentBucket === undefined) return;
    const last = lastCurrentBucketRef.current;
    // In inline settings mode, keep the UI stable (no animation on bucket changes)
    if (showInlineSettings) {
      lastCurrentBucketRef.current = currentBucket;
      return;
    }
    if (last !== null && currentBucket > last) {
      if (selectedBucket === "current") {
        setAnimateDir("left");
        setAnimateKey(k => k + 1);
        setEntering(false);
        setTimeout(() => setEntering(true), 20);
      }
    }
    lastCurrentBucketRef.current = currentBucket;
  }, [currentBucket, selectedBucket, showInlineSettings]);
  const changeBucketWithAnimation = (newBucket: bigint | "current", dir: "left" | "right") => {
    setAnimateDir(dir);
    setAnimateKey(k => k + 1);
    setEntering(false);
    setSelectedBucket(newBucket);
    setTimeout(() => setEntering(true), 20);
  };
  const triggerSlide = (dir: "left" | "right") => {
    setAnimateDir(dir);
    setAnimateKey(k => k + 1);
    setEntering(false);
    setTimeout(() => setEntering(true), 20);
  };
  const tooltipText =
    "This table displays registered oracle nodes that provide price data to the system. Nodes are displayed as inactive if they don't have enough ETH staked. You can edit the skip probability and price variance of an oracle node with the slider.";
  const { writeContractAsync: writeStakingOracle } = useScaffoldWriteContract({ contractName: "StakingOracle" });
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const { data: nodeAddresses } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getNodeAddresses",
    watch: true,
  });
  const isSelfRegistered = Boolean(
    (nodeAddresses as string[] | undefined)?.some(
      addr => addr?.toLowerCase() === (connectedAddress || "").toLowerCase(),
    ),
  );
  const handleRegisterSelf = async () => {
    if (!connectedAddress) return;
    try {
      const initialPrice = nativeCurrencyPrice > 0 ? parseEther(nativeCurrencyPrice.toString()) : 0n;
      await writeStakingOracle({ functionName: "registerNode", args: [initialPrice], value: parseEther("1") });
    } catch (e: any) {
      console.error(e);
    }
  };
  const handleClaimRewards = async () => {
    if (!connectedAddress) return;
    try {
      await writeStakingOracle({ functionName: "claimReward" });
    } catch (e: any) {
      console.error(e);
    }
  };
  const handleExitNode = async () => {
    if (!connectedAddress) return;
    if (!isSelfRegistered) return;
    if (!nodeAddresses) return;
    const list = nodeAddresses as string[];
    const idx = list.findIndex(addr => addr?.toLowerCase() === connectedAddress.toLowerCase());
    if (idx === -1) return;
    try {
      await writeStakingOracle({ functionName: "exitNode", args: [BigInt(idx)] });
    } catch (e: any) {
      console.error(e);
    }
  };
  const filteredNodeAddresses = (eventDerivedNodeAddresses || []).filter(
    (addr: string) => addr?.toLowerCase() !== (connectedAddress || "").toLowerCase(),
  );
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Oracle Nodes</h2>
            <span>
              <TooltipInfo infoText={tooltipText} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {/* Slash button near navigation (left of left arrow) */}
              {selectedBucket !== "current" && <SlashAllButton selectedBucket={selectedBucket as bigint} />}
              {/* Previous (<) */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (selectedBucket === "current" && currentBucket && currentBucket > 1n) {
                    changeBucketWithAnimation(currentBucket - 1n, "right");
                  } else if (typeof selectedBucket === "bigint" && selectedBucket > 1n) {
                    changeBucketWithAnimation(selectedBucket - 1n, "right");
                  }
                }}
                disabled={selectedBucket === "current" ? !currentBucket || currentBucket <= 1n : selectedBucket <= 1n}
                title="Previous bucket"
              >
                ←
              </button>

              {/* Current selected bucket label (non-clickable) */}
              <span className="px-2 text-sm tabular-nums select-none">
                {selectedBucket === "current"
                  ? currentBucket !== undefined
                    ? currentBucket.toString()
                    : "..."
                  : (selectedBucket as bigint).toString()}
              </span>

              {/* Next (>) */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (selectedBucket === "current") return;
                  if (typeof selectedBucket === "bigint" && currentBucket && selectedBucket < currentBucket - 1n) {
                    changeBucketWithAnimation(selectedBucket + 1n, "left");
                  } else if (
                    typeof selectedBucket === "bigint" &&
                    currentBucket &&
                    selectedBucket === currentBucket - 1n
                  ) {
                    changeBucketWithAnimation("current", "left");
                  }
                }}
                disabled={
                  selectedBucket === "current" ||
                  currentBucket === undefined ||
                  (typeof selectedBucket === "bigint" && selectedBucket >= currentBucket)
                }
                title="Next bucket"
              >
                →
              </button>

              {/* Go to Current button */}
              <button
                className="btn btn-ghost btn-sm ml-2"
                onClick={() => {
                  const dir: "left" | "right" = showInlineSettings ? "right" : "left";
                  if (showInlineSettings) setShowInlineSettings(false);
                  changeBucketWithAnimation("current", dir);
                }}
                disabled={showInlineSettings ? false : selectedBucket === "current"}
                title="Go to current bucket"
              >
                Go to Current
              </button>

              {/* Inline settings toggle */}
              <button
                className={`btn btn-ghost btn-sm ml-1 ${showInlineSettings ? "text-primary" : ""}`}
                onClick={() => {
                  if (!showInlineSettings) {
                    // Opening settings: slide left
                    triggerSlide("left");
                  } else {
                    // Closing settings: slide right for a natural return
                    triggerSlide("right");
                  }
                  setShowInlineSettings(v => !v);
                }}
                title={showInlineSettings ? "Hide inline settings" : "Show inline settings"}
              >
                <Cog6ToothIcon className="w-4 h-4" />
              </button>
            </div>
            {connectedAddress && !isSelfRegistered ? (
              <button className="btn btn-primary btn-sm font-normal" onClick={handleRegisterSelf}>
                Register Node (1 ETH)
              </button>
            ) : (
              <>
                <button
                  className="btn btn-primary btn-sm font-normal"
                  onClick={handleClaimRewards}
                  disabled={!isSelfRegistered}
                >
                  Claim Rewards
                </button>
                <button
                  className="btn btn-error btn-sm font-normal"
                  onClick={handleExitNode}
                  disabled={!isSelfRegistered}
                >
                  Exit Node
                </button>
              </>
            )}
          </div>
        </div>
        <div className="bg-base-100 rounded-lg p-4 relative">
          <div className="overflow-x-auto">
            <div
              key={animateKey}
              className={`transform transition-transform duration-300 ${
                entering ? "translate-x-0" : animateDir === "left" ? "translate-x-full" : "-translate-x-full"
              }`}
            >
              <table className="table w-full">
                <thead>
                  <tr>
                    {showInlineSettings ? (
                      <>
                        <th>Node Address</th>
                        <th>Node Settings</th>
                      </>
                    ) : selectedBucket === "current" ? (
                      <>
                        <th>Node Address</th>
                        <th>Stake</th>
                        <th>ORA</th>
                        <th>Reported Price</th>
                        <th>
                          <div className="flex items-center gap-1">
                            Deviation
                            <TooltipInfo
                              className="tooltip-left"
                              infoText="Percentage difference from the average of all other reported prices"
                            />
                          </div>
                        </th>
                      </>
                    ) : (
                      <>
                        <th>Node Address</th>
                        <th>Reported Price</th>
                        <th>
                          <div className="flex items-center gap-1">
                            Deviation
                            <TooltipInfo
                              className="tooltip-left"
                              infoText="Percentage difference from the average of all other reported prices"
                            />
                          </div>
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {!showInlineSettings && (
                    <>
                      {selectedBucket === "current" ? (
                        isSelfRegistered || hasEverRegisteredSelf ? (
                          <SelfNodeRow isStale={false} bucketNumber={null} />
                        ) : null
                      ) : isSelfRegistered || hasEverRegisteredSelf ? (
                        <SelfNodeRow isStale={false} bucketNumber={selectedBucket as bigint} />
                      ) : null}
                      {isSelfRegistered && (
                        <tr>
                          <td colSpan={9} className="py-2">
                            <div className="text-center text-xs uppercase tracking-wider">Simulation Script Nodes</div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                  {isLoadingRegistered || isLoadingExited ? (
                    <LoadingRow colCount={showInlineSettings ? 2 : selectedBucket === "current" ? 5 : 4} />
                  ) : filteredNodeAddresses.length === 0 ? (
                    <NoNodesRow colSpan={showInlineSettings ? 2 : selectedBucket === "current" ? 5 : 4} />
                  ) : (
                    filteredNodeAddresses.map((address: string, index: number) => (
                      <NodeRow
                        key={index}
                        index={index}
                        address={address}
                        bucketNumber={selectedBucket === "current" ? null : (selectedBucket as bigint)}
                        onEditRequest={
                          !showInlineSettings && selectedBucket === "current" ? handleEditRequest : undefined
                        }
                        showInlineSettings={showInlineSettings}
                        isEditing={editingNode?.address === address}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {editingNode && (
        <div
          style={{ position: "fixed", top: editingNode.pos.top, left: editingNode.pos.left, zIndex: 60, minWidth: 220 }}
          className="mt-2 p-3 bg-base-200 rounded shadow-lg border"
        >
          <div className="flex flex-col gap-2">
            <ConfigSlider
              nodeAddress={editingNode.address.toLowerCase()}
              endpoint="skip-probability"
              label="skip rate"
            />
            <ConfigSlider nodeAddress={editingNode.address.toLowerCase()} endpoint="price-variance" label="variance" />
            <div className="flex justify-end">
              <button className="btn btn-sm btn-ghost" onClick={handleCloseEditor}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
