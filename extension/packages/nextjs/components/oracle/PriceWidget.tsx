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

  const {
    data: currentPrice,
    isLoading,
    isError,
  } = useScaffoldReadContract({
    contractName,
    functionName: "getPrice",
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
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-bold">Current Price</h2>
      <div className="bg-base-100 rounded-lg p-4 w-1/2 md:w-1/4 mx-auto flex justify-center items-center relative">
        <TooltipInfo
          top={0}
          right={0}
          infoText="Displays the median price. If no oracle nodes have reported prices in the last 10 seconds, it will display 'No fresh price'. Color highlighting indicates how big of a change there was in the price."
        />
        <div className={`rounded-lg transition-colors duration-1000 ${highlight ? highlightColor : ""}`}>
          <div className="font-bold h-10 text-4xl flex items-center justify-center">
            {isError ? (
              <div className="text-error text-xl">No fresh price</div>
            ) : isLoading || currentPrice === undefined ? (
              <div className="animate-pulse">
                <div className="h-10 bg-secondary rounded-md w-32"></div>
              </div>
            ) : (
              `$${parseFloat(formatEther(currentPrice)).toFixed(2)}`
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
