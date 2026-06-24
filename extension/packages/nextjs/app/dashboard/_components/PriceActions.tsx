import React from "react";
import TooltipInfo from "./TooltipInfo";
import { useWatchBalance } from "@scaffold-ui/hooks";
import { formatEther, parseEther } from "viem";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { tokenName } from "~~/utils/constant";

const PriceActions = () => {
  const { data: price } = useScaffoldReadContract({
    contractName: "CornDEX",
    functionName: "currentPrice",
  });

  const { data: cornDEXContract } = useDeployedContractInfo({ contractName: "CornDEX" });
  const { data: dexBalance } = useWatchBalance({ address: cornDEXContract?.address });

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "MovePrice" });

  const priceOfOneCORN = price ? parseEther((1 / Number(formatEther(price))).toString()) : undefined; // Fixed parentheses and added toString()
  const renderPrice =
    priceOfOneCORN === undefined ? (
      <div className="mr-1 skeleton w-10 h-4"></div>
    ) : (
      Number(formatEther(priceOfOneCORN)).toFixed(6)
    );
  const renderETHPrice = price ? Number(formatEther(price)).toFixed(2) : <div className="mr-1 skeleton w-10 h-4"></div>;

  const handleClick = async (isIncrease: boolean) => {
    if (price === undefined || !dexBalance) {
      console.error("Price or DEX balance is undefined");
      return;
    }
    // Swap 5% of the DEX's ETH reserve so each click produces a meaningful but bounded price move
    const amount = dexBalance.value / 20n;
    const amountToSell = isIncrease ? amount : -amount * 1000n;

    try {
      await writeContractAsync({
        functionName: "movePrice",
        args: [amountToSell],
      });
    } catch (e) {
      console.error("Error setting the price:", e);
    }
  };

  return (
    <div className="absolute mt-10 right-5 bg-base-100 w-fit border-base-300 border shadow-md">
      <div className="w-[150px] py-5 flex flex-col items-center gap-2 indicator">
        <TooltipInfo top={3} right={3} infoText="Use these controls to simulate price changes" />
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold">{tokenName} Price</span>
        </div>
        <span className="flex items-center text-xs">{renderPrice} ETH</span>
        <span className="flex items-center text-xs">{renderETHPrice} CORN/ETH</span>
        <div className="flex gap-2">
          <button onClick={() => handleClick(false)} className="btn btn-square btn-xs">
            <MinusIcon className="h-3 w-3" />
          </button>
          <button onClick={() => handleClick(true)} className="btn btn-square btn-xs">
            <PlusIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceActions;
