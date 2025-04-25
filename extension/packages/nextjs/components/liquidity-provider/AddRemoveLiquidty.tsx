"use client";

import { useState } from "react";
import { EtherInput } from "../scaffold-eth";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export function AddRemoveLiquidity() {
  const [inputBuyAmount, setInputBuyAmount] = useState<number>(0);
  const [inputSellAmount, setInputSellAmount] = useState<number>(0);
  const { address } = useAccount();

  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract({
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
      <div className="p-4 space-y-4 border-default">
        <h2 className="text-lg font-semibold text-center">No prediction market found</h2>
      </div>
    );

  const tokenValue = prediction?.[4] ?? BigInt(0);
  const isReported = prediction?.[7] ?? false;

  if (isReported)
    return (
      <>
        <p className="text-error text-center mb-4">Prediction market is already reported</p>
      </>
    );

  const isLiquidityProvider = address === prediction?.[13];
  return (
    <div className="p-4 space-y-4 border-default">
      {!isLiquidityProvider ? (
        <div className="max-w-6xl mx-auto p-6 bg-base-100  rounded-xl shadow-lg">
          <p className="text-xl font-bold text-center ">❗️ Only the liquidity provider can add or remove liquidity</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Buy Section */}
          <div className={`p-3 rounded-lg`}>
            <h2 className="text-lg font-semibold mb-2">Add Liquidity</h2>
            <div className="space-y-2">
              <EtherInput
                value={inputBuyAmount.toString()}
                placeholder="Amount to buy"
                onChange={e => setInputBuyAmount(Number(e))}
                disabled={!isLiquidityProvider || isReported}
              />
              {inputBuyAmount > 0 &&
                `Adding Ξ ${inputBuyAmount} and ${((inputBuyAmount / Number(tokenValue)) * 10 ** 18).toFixed(4).replace(/\.?0+$/, "")} Yes and No tokens`}
              <button
                className={`btn btn-sm w-full btn-primary text-white`}
                disabled={!isLiquidityProvider || isReported}
                onClick={async () => {
                  try {
                    await writeYourContractAsync({
                      functionName: "addLiquidity",
                      value: parseEther(inputBuyAmount.toString()),
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

          <div className="bg-base-100 p-3 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Remove Liquidity</h2>
            <div className="space-y-2">
              <EtherInput
                value={inputSellAmount.toString()}
                placeholder="Amount to sell"
                onChange={e => {
                  setInputSellAmount(Number(e));
                }}
                disabled={!isLiquidityProvider || isReported}
              />
              {inputSellAmount > 0 &&
                `Removing Ξ ${inputBuyAmount} and ${((inputSellAmount / Number(tokenValue)) * 10 ** 18).toFixed(4).replace(/\.?0+$/, "")} Yes and No token`}
              <div className="flex gap-2">
                <button
                  disabled={!isLiquidityProvider || isReported}
                  className="btn btn-sm flex-1 btn-primary text-white"
                  onClick={async () => {
                    try {
                      // Convert string to number first to handle decimals
                      const amount = Number(inputSellAmount);
                      await writeYourContractAsync({
                        functionName: "removeLiquidity",
                        args: [parseEther(amount.toString())],
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
      )}
    </div>
  );
}
