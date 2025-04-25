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
      <div className="bg-base-100 p-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Prediction Market Info</h2>
        <p className="text-base-content">No prediction market found</p>
      </div>
    );

  const oracle = prediction?.[3] ?? "0x0000000000000000000000000000000000000000";

  return (
    <div className="bg-base-100 p-4">
      <h2 className="text-2xl font-bold text-center">Oracle</h2>
      <div className="mt-4 flex justify-center">
        <Address size="xl" address={oracle} />
      </div>
    </div>
  );
}
