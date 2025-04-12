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
    contractName: "Lending",
    functionName: "s_userCollateral",
    args: [user],
  });

  const { data: userBorrowed } = useScaffoldReadContract({
    contractName: "Lending",
    functionName: "s_userBorrowed",
    args: [user],
  });

  const borrowedAmount = Number(formatEther(userBorrowed || 0n));
  const ratio =
    borrowedAmount === 0
      ? "N/A"
      : calculatePositionRatio(Number(formatEther(userCollateral || 0n)), borrowedAmount, ethPrice);

  const getNewRatio = (borrowedAmount: number, inputAmount: number) => {
    const newBorrowAmount = borrowedAmount + inputAmount;
    if (newBorrowAmount < 0) {
      return <span className={getRatioColorClass(1)}>N/A</span>;
    } else if (newBorrowAmount === 0) {
      return <span className={getRatioColorClass(1000)}>∞</span>;
    }
    const newRatio = calculatePositionRatio(Number(formatEther(userCollateral || 0n)), newBorrowAmount, ethPrice);
    return <span className={getRatioColorClass(newRatio)}>{newRatio.toFixed(2)}%</span>;
  };

  if (inputAmount === 0 || isNaN(inputAmount)) {
    return null;
  }

  return (
    <div className="text-sm">
      {ratio === "N/A" ? (
        <span className={`${getRatioColorClass(1000)}`}>∞</span>
      ) : (
        <span className={`${getRatioColorClass(ratio)} mx-0`}>{ratio.toFixed(2)}%</span>
      )}{" "}
      → {getNewRatio(borrowedAmount, inputAmount)}
    </div>
  );
};

export default RatioChange;
