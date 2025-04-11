import React from "react";
import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { calculatePositionRatio, getRatioColorClass } from "~~/utils/helpers";

type UserPositionProps = {
  user: string;
  ethPrice: number;
  inputBorrowAmount: number;
};

const RatioChange = ({ user, ethPrice, inputBorrowAmount }: UserPositionProps) => {
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

  const newRatio = calculatePositionRatio(
    Number(formatEther(userCollateral || 0n)),
    borrowedAmount + inputBorrowAmount,
    ethPrice,
  );

  if (inputBorrowAmount <= 0) {
    return null;
  }

  return (
    <div className="text-sm">
      {ratio === "N/A" ? (
        <span className={`${getRatioColorClass(1000)}`}>∞</span>
      ) : (
        <span className={`${getRatioColorClass(ratio)} mx-0`}>{ratio.toFixed(2)}%</span>
      )}{" "}
      → <span className={getRatioColorClass(newRatio)}>{newRatio.toFixed(2)}%</span>
    </div>
  );
};

export default RatioChange;
