import { useMemo } from "react";
import { ConfigSlider } from "./ConfigSlider";
import { NodeRowProps } from "./types";
import { erc20Abi, formatEther } from "viem";
import { useReadContract } from "wagmi";
import { HighlightedCell } from "~~/components/oracle/HighlightedCell";
import { Address } from "~~/components/scaffold-eth";
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
  const { data = [] } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "nodes",
    args: [address],
    watch: true,
  });
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

  const { data: prevBucketAverage } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getPastPrice",
    args: [previousBucket] as any,
  }) as { data: bigint | undefined };

  // Get bucket stats for the selected past bucket (for deviation calculation)
  // Temporarily using any to bypass TypeScript until contract is redeployed
  const { data: selectedBucketStats } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "timeBuckets",
    args: (bucketNumber !== null && bucketNumber !== undefined ? [bucketNumber] : [0n]) as any,
  }) as { data?: [bigint, bigint] };

  const { data: effectiveStake } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getEffectiveStake",
    args: [address],
  }) as { data: bigint | undefined };

  // Get current bucket price
  const { data: currentBucketPrice } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getAddressDataAtBucket",
    args: [address, currentBucket ?? 0n] as const,
    watch: true,
  }) as { data?: [bigint, boolean] };

  const reportedPriceInCurrentBucket = currentBucketPrice?.[0];

  // Past bucket data (always call hook; gate via enabled)
  const isCurrentView = bucketNumber === null || bucketNumber === undefined;

  const { data: addressDataAtBucket } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getAddressDataAtBucket",
    args: [address, (bucketNumber ?? 0n) as any],
    query: { enabled: !isCurrentView },
  }) as { data?: [bigint, boolean] };

  const pastReportedPrice = !isCurrentView && addressDataAtBucket ? addressDataAtBucket[0] : undefined;
  const pastSlashed = !isCurrentView && addressDataAtBucket ? addressDataAtBucket[1] : undefined;

  // Formatting
  const stakedAmountFormatted = effectiveStake !== undefined ? Number(formatEther(effectiveStake)) : "Loading...";
  const lastReportedPriceFormatted =
    reportedPriceInCurrentBucket !== undefined && reportedPriceInCurrentBucket !== 0n
      ? `$${Number(parseFloat(formatEther(reportedPriceInCurrentBucket)).toFixed(2))}`
      : "Not reported";
  const oraBalanceFormatted = oraBalance !== undefined ? Number(formatEther(oraBalance)) : "Loading...";
  const isInsufficientStake =
    effectiveStake !== undefined && minimumStake !== undefined && effectiveStake < (minimumStake as bigint);

  // Calculate deviation for past buckets
  const deviationText = useMemo(() => {
    if (isCurrentView) return "—";
    if (!pastReportedPrice || pastReportedPrice === 0n || !bucketNumber) return "—";
    if (!selectedBucketStats || !selectedBucketStats[0] || !selectedBucketStats[1]) return "—";

    const [countReports, sumPrices] = selectedBucketStats;

    // Exclude this node's price from the average calculation
    const adjustedCount = countReports - 1n;
    const adjustedSum = sumPrices - pastReportedPrice;

    if (adjustedCount === 0n || adjustedSum === 0n) return "—";

    const averageWithoutNode = Number(adjustedSum) / Number(adjustedCount);
    const price = Number(pastReportedPrice);

    if (averageWithoutNode === 0) return "—";
    const pct = ((price - averageWithoutNode) / averageWithoutNode) * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  }, [selectedBucketStats, pastReportedPrice, bucketNumber, isCurrentView]);

  // Deviation for current bucket vs previous bucket average
  const currentDeviationText = useMemo(() => {
    if (!isCurrentView) return "—";
    if (!reportedPriceInCurrentBucket || reportedPriceInCurrentBucket === 0n) return "—";
    if (!prevBucketAverage || prevBucketAverage === 0n) return "—";
    const avg = Number(prevBucketAverage);
    const price = Number(reportedPriceInCurrentBucket);
    if (avg === 0) return "—";
    const pct = ((price - avg) / avg) * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  }, [isCurrentView, reportedPriceInCurrentBucket, prevBucketAverage]);

  return (
    <>
      <tr className={isInsufficientStake ? "opacity-40" : ""}>
        <td>
          <Address address={address} size="sm" format="short" onlyEnsOrAddress={true} />
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
              Ξ {stakedAmountFormatted}
            </HighlightedCell>
            <HighlightedCell value={oraBalanceFormatted} highlightColor="bg-success">
              {oraBalanceFormatted}
            </HighlightedCell>
            <HighlightedCell
              value={lastReportedPriceFormatted}
              highlightColor={getHighlightColorForPrice(
                data && data.length > 0 && typeof data[1] === "bigint" ? data[1] : 0n,
                prevBucketAverage,
              )}
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
                pastSlashed ? "bg-error" : getHighlightColorForPrice(pastReportedPrice, prevBucketAverage)
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
