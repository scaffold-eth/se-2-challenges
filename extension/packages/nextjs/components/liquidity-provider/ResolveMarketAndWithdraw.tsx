"use client";

import { useAccount } from "wagmi";
import { LPFinalTokenBalance } from "~~/components/liquidity-provider/LPFinalTokenBalance";
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export function ResolveMarketAndWithdraw() {
  const { address } = useAccount();

  const { data: prediction } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "getPrediction",
  });

  const { data: owner } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "owner",
  });

  const { data: predictionMarketContract } = useScaffoldContract({
    contractName: "PredictionMarket",
  });

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "PredictionMarket",
  });

  if (!owner)
    return (
      <div className="card bg-base-100 w-full shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-center">Resolve Market and Withdraw ETH</h2>
          <p className="text-base-content text-center">No prediction market found</p>
        </div>
      </div>
    );

  const tokenValue = prediction?.[4] ?? BigInt(0);
  const yesOutcome = prediction?.[1] ?? "Yes";
  const noOutcome = prediction?.[2] ?? "No";
  const isReported = prediction?.[7] ?? false;
  const yesToken = prediction?.[8] ?? "0x0000000000000000000000000000000000000000";
  const winningToken = prediction?.[10] ?? "0x0000000000000000000000000000000000000000";
  const lpRevenue = prediction?.[12] ?? BigInt(0);
  const winningOption = winningToken === yesToken ? yesOutcome : noOutcome;

  if (!isReported) return null;

  const handleWithdraw = async () => {
    try {
      await writeContractAsync({
        functionName: "resolveMarketAndWithdraw",
      });
    } catch (error) {
      console.error("Error redeeming tokens:", error);
    }
  };

  const isLiquidityProvider = address === prediction?.[13];

  return (
    <div className="card bg-base-100 w-full shadow-xl indicator">
      <div className="card-body">
        {!isLiquidityProvider ? (
          <div className="max-w-6xl mx-auto bg-base-100 rounded-xl">
            <p className="text-xl font-bold text-center">❗️ Only the liquidity provider can resolve the market</p>
          </div>
        ) : (
          <div>
            <h2 className="card-title text-center mb-5 text-2xl">Resolve Market and Withdraw ETH</h2>
            <div className="flex flex-row gap-4 items-center justify-between">
              <LPFinalTokenBalance
                tokenAddress={winningToken as string}
                winningOption={winningOption}
                address={predictionMarketContract?.address as string}
                tokenValue={tokenValue}
                lpRevenue={lpRevenue}
              />
              <div className="flex gap-4">
                <button className="btn btn-primary text-lg" onClick={handleWithdraw}>
                  Withdraw ETH
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
