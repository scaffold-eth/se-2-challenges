import { useMemo } from "react";
import TooltipInfo from "~~/components/TooltipInfo";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { formatEther } from "viem";

export const TotalSlashedWidget = () => {
  const { data: slashedEvents, isLoading } = useScaffoldEventHistory({
    contractName: "StakingOracle",
    eventName: "NodeSlashed",
    watch: true,
  });

  const totalSlashedWei = useMemo(() => {
    if (!slashedEvents) return 0n;
    return slashedEvents.reduce((acc: bigint, current) => {
      const amount = (current?.args?.amount as bigint | undefined) ?? 0n;
      return acc + amount;
    }, 0n);
  }, [slashedEvents]);

  const tooltipText = "Aggregated ETH slashed across all nodes. Sums the amount from every NodeSlashed event.";

  return (
    <div className="flex flex-col gap-2 h-full">
      <h2 className="text-xl font-bold">Total Slashed</h2>
      <div className="bg-base-100 rounded-lg p-4 relative w-full h-full min-h-[140px]">
        <TooltipInfo top={0} right={0} infoText={tooltipText} className="tooltip-left" />
        <div className="flex flex-col gap-1 h-full items-center justify-center">
          {isLoading ? (
            <div className="animate-pulse h-10 bg-secondary rounded-md w-32" />
          ) : (
            <div className="font-bold text-4xl">Ξ {Number(formatEther(totalSlashedWei)).toFixed(4)}</div>
          )}
        </div>
      </div>
    </div>
  );
};


