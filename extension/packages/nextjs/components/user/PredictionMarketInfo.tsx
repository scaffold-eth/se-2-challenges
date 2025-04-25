"use client";

import { ProbabilityDisplay } from "./ProbabilityDisplay";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export function PredictionMarketInfo() {
  const { data: prediction } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "getPrediction",
  });

  const { data: owner } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "owner",
  });

  if (!owner)
    return (
      <div className="bg-base-100 p-6 rounded-lg max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Prediction Market Info</h2>
        <p className="text-base-content">No prediction market found</p>
      </div>
    );

  const question = prediction?.[0] ?? "N/A";
  const predictionOutcome1 = prediction?.[1] ?? "Yes";
  const predictionOutcome2 = prediction?.[2] ?? "No";
  const isReported = prediction?.[7] ?? false;
  const optionToken1 = prediction?.[8] ?? "0x0000000000000000000000000000000000000000";
  const winningToken = prediction?.[10] ?? "0x0000000000000000000000000000000000000000";
  const winningOption = winningToken === optionToken1 ? predictionOutcome1 : predictionOutcome2;

  return (
    <div className="bg-base-100 p-6 border-default">
      <div className="space-y-6">
        <div className="bg-base-200 py-4 px-6 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-base-content text-xl font-bold">{question}</p>
            </div>
            <ProbabilityDisplay
              token1Reserve={BigInt(prediction?.[5] ?? 0)}
              token2Reserve={BigInt(prediction?.[6] ?? 0)}
              tokenAddress={optionToken1}
              label={isReported ? "Reported" : "Not Reported"}
              isReported={isReported}
              winningOption={winningOption}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
