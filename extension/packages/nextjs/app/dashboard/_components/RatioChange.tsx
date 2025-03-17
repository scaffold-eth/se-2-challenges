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
      : calculatePositionRatio(Number(formatEther(userCollateral || 0n)), borrowedAmount, ethPrice).toFixed(1);

  const newRatio = calculatePositionRatio(
    Number(formatEther(userCollateral || 0n)),
    borrowedAmount + inputBorrowAmount,
    ethPrice,
  ).toFixed(1);

  if (inputBorrowAmount <= 0) {
    return null;
  }

  return (
    <div className="text-sm">
      {ratio === "N/A" ? (
        <span className={`${getRatioColorClass(1000)}`}>∞</span>
      ) : (
        <span className={`${getRatioColorClass(ratio)} mx-0`}>{ratio}%</span>
      )}{" "}
      → <span className={getRatioColorClass(newRatio)}>{newRatio}%</span>
    </div>
  );
};

export default RatioChange;
