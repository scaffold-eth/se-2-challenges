import { useEffect, useRef, useState } from "react";
import TooltipInfo from "../TooltipInfo";
import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const getHighlightColor = (oldPrice: bigint | undefined, newPrice: bigint | undefined): string => {
  if (oldPrice === undefined || newPrice === undefined) return "";

  const change = Math.abs(parseFloat(formatEther(newPrice)) - parseFloat(formatEther(oldPrice)));

  if (change < 50) return "bg-success";
  if (change < 100) return "bg-warning";
  return "bg-error";
};

interface PriceWidgetProps {
  contractName: "StakingOracle" | "WhitelistOracle";
}

export const PriceWidget = ({ contractName }: PriceWidgetProps) => {
  const [highlight, setHighlight] = useState(false);
  const [highlightColor, setHighlightColor] = useState("");
  const prevPrice = useRef<bigint | undefined>(undefined);
  const prevBucket = useRef<bigint | null>(null);
  const [showBucketLoading, setShowBucketLoading] = useState(false);

  // Poll getCurrentBucketNumber to detect bucket changes
  const { data: contractBucketNum } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getCurrentBucketNumber",
    watch: true,
  }) as { data: bigint | undefined };

  useEffect(() => {
    if (contractBucketNum !== undefined) {
      // Check if bucket changed
      if (prevBucket.current !== null && contractBucketNum !== prevBucket.current) {
        setShowBucketLoading(true);
        setTimeout(() => setShowBucketLoading(false), 2000); // Show loading for 2 seconds after bucket change
      }
      prevBucket.current = contractBucketNum;
    }
  }, [contractBucketNum]);

  const isStaking = contractName === "StakingOracle";
  const { data: currentPrice, isError } = useScaffoldReadContract({
    contractName,
    functionName: isStaking ? ("getLatestPrice" as any) : ("getPrice" as any),
    watch: true,
  }) as { data: bigint | undefined; isError: boolean; isLoading: boolean };

  useEffect(() => {
    if (currentPrice !== undefined && prevPrice.current !== undefined && currentPrice !== prevPrice.current) {
      setHighlightColor(getHighlightColor(prevPrice.current, currentPrice));
      setHighlight(true);
      setTimeout(() => {
        setHighlight(false);
        setHighlightColor("");
      }, 650);
    }
    prevPrice.current = currentPrice;
  }, [currentPrice]);

  return (
    <div className="flex flex-col gap-2 h-full">
      <h2 className="text-xl font-bold">Current Price</h2>
      <div className="bg-base-100 rounded-lg p-4 w-full flex justify-center items-center relative h-full min-h-[140px]">
        <TooltipInfo
          top={0}
          right={0}
          className="tooltip-left"
          infoText="Displays the median price. If no oracle nodes have reported prices in the last 24 seconds, it will display 'No fresh price'. Color highlighting indicates how big of a change there was in the price."
        />
        <div className={`rounded-lg transition-colors duration-1000 ${highlight ? highlightColor : ""}`}>
          <div className="font-bold h-10 text-4xl flex items-center justify-center gap-4">
            {showBucketLoading ? (
              <div className="animate-pulse">
                <div className="h-10 bg-secondary rounded-md w-32"></div>
              </div>
            ) : isError || currentPrice === undefined || currentPrice === 0n ? (
              <div className="text-error text-xl">No fresh price</div>
            ) : (
              <span>{`$${parseFloat(formatEther(currentPrice)).toFixed(2)}`}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
