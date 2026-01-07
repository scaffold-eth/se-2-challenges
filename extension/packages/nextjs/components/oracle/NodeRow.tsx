import { useMemo } from "react";
import { ConfigSlider } from "./ConfigSlider";
import { NodeRowProps } from "./types";
import { Address } from "@scaffold-ui/components";
import { erc20Abi, formatEther } from "viem";
import { useReadContract } from "wagmi";
import { HighlightedCell } from "~~/components/oracle/HighlightedCell";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { getHighlightColorForPrice } from "~~/utils/helpers";

export interface NodeRowEditRequest {
  address: string;
  buttonRect: { top: number; left: number; bottom: number; right: number };
}

interface NodeRowWithEditProps extends NodeRowProps {
  onEditRequest?: (req: NodeRowEditRequest) => void;
  isEditing?: boolean;
  showInlineSettings?: boolean;
}

export const NodeRow = ({ address, bucketNumber, showInlineSettings }: NodeRowWithEditProps) => {
  // Hooks and contract reads
  const { data: oracleTokenAddress } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "oracleToken",
  });
  const { data: oraBalance } = useReadContract({
    address: oracleTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!oracleTokenAddress, refetchInterval: 5000 },
  });
  const { data: minimumStake } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "MINIMUM_STAKE",
    args: undefined,
  });
  const { data: currentBucket } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getCurrentBucketNumber",
  }) as { data: bigint | undefined };

  const previousBucket = useMemo(
    () => (currentBucket && currentBucket > 0n ? currentBucket - 1n : 0n),
    [currentBucket],
  );

  const shouldFetchPrevMedian = currentBucket !== undefined && previousBucket > 0n;

  const { data: prevBucketMedian } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getPastPrice",
    args: [previousBucket] as any,
    query: { enabled: shouldFetchPrevMedian },
  }) as { data: bigint | undefined };

  const { data: effectiveStake } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getEffectiveStake",
    args: [address],
  }) as { data: bigint | undefined };

  // Get current bucket price
  const { data: currentBucketPrice } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getSlashedStatus",
    args: [address, currentBucket ?? 0n] as const,
    watch: true,
  }) as { data?: [bigint, boolean] };

  const reportedPriceInCurrentBucket = currentBucketPrice?.[0];

  // Past bucket data (always call hook; gate via enabled)
  const isCurrentView = bucketNumber === null || bucketNumber === undefined;

  const { data: addressDataAtBucket } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getSlashedStatus",
    args: [address, (bucketNumber ?? 0n) as any],
    query: { enabled: !isCurrentView },
  }) as { data?: [bigint, boolean] };

  const pastReportedPrice = !isCurrentView && addressDataAtBucket ? addressDataAtBucket[0] : undefined;
  const pastSlashed = !isCurrentView && addressDataAtBucket ? addressDataAtBucket[1] : undefined;

  const { data: selectedBucketMedian } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getPastPrice",
    args: [bucketNumber ?? 0n] as any,
    query: {
      enabled: !isCurrentView && bucketNumber !== null && bucketNumber !== undefined && (bucketNumber as bigint) > 0n,
    },
  }) as { data: bigint | undefined };

  // Formatting
  const stakedAmountFormatted =
    effectiveStake !== undefined
      ? Number(formatEther(effectiveStake)).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "Loading...";
  const lastReportedPriceFormatted =
    reportedPriceInCurrentBucket !== undefined && reportedPriceInCurrentBucket !== 0n
      ? `$${Number(parseFloat(formatEther(reportedPriceInCurrentBucket)).toFixed(2))}`
      : "Not reported";
  const oraBalanceFormatted =
    oraBalance !== undefined
      ? Number(formatEther(oraBalance as bigint)).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "Loading...";
  const isInsufficientStake =
    effectiveStake !== undefined && minimumStake !== undefined && effectiveStake < (minimumStake as bigint);

  // Calculate deviation for past buckets
  const deviationText = useMemo(() => {
    if (isCurrentView) return "—";
    if (!pastReportedPrice || pastReportedPrice === 0n) return "—";
    if (!selectedBucketMedian || selectedBucketMedian === 0n) return "—";
    const median = Number(formatEther(selectedBucketMedian));
    const price = Number(formatEther(pastReportedPrice));
    if (!Number.isFinite(median) || median === 0) return "—";
    const pct = ((price - median) / median) * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  }, [isCurrentView, pastReportedPrice, selectedBucketMedian]);

  // Deviation for current bucket vs previous bucket average
  const currentDeviationText = useMemo(() => {
    if (!isCurrentView) return "—";
    if (!reportedPriceInCurrentBucket || reportedPriceInCurrentBucket === 0n) return "—";
    if (!prevBucketMedian || prevBucketMedian === 0n) return "—";
    const avg = Number(formatEther(prevBucketMedian));
    const price = Number(formatEther(reportedPriceInCurrentBucket));
    if (!Number.isFinite(avg) || avg === 0) return "—";
    const pct = ((price - avg) / avg) * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  }, [isCurrentView, reportedPriceInCurrentBucket, prevBucketMedian]);

  return (
    <>
      <tr className={isInsufficientStake ? "opacity-40" : ""}>
        <td>
          <div className="flex flex-col">
            <Address address={address} size="sm" format="short" onlyEnsOrAddress={true} />
            <span className="text-xs opacity-70">{oraBalanceFormatted} ORA</span>
          </div>
        </td>
        {showInlineSettings ? (
          // Inline settings mode: only show the settings sliders column
          <td className="whitespace-nowrap">
            <div className="flex flex-col gap-2 min-w-[220px]">
              <div className="flex items-center gap-2">
                <ConfigSlider nodeAddress={address.toLowerCase()} endpoint="skip-probability" label="skip rate" />
                <ConfigSlider nodeAddress={address.toLowerCase()} endpoint="price-variance" label="price deviation" />
              </div>
            </div>
          </td>
        ) : isCurrentView ? (
          <>
            <HighlightedCell value={stakedAmountFormatted} highlightColor="bg-error">
              {stakedAmountFormatted}
            </HighlightedCell>
            <HighlightedCell value={oraBalanceFormatted} highlightColor="bg-success">
              {oraBalanceFormatted}
            </HighlightedCell>
            <HighlightedCell
              value={lastReportedPriceFormatted}
              highlightColor={getHighlightColorForPrice(reportedPriceInCurrentBucket, prevBucketMedian)}
              className={""}
            >
              {lastReportedPriceFormatted}
            </HighlightedCell>
            <td>{currentDeviationText}</td>
          </>
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
            <td>{deviationText}</td>
          </>
        )}
      </tr>
      {/* No inline editor row; editor is rendered by parent as floating panel */}
    </>
  );
};
