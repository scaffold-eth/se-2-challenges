import { useEffect, useMemo, useRef } from "react";
import { erc20Abi, formatEther, parseEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { PlusIcon } from "@heroicons/react/24/outline";
import { HighlightedCell } from "~~/components/oracle/HighlightedCell";
import { StakingEditableCell } from "~~/components/oracle/StakingEditableCell";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getHighlightColorForPrice } from "~~/utils/helpers";

type SelfNodeRowProps = {
  isStale: boolean;
  bucketNumber?: bigint | null;
};

export const SelfNodeRow = ({ isStale, bucketNumber }: SelfNodeRowProps) => {
  const { address: connectedAddress } = useAccount();

  const { data: nodeData } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "nodes",
    args: [connectedAddress as any],
    watch: true,
  });
  // OracleNode struct layout: [0]=stakedAmount, [1]=lastReportedBucket, [2]=reportCount, [3]=claimedReportCount, [4]=firstBucket
  const stakedAmount = nodeData?.[0] as bigint | undefined;

  const { data: currentBucket } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getCurrentBucketNumber",
  }) as { data: bigint | undefined };

  const previousBucket = currentBucket && currentBucket > 0n ? currentBucket - 1n : 0n;

  const { data: medianPrice } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getPastPrice",
    args: [previousBucket] as any,
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

  const { data: oraBalance } = useReadContract({
    address: oracleTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: !!oracleTokenAddress && !!connectedAddress, refetchInterval: 5000 },
  });

  const { writeContractAsync: writeStaking } = useScaffoldWriteContract({ contractName: "StakingOracle" });
  const { data: stakingDeployment } = useDeployedContractInfo({ contractName: "StakingOracle" });

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

  const stakedAmountFormatted = effectiveStake !== undefined ? Number(formatEther(effectiveStake)) : "Loading...";
  // Current bucket reported price from contract (align with NodeRow)
  const { data: currentBucketPrice } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getAddressDataAtBucket",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000", currentBucket ?? 0n] as const,
    watch: true,
  }) as { data?: [bigint, boolean] };
  const reportedPriceInCurrentBucket = currentBucketPrice?.[0];
  const hasReportedThisBucket = reportedPriceInCurrentBucket !== undefined && reportedPriceInCurrentBucket !== 0n;
  const lastReportedPriceFormatted =
    reportedPriceInCurrentBucket !== undefined && reportedPriceInCurrentBucket !== 0n
      ? `$${Number(parseFloat(formatEther(reportedPriceInCurrentBucket)).toFixed(2))}`
      : "Not reported";
  const oraBalanceFormatted = oraBalance !== undefined ? Number(formatEther(oraBalance as bigint)) : "Loading...";

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
    if (!medianPrice || medianPrice === 0n) return "—";
    const avg = Number(medianPrice);
    const price = Number(reportedPriceInCurrentBucket);
    if (avg === 0) return "—";
    const pct = ((price - avg) / avg) * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  }, [reportedPriceInCurrentBucket, medianPrice]);

  const isCurrentView = bucketNumber === null || bucketNumber === undefined;

  // For past buckets, fetch the reported price at that bucket
  const { data: pastBucketPrice } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getAddressDataAtBucket",
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
    if (!medianPrice || medianPrice === 0n) return "—";
    const avg = Number(medianPrice);
    const price = Number(pastReportedPrice);
    if (avg === 0) return "—";
    const pct = ((price - avg) / avg) * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  }, [isCurrentView, pastReportedPrice, medianPrice, bucketNumber]);

  const handleAddStake = async () => {
    if (!connectedAddress) return;
    try {
      await writeStaking({ functionName: "addStake", value: parseEther("1") });
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <tr className={isStale ? "opacity-40" : ""}>
      <td>
        {connectedAddress ? <Address address={connectedAddress} size="sm" format="short" onlyEnsOrAddress /> : "—"}
      </td>
      {isCurrentView ? (
        isRegistered ? (
          <>
            <HighlightedCell value={stakedAmountFormatted} highlightColor={stakeHighlightColor}>
              <div className="flex items-center gap-2 h-full items-stretch">
                <span>Ξ {stakedAmountFormatted}</span>
                <button
                  className="px-2 text-sm bg-primary rounded cursor-pointer"
                  onClick={handleAddStake}
                  title="Add 1 ETH"
                >
                  <PlusIcon className="w-2.5 h-2.5" />
                </button>
              </div>
            </HighlightedCell>
            <HighlightedCell value={oraBalanceFormatted} highlightColor="bg-success">
              {oraBalanceFormatted}
            </HighlightedCell>
            <StakingEditableCell
              value={lastReportedPriceFormatted}
              nodeAddress={connectedAddress || "0x0000000000000000000000000000000000000000"}
              highlightColor={getHighlightColorForPrice(reportedPriceInCurrentBucket, medianPrice)}
              className={""}
              canEdit={isRegistered}
              disabled={hasReportedThisBucket}
            />
            <td>{currentDeviationText}</td>
          </>
        ) : (
          <>
            <HighlightedCell value={"—"} highlightColor="">
              Ξ —
            </HighlightedCell>
            <HighlightedCell value={oraBalanceFormatted} highlightColor="bg-success">
              {oraBalanceFormatted}
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
            highlightColor={pastSlashed ? "bg-error" : getHighlightColorForPrice(pastReportedPrice, medianPrice)}
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
