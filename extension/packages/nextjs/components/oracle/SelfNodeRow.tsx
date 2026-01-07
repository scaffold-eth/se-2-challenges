import { useEffect, useMemo, useRef } from "react";
import { Address } from "@scaffold-ui/components";
import { erc20Abi, formatEther, maxUint256, parseEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { PlusIcon } from "@heroicons/react/24/outline";
import { HighlightedCell } from "~~/components/oracle/HighlightedCell";
import { StakingEditableCell } from "~~/components/oracle/StakingEditableCell";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getHighlightColorForPrice } from "~~/utils/helpers";

type SelfNodeRowProps = {
  isStale: boolean;
  bucketNumber?: bigint | null;
};

export const SelfNodeRow = ({ isStale, bucketNumber }: SelfNodeRowProps) => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();

  const { data: nodeData } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "nodes",
    args: [connectedAddress as any],
    watch: true,
  });
  // OracleNode struct layout: [0]=stakedAmount, [1]=lastReportedBucket, [2]=reportCount, [3]=claimedReportCount, [4]=firstBucket
  const stakedAmount = nodeData?.[0] as bigint | undefined;
  const claimedReportCount = nodeData?.[3] as bigint | undefined;

  const { data: currentBucket } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getCurrentBucketNumber",
  }) as { data: bigint | undefined };

  const previousBucket = currentBucket && currentBucket > 0n ? currentBucket - 1n : 0n;
  const shouldFetchPreviousMedian = currentBucket !== undefined && previousBucket > 0n;

  const { data: previousMedian } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getPastPrice",
    args: [previousBucket] as any,
    query: { enabled: shouldFetchPreviousMedian },
  }) as { data: bigint | undefined };

  const { data: oracleTokenAddress } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "oracleToken",
  });

  // Registered addresses array; authoritative for current membership
  const { data: allNodeAddresses } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getNodeAddresses",
    watch: true,
  }) as { data: string[] | undefined };

  const { data: rewardPerReport } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "REWARD_PER_REPORT",
  }) as { data: bigint | undefined };

  const { data: oraBalance } = useReadContract({
    address: oracleTokenAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: !!oracleTokenAddress && !!connectedAddress, refetchInterval: 5000 },
  }) as { data: bigint | undefined };

  const oraBalanceFormatted = useMemo(() => {
    if (oraBalance === undefined) return "—";
    return Number(formatEther(oraBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }, [oraBalance]);

  const { writeContractAsync: writeStaking } = useScaffoldWriteContract({ contractName: "StakingOracle" });
  const { data: stakingDeployment } = useDeployedContractInfo({ contractName: "StakingOracle" });
  const { writeContractAsync: writeErc20 } = useWriteContract();
  const stakingAddress = stakingDeployment?.address as `0x${string}` | undefined;

  const isRegistered = useMemo(() => {
    if (!connectedAddress) return false;
    if (!allNodeAddresses) return false;
    return allNodeAddresses.some(a => a?.toLowerCase() === connectedAddress.toLowerCase());
  }, [allNodeAddresses, connectedAddress]);

  // Use wagmi's useReadContract for enabled gating to avoid reverts when not registered
  const { data: effectiveStake } = useReadContract({
    address: (stakingDeployment?.address as `0x${string}`) || undefined,
    abi: (stakingDeployment?.abi as any) || undefined,
    functionName: "getEffectiveStake",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: !!stakingDeployment?.address && !!connectedAddress && isRegistered, refetchInterval: 5000 },
  }) as { data: bigint | undefined };

  const stakedAmountFormatted =
    effectiveStake !== undefined
      ? Number(formatEther(effectiveStake)).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "Loading...";
  // Current bucket reported price from contract (align with NodeRow)
  const { data: currentBucketPrice } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getSlashedStatus",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000", currentBucket ?? 0n] as const,
    watch: true,
  }) as { data?: [bigint, boolean] };
  const reportedPriceInCurrentBucket = currentBucketPrice?.[0];
  const hasReportedThisBucket = reportedPriceInCurrentBucket !== undefined && reportedPriceInCurrentBucket !== 0n;
  const lastReportedPriceFormatted =
    reportedPriceInCurrentBucket !== undefined && reportedPriceInCurrentBucket !== 0n
      ? `$${Number(parseFloat(formatEther(reportedPriceInCurrentBucket)).toFixed(2))}`
      : "Not reported";

  const claimedRewardsFormatted = useMemo(() => {
    const rpr = rewardPerReport ?? parseEther("1");
    const claimed = (claimedReportCount ?? 0n) * rpr;
    const wholeOra = claimed / 10n ** 18n;
    return new Intl.NumberFormat("en-US").format(wholeOra);
  }, [claimedReportCount, rewardPerReport]);

  // Track previous staked amount to determine up/down changes for highlight
  const prevStakedAmountRef = useRef<bigint | undefined>(undefined);
  const prevStakedAmount = prevStakedAmountRef.current;
  let stakeHighlightColor = "";
  if (prevStakedAmount !== undefined && stakedAmount !== undefined && stakedAmount !== prevStakedAmount) {
    stakeHighlightColor = stakedAmount > prevStakedAmount ? "bg-success" : "bg-error";
  }
  useEffect(() => {
    prevStakedAmountRef.current = stakedAmount;
  }, [stakedAmount]);

  // Deviation for current bucket vs previous bucket average
  const currentDeviationText = useMemo(() => {
    if (!reportedPriceInCurrentBucket || reportedPriceInCurrentBucket === 0n) return "—";
    if (!previousMedian || previousMedian === 0n) return "—";
    const avg = Number(formatEther(previousMedian));
    const price = Number(formatEther(reportedPriceInCurrentBucket));
    if (!Number.isFinite(avg) || avg === 0) return "—";
    const pct = ((price - avg) / avg) * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  }, [reportedPriceInCurrentBucket, previousMedian]);

  const isCurrentView = bucketNumber === null || bucketNumber === undefined;

  // For past buckets, fetch the reported price at that bucket
  const { data: selectedBucketMedian } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getPastPrice",
    args: [bucketNumber ?? 0n] as any,
    query: {
      enabled: !isCurrentView && bucketNumber !== null && bucketNumber !== undefined && (bucketNumber as bigint) > 0n,
    },
  }) as { data: bigint | undefined };

  const { data: pastBucketPrice } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getSlashedStatus",
    args: [
      connectedAddress || "0x0000000000000000000000000000000000000000",
      !isCurrentView && bucketNumber ? bucketNumber : 0n,
    ] as const,
    watch: true,
  }) as { data?: [bigint, boolean] };

  const pastReportedPrice = !isCurrentView && pastBucketPrice ? pastBucketPrice[0] : undefined;
  const pastSlashed = !isCurrentView && pastBucketPrice ? pastBucketPrice[1] : undefined;

  // Calculate deviation for past bucket
  const pastDeviationText = useMemo(() => {
    if (isCurrentView) return "—";
    if (!pastReportedPrice || pastReportedPrice === 0n || !bucketNumber) return "—";
    if (!selectedBucketMedian || selectedBucketMedian === 0n) return "—";
    const avg = Number(formatEther(selectedBucketMedian));
    const price = Number(formatEther(pastReportedPrice));
    if (!Number.isFinite(avg) || avg === 0) return "—";
    const pct = ((price - avg) / avg) * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  }, [isCurrentView, pastReportedPrice, selectedBucketMedian, bucketNumber]);

  const handleAddStake = async () => {
    if (!connectedAddress || !oracleTokenAddress || !stakingAddress || !publicClient) return;
    const additionalStake = parseEther("100");
    try {
      // Approve max so user doesn't need to re-approve each time
      const approveHash = await writeErc20({
        address: oracleTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [stakingAddress, maxUint256],
      });
      // Wait for approval to be mined before calling addStake
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      await writeStaking({ functionName: "addStake", args: [additionalStake] });
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <tr className={isStale ? "opacity-40" : ""}>
      <td>
        <div className="flex flex-col gap-0.5">
          {connectedAddress ? <Address address={connectedAddress} size="sm" format="short" onlyEnsOrAddress /> : "—"}
          <span className="text-xs opacity-70" title="Your ORA wallet balance">
            {oraBalanceFormatted} ORA
          </span>
        </div>
      </td>
      {isCurrentView ? (
        isRegistered ? (
          <>
            <HighlightedCell value={stakedAmountFormatted} highlightColor={stakeHighlightColor}>
              <div className="flex items-center gap-2 h-full items-stretch">
                <span>{stakedAmountFormatted}</span>
                <button
                  className="px-2 text-sm bg-primary rounded cursor-pointer"
                  onClick={handleAddStake}
                  title="Add 1000 ORA"
                >
                  <PlusIcon className="w-2.5 h-2.5" />
                </button>
              </div>
            </HighlightedCell>
            <HighlightedCell value={claimedRewardsFormatted} highlightColor="bg-success">
              {claimedRewardsFormatted}
            </HighlightedCell>
            <StakingEditableCell
              value={lastReportedPriceFormatted}
              nodeAddress={connectedAddress || "0x0000000000000000000000000000000000000000"}
              highlightColor={getHighlightColorForPrice(reportedPriceInCurrentBucket, previousMedian)}
              className={""}
              canEdit={isRegistered}
              disabled={hasReportedThisBucket}
            />
            <td>{currentDeviationText}</td>
          </>
        ) : (
          <>
            <HighlightedCell value={"—"} highlightColor="">
              —
            </HighlightedCell>
            <HighlightedCell value={claimedRewardsFormatted} highlightColor="bg-success">
              {claimedRewardsFormatted}
            </HighlightedCell>
            <StakingEditableCell
              value={"Must re-register"}
              nodeAddress={connectedAddress || "0x0000000000000000000000000000000000000000"}
              highlightColor={""}
              className={""}
              canEdit={false}
            />
            <td>—</td>
          </>
        )
      ) : (
        <>
          <HighlightedCell
            value={
              pastReportedPrice !== undefined && pastReportedPrice !== 0n
                ? `$${Number(parseFloat(formatEther(pastReportedPrice)).toFixed(2))}`
                : "Not reported"
            }
            highlightColor={
              pastSlashed ? "bg-error" : getHighlightColorForPrice(pastReportedPrice, selectedBucketMedian)
            }
            className={pastSlashed ? "border-2 border-error" : ""}
          >
            {pastReportedPrice !== undefined && pastReportedPrice !== 0n
              ? `$${Number(parseFloat(formatEther(pastReportedPrice)).toFixed(2))}`
              : "Not reported"}
            {pastSlashed && <span className="ml-2 text-xs text-error">Slashed</span>}
          </HighlightedCell>
          <td>{pastDeviationText}</td>
        </>
      )}
    </tr>
  );
};
