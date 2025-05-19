"use client";

import { Address } from "../scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export function OracleAddress() {
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
      <div className="card bg-base-100 w-full shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Prediction Market Info</h2>
          <p className="text-base-content">No prediction market found</p>
        </div>
      </div>
    );

  const oracle = prediction?.[3] ?? "0x0000000000000000000000000000000000000000";

  return (
    <div className="card bg-base-100 w-full shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Oracle</h2>
        <div className="mt-4 flex justify-center">
          <Address size="xl" address={oracle} />
        </div>
      </div>
    </div>
  );
}
