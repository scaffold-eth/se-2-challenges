import React from "react";
import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { calculatePositionRatio, getRatioColorClass } from "~~/utils/helpers";

type UserPositionProps = {
  user: string;
  ethPrice: number;
  inputAmount: number;
};

const RatioChange = ({ user, ethPrice, inputAmount }: UserPositionProps) => {
  const { data: userCollateral } = useScaffoldReadContract({
    contractName: "MyUSDEngine",
    functionName: "s_userCollateral",
    args: [user],
  });

  const { data: userMinted } = useScaffoldReadContract({
    contractName: "MyUSDEngine",
    functionName: "getCurrentDebtValue",
    args: [user],
  });

  const mintedAmount = Number(formatEther(userMinted || 0n));
  const ratio =
    mintedAmount === 0
      ? "N/A"
      : calculatePositionRatio(Number(formatEther(userCollateral || 0n)), mintedAmount, ethPrice);

  const getNewRatio = (mintedAmount: number, inputAmount: number) => {
    const newMintedAmount = mintedAmount + inputAmount;
    if (newMintedAmount < 0) {
      return <span className={getRatioColorClass(1)}>N/A</span>;
    } else if (newMintedAmount === 0) {
      return <span className={getRatioColorClass(1000)}>∞</span>;
    }
    const newRatio = calculatePositionRatio(Number(formatEther(userCollateral || 0n)), newMintedAmount, ethPrice);
    return <span className={getRatioColorClass(newRatio)}>{newRatio > 9999 ? ">9999" : newRatio.toFixed(2)}%</span>;
  };

  if (inputAmount === 0 || isNaN(inputAmount)) {
    return null;
  }

  return (
    <div className="text-sm">
      {ratio === "N/A" ? (
        <span className={`${getRatioColorClass(1000)}`}>∞</span>
      ) : (
        <span className={`${getRatioColorClass(ratio)} mx-0`}>{ratio > 9999 ? ">9999" : ratio.toFixed(2)}%</span>
      )}{" "}
      → {getNewRatio(mintedAmount, inputAmount)}
    </div>
  );
};

export default RatioChange;
