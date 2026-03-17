"use client";

import { useState } from "react";
import { EtherInput } from "@scaffold-ui/components";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  useScaffoldReadContract,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";

export function AddRemoveLiquidity() {
  const [inputBuyAmount, setInputBuyAmount] = useState<string>("");
  const [inputSellAmount, setInputSellAmount] = useState<string>("");
  const { address } = useAccount();

  const { writeContractAsync: writeYourContractAsync } =
    useScaffoldWriteContract({
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

  if (!owner)
    return (
      <div className="card bg-base-100 w-full shadow-xl">
        <div className="card-body">
          <h2 className="card-title">No prediction market found</h2>
        </div>
      </div>
    );

  const tokenValue = prediction?.[4] ?? BigInt(0);
  const isReported = prediction?.[7] ?? false;

  if (isReported) return;

  const isLiquidityProvider = address === prediction?.[13];
  return (
    <div className="card bg-base-100 w-full shadow-xl indicator">
      <div className="card-body">
        {!isLiquidityProvider ? (
          <div className="max-w-6xl mx-auto">
            <h2 className="card-title text-center">
              ❗️ Only the liquidity provider can add or remove liquidity
            </h2>
          </div>
        ) : (
          <>
            <h2 className="card-title">Liquidity Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buy Section */}
              <div className="card bg-base-200 shadow">
                <div className="card-body">
                  <h3 className="font-semibold">Add Liquidity</h3>
                  <div className="space-y-2">
                    <EtherInput
                      defaultValue={inputBuyAmount}
                      placeholder="Amount to buy"
                      onValueChange={({ valueInEth }) =>
                        setInputBuyAmount(valueInEth)
                      }
                      disabled={!isLiquidityProvider || isReported}
                    />
                    {Number(inputBuyAmount) > 0 && (
                      <p className="text-sm">
                        Adding Ξ {inputBuyAmount} and{" "}
                        {(
                          (Number(inputBuyAmount) / Number(tokenValue)) *
                          10 ** 18
                        )
                          .toFixed(4)
                          .replace(/\.?0+$/, "")}{" "}
                        Yes and No tokens
                      </p>
                    )}
                    <button
                      className="btn btn-sm w-full btn-primary"
                      disabled={!isLiquidityProvider || isReported}
                      onClick={async () => {
                        try {
                          await writeYourContractAsync({
                            functionName: "addLiquidity",
                            value: parseEther(inputBuyAmount),
                          });
                        } catch (e) {
                          console.error("Error buying tokens:", e);
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 shadow">
                <div className="card-body">
                  <h3 className="font-semibold">Remove Liquidity</h3>
                  <div className="space-y-2">
                    <EtherInput
                      defaultValue={inputSellAmount}
                      placeholder="Amount to sell"
                      onValueChange={({ valueInEth }) =>
                        setInputSellAmount(valueInEth)
                      }
                      disabled={!isLiquidityProvider || isReported}
                    />
                    {Number(inputSellAmount) > 0 && (
                      <p className="text-sm">
                        Removing Ξ {inputSellAmount} and{" "}
                        {(
                          (Number(inputSellAmount) / Number(tokenValue)) *
                          10 ** 18
                        )
                          .toFixed(4)
                          .replace(/\.?0+$/, "")}{" "}
                        Yes and No token
                      </p>
                    )}
                    <button
                      disabled={!isLiquidityProvider || isReported}
                      className="btn btn-sm w-full btn-primary"
                      onClick={async () => {
                        try {
                          await writeYourContractAsync({
                            functionName: "removeLiquidity",
                            args: [parseEther(inputSellAmount)],
                          });
                        } catch (e) {
                          console.error("Error removing liquidity:", e);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
