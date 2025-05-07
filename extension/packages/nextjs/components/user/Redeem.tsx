"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { TokenBalance } from "~~/components/user/TokenBalance";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export function Redeem() {
  const [amount, setAmount] = useState<bigint>(BigInt(0));
  const tokenAmount = parseEther((amount || BigInt(0)).toString());

  const { data: prediction, isLoading } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "getPrediction",
  });

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "PredictionMarket",
  });

  if (isLoading)
    return (
      <div className="p-6 border-default">
        <h2 className="text-2xl font-bold text-center mb-4">Redeem Winning Tokens</h2>
        <p className="text-center">Loading prediction market...</p>
      </div>
    );

  if (!prediction)
    return (
      <div className="p-6 border-default">
        <h2 className="text-2xl font-bold text-center mb-4">Redeem Winning Tokens</h2>
        <p className="text-center">No prediction market found</p>
      </div>
    );

  const predictionOutcome1 = prediction[1];
  const predictionOutcome2 = prediction[2];
  const isReported = prediction[7];
  const optionToken1 = prediction[8];
  const winningToken = prediction[10];
  const tokenAddress = winningToken === optionToken1 ? prediction[8] : prediction[9];
  const winningOption = winningToken === optionToken1 ? predictionOutcome1 : predictionOutcome2;

  const handleRedeem = async () => {
    try {
      await writeContractAsync({
        functionName: "redeemWinningTokens",
        args: [tokenAmount],
      });
    } catch (error) {
      console.error("Error redeeming tokens:", error);
    }
  };

  return (
    <div className="p-6 border-default">
      <h2 className="text-2xl font-bold text-center mb-4">Redeem Winning Tokens</h2>
      {isReported && tokenAddress && winningOption && (
        <TokenBalance tokenAddress={tokenAddress as string} option={winningOption as string} redeem={true} />
      )}

      <div className="flex gap-4">
        <input
          type="number"
          placeholder="Amount to redeem"
          className="input input-bordered flex-1 dark:placeholder-white"
          onChange={e => setAmount(BigInt(e.target.value))}
        />
        <button className="btn btn-primary text-lg" onClick={handleRedeem}>
          Redeem Tokens
        </button>
      </div>
    </div>
  );
}
