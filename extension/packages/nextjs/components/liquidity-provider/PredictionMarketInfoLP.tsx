"use client";

import { useEffect } from "react";
import { LPAddress } from "./LPAddress";
import { useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useBlockNumber, useReadContract } from "wagmi";
import { erc20Abi } from "~~/components/constants";
import { useScaffoldReadContract, useSelectedNetwork } from "~~/hooks/scaffold-eth";

export function PredictionMarketInfoLP() {
  const { data: prediction } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "getPrediction",
  });

  const { data: owner } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "owner",
  });

  const { data: totalSupply, queryKey } = useReadContract({
    abi: erc20Abi,
    address: prediction?.[8] as string,
    functionName: "totalSupply",
  });

  const { data: yesTokenAmountOwner } = useReadContract({
    abi: erc20Abi,
    address: prediction?.[8] as string,
    functionName: "balanceOf",
    args: [owner as `0x${string}`],
  });

  const selectedNetwork = useSelectedNetwork();
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({
    watch: true,
    chainId: selectedNetwork.id,
    query: {
      enabled: true,
    },
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [blockNumber, queryClient, queryKey]);

  if (!owner)
    return (
      <div className="card bg-base-100 w-full shadow-xl indicator">
        <div className="card-body">
          <h2 className="card-title">Prediction Market Info</h2>
          <p className="text-base-content">No prediction market found</p>
        </div>
      </div>
    );

  const yesTokenReserve = prediction?.[5] ?? BigInt(0);
  const noTokenReserve = prediction?.[6] ?? BigInt(0);
  const ethCollateral = prediction?.[11] ?? BigInt(0);
  const lpTradingRevenue = prediction?.[12] ?? BigInt(0);

  const tokenValue = prediction?.[4] ?? BigInt(0);
  const yesOutcome = prediction?.[1] ?? "Yes";
  const noOutcome = prediction?.[2] ?? "No";
  const isReported = prediction?.[7] ?? false;
  const yesToken = prediction?.[8] ?? "0x0000000000000000000000000000000000000000";
  const winningToken = prediction?.[10] ?? "0x0000000000000000000000000000000000000000";

  const yesTokenLocked = yesTokenAmountOwner ?? BigInt(0);
  const noTokenLocked = yesTokenAmountOwner ?? BigInt(0);

  const yesTokenSold = (totalSupply ?? BigInt(0)) - yesTokenLocked - yesTokenReserve;
  const noTokenSold = (totalSupply ?? BigInt(0)) - noTokenLocked - noTokenReserve;

  const winningOption = winningToken === yesToken ? yesOutcome : noOutcome;

  return (
    <div className="card bg-base-100 w-full shadow-xl indicator">
      <div className="card-body">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6 md:border-r md:border-b">
            <h3 className="text-xl font-medium">
              Token Value:
              <span className="font-bold">{Number(formatEther(BigInt(tokenValue ?? 0))).toFixed(4)} Ξ</span>
            </h3>
            <div className="text-sm">
              {isReported ? `(Value of winning token "${winningOption}" in ETH)` : "(Value of winning token in ETH)"}
            </div>
          </div>
          <div className="p-6 md:border-b">
            <LPAddress />
          </div>
          <div className="p-6 md:border-r">
            <h3 className="text-xl font-medium">Prediciton Market Collateral</h3>
            <span className="text-sm">(Amount of ETH that goes to the winning token)</span>
            <div className="stat-value pt-2 font-bold text-xl">
              {Number(formatEther(BigInt(ethCollateral ?? 0))).toFixed(4)} Ξ
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-xl font-medium">LP Revenue</h3>
            <span className="text-sm">(Token revenue when token gets bought/sold)</span>
            <div className="stat-value pt-2 font-bold text-xl">
              {Number(formatEther(BigInt(lpTradingRevenue ?? 0))).toFixed(4)} Ξ
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {!isReported ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Yes Token */}
              <div className="bg-base-200 p-4 rounded-lg border-4 border-green-500">
                <h2 className="text-2xl font-semibold mb-2">&quot;{yesOutcome}&quot; Token</h2>
                <h3 className="text-lg mb-2">
                  Total Supply:
                  <span className="font-bold"> {Number(formatEther(BigInt(totalSupply ?? 0))).toFixed(2)} tokens</span>
                </h3>

                <h3 className="text-lg mb-2 border-t-4 pt-2">
                  Amount of {yesOutcome} tokens <span className="font-bold">locked away by prediction market</span>
                </h3>
                <div className="stat-value text-lg">
                  {Number(formatEther(BigInt(yesTokenLocked))).toFixed(2)} tokens
                </div>

                <h3 className="text-sm mb-2 pt-2">
                  (Value of tokens{" "}
                  {Number(
                    formatEther(BigInt((BigInt(yesTokenLocked ?? 0) * BigInt(tokenValue ?? 0)) / BigInt(10 ** 18))),
                  ).toFixed(2)}{" "}
                  Ξ if Oracle reports {yesOutcome})
                </h3>

                <h3 className="text-lg mb-2 border-t-4 pt-2">
                  Amount of {yesOutcome} tokens <span className="font-bold">held by prediction market</span>
                </h3>
                <div className="stat-value text-lg">
                  {Number(formatEther(BigInt(yesTokenReserve ?? 0))).toFixed(2)} tokens
                </div>

                <h3 className="text-sm mb-2 pt-2">
                  (Value of tokens{" "}
                  {Number(
                    formatEther(BigInt((BigInt(yesTokenReserve ?? 0) * BigInt(tokenValue ?? 0)) / BigInt(10 ** 18))),
                  ).toFixed(2)}{" "}
                  Ξ if Oracle reports {yesOutcome})
                </h3>
                <h3 className="text-lg mb-2 border-t-4 pt-2">
                  Amount of {yesOutcome} <span className="font-bold">tokens sold</span>
                </h3>
                <div className="stat-value text-lg">{Number(formatEther(BigInt(yesTokenSold))).toFixed(2)} tokens</div>
                <h3 className="text-sm mb-2 pt-2">
                  (Value of tokens{" "}
                  {Number(
                    formatEther(BigInt((BigInt(yesTokenSold) * BigInt(tokenValue ?? 0)) / BigInt(10 ** 18))),
                  ).toFixed(2)}{" "}
                  Ξ if Oracle reports {yesOutcome})
                </h3>
              </div>

              {/* No Token */}
              <div className="bg-base-200 p-4 rounded-lg border-4 border-red-500">
                <h2 className="text-2xl font-semibold mb-2">&quot;{noOutcome}&quot; Token</h2>
                <h3 className="text-lg mb-2">
                  Total Supply:
                  <span className="font-bold"> {Number(formatEther(BigInt(totalSupply ?? 0))).toFixed(2)} tokens</span>
                </h3>

                <h3 className="text-lg mb-2 border-t-4 pt-2">
                  Amount of {noOutcome} tokens <span className="font-bold">locked away by prediction market</span>
                </h3>
                <div className="stat-value text-lg">{Number(formatEther(BigInt(noTokenLocked))).toFixed(2)} tokens</div>

                <h3 className="text-sm mb-2 pt-2">
                  (Value of tokens{" "}
                  {Number(
                    formatEther(BigInt((BigInt(noTokenLocked ?? 0) * BigInt(tokenValue ?? 0)) / BigInt(10 ** 18))),
                  ).toFixed(2)}{" "}
                  Ξ if Oracle reports {noOutcome})
                </h3>
                <h3 className="text-lg mb-2 border-t-4 pt-2">
                  Amount of {noOutcome} tokens <span className="font-bold">held by prediction market</span>
                </h3>
                <div className="stat-value text-lg">
                  {Number(formatEther(BigInt(noTokenReserve ?? 0))).toFixed(2)} tokens
                </div>
                <h3 className="text-sm mb-2 pt-2">
                  (Value of tokens{" "}
                  {Number(
                    formatEther(BigInt((BigInt(noTokenReserve ?? 0) * BigInt(tokenValue ?? 0)) / BigInt(10 ** 18))),
                  ).toFixed(2)}{" "}
                  Ξ if Oracle reports {noOutcome})
                </h3>
                <h3 className="text-lg mb-2 border-t-4 pt-2">
                  Amount of {noOutcome} <span className="font-bold">tokens sold</span>
                </h3>
                <div className="stat-value text-lg">{Number(formatEther(BigInt(noTokenSold))).toFixed(2)} tokens</div>
                <h3 className="text-sm mb-2 pt-2">
                  (Value of tokens{" "}
                  {Number(
                    formatEther(BigInt((BigInt(noTokenSold) * BigInt(tokenValue ?? 0)) / BigInt(10 ** 18))),
                  ).toFixed(2)}{" "}
                  Ξ if Oracle reports {noOutcome})
                </h3>
              </div>
            </div>
          ) : (
            <div className="bg-base-200 p-4 rounded-lg">
              <h2 className="text-2xl font-semibold mb-2">Oracle reported: {winningOption}</h2>
              <h3 className="text-lg mb-2">
                Value of {winningOption} tokens held by prediction market:{" "}
                {Number(
                  formatEther(
                    BigInt(
                      (BigInt(winningToken === yesToken ? yesTokenReserve : noTokenReserve) * BigInt(tokenValue)) /
                        BigInt(10 ** 18),
                    ),
                  ),
                ).toFixed(4)}{" "}
                Ξ
              </h3>
              <h3 className="text-lg mb-2 pt-2">
                Value of {winningOption} tokens held by users:{" "}
                {Number(
                  formatEther(
                    BigInt(
                      ((BigInt(totalSupply ?? 0) -
                        BigInt(winningToken === yesToken ? yesTokenReserve : noTokenReserve)) *
                        tokenValue) /
                        BigInt(10 ** 18),
                    ),
                  ),
                ).toFixed(4)}{" "}
                Ξ
              </h3>
              <h3 className="text-sm mb-2">
                (&quot;{winningToken === yesToken ? noOutcome : yesOutcome}&quot; tokens have no value anymore)
              </h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
