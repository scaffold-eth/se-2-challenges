"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export function ReportPrediction() {
  const [selectedOutcome, setSelectedOutcome] = useState<number>(0);
  const { address } = useAccount();

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "PredictionMarket",
  });

  const { data: prediction } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "getPrediction",
  });

  const { data: owner } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "owner",
  });

  const handleReport = async () => {
    try {
      await writeContractAsync({
        functionName: "report",
        args: [selectedOutcome],
      });
    } catch (error) {
      console.error("Error reporting outcome:", error);
    }
  };

  if (!owner) return null;

  const yesOutcome = prediction?.[1] ?? "Yes";
  const noOutcome = prediction?.[2] ?? "No";
  const isOracle = address === prediction?.[3];
  const isReported = prediction?.[7] ?? false;
  const optionToken1 = prediction?.[8] ?? "0x0000000000000000000000000000000000000000";
  const winningToken = prediction?.[10] ?? "0x0000000000000000000000000000000000000000";
  const winningOption = winningToken === optionToken1 ? yesOutcome : noOutcome;

  return (
    <div className="card bg-base-100 w-full shadow-xl indicator mt-5">
      <div className="card-body">
        {isReported ? (
          <div className="max-w-6xl mx-auto">
            <p className="text-xl font-bold text-center">📣 Prediction market already reported - {winningOption}</p>
          </div>
        ) : !isOracle ? (
          <div className="max-w-6xl mx-auto">
            <p className="text-xl font-bold text-center">❗️ Only the oracle can report the prediction outcome</p>
          </div>
        ) : (
          <div>
            <h2 className="card-title mb-4">Report Prediction Outcome</h2>
            <div className="flex gap-4">
              <select
                className="select select-bordered flex-1"
                value={selectedOutcome}
                onChange={e => setSelectedOutcome(Number(e.target.value))}
                disabled={!isOracle}
              >
                <option value={0}>{yesOutcome}</option>
                <option value={1}>{noOutcome}</option>
              </select>
              <button className="btn btn-primary" onClick={handleReport} disabled={!isOracle}>
                Report Outcome
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
