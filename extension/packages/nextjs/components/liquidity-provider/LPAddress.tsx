"use client";

import { Address } from "../scaffold-eth";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export function LPAddress() {
  const { data: prediction } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "getPrediction",
  });
  const { address } = useAccount();

  const { data: owner } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "owner",
  });

  if (!owner)
    return (
      <div className="flex flex-col bg-base-100 p-4 rounded-xl">
        <h3 className="text-xl font-medium">Prediction Market Info</h3>
        <p className="text-base-content">No prediction market found</p>
      </div>
    );

  const lpAddress = prediction?.[13] ?? "0x0000000000000000000000000000000000000000";

  const isLp = lpAddress === address;

  return (
    <div className="">
      <h3 className="text-xl font-medium">Liquidity Provider</h3>
      <Address address={lpAddress as `0x${string}`} />
      {!isLp && <p className="mt-1 mb-0 text-error text-sm">You are not the Liquidity Provider</p>}
    </div>
  );
}
