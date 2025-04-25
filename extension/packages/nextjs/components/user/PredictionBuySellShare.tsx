"use client";

import { useState } from "react";
import { ProbabilityDisplay } from "./ProbabilityDisplay";
import { formatEther, parseEther } from "viem";
import { useReadContract } from "wagmi";
import { GiveAllowance } from "~~/components/user/GiveAllowance";
import { TokenBalance } from "~~/components/user/TokenBalance";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export function PredictionBuySellShare({ optionIndex, colorScheme }: { optionIndex: number; colorScheme: string }) {
  const [inputBuyAmount, setInputBuyAmount] = useState<bigint>(BigInt(0));
  const tokenBuyAmount = parseEther((inputBuyAmount || BigInt(0)).toString());
  const [inputSellAmount, setInputSellAmount] = useState<bigint>(BigInt(0));
  const tokenSellAmount = parseEther((inputSellAmount || BigInt(0)).toString());

  const { data: deployedContractData } = useDeployedContractInfo({ contractName: "PredictionMarket" });
  const contractAddress = deployedContractData?.address;

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

  const { data: totalPriceInEth } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "getBuyPriceInEth",
    args: [optionIndex, tokenBuyAmount],
    watch: true,
  });

  const { data: sellTotalPriceInEth } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "getSellPriceInEth",
    args: [optionIndex, tokenSellAmount],
    watch: true,
  });

  const erc20Abi = [
    {
      inputs: [],
      name: "totalSupply",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  const { data: totalSupply } = useReadContract({
    abi: erc20Abi,
    address: prediction?.[8] as string,
    functionName: "totalSupply",
  });

  if (!owner)
    return (
      <div className="max-w-lg mx-auto p-4 bg-white rounded-xl shadow-lg space-y-4">
        <h2 className="text-lg font-semibold text-center">No prediction market found</h2>
      </div>
    );

  const tokenAddress = prediction?.[8 + optionIndex] ?? "0x0000000000000000000000000000000000000000";
  const option = prediction?.[1 + optionIndex] ?? "Yes";
  const yesTokenReserve = prediction?.[5 + optionIndex] as bigint;
  const noTokenReserve = prediction?.[6 - optionIndex] as bigint;
  const ethCollateral = prediction?.[11] ?? 0n;
  const isReported = prediction?.[7] ?? false;
  const yesOutcome = prediction?.[1] ?? "Yes";
  const noOutcome = prediction?.[2] ?? "No";
  const optionToken1 = prediction?.[8] ?? "0x0000000000000000000000000000000000000000";
  const winningToken = prediction?.[10] ?? "0x0000000000000000000000000000000000000000";
  const winningOption = winningToken === optionToken1 ? yesOutcome : noOutcome;

  const etherToReceive = totalSupply
    ? (parseEther((inputBuyAmount || BigInt(0)).toString()) * ethCollateral) / totalSupply
    : 0n;
  const etherToWin = totalPriceInEth ? etherToReceive - totalPriceInEth : 0n;

  return (
    <div>
      <h2 className={`mt-0 mb-6 text-center text-xl font-semibold text-${colorScheme}-500`}>
        Tokens available to buy: {formatEther(yesTokenReserve ?? BigInt(0))}
      </h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <div className="text-center">
            <ProbabilityDisplay
              token1Reserve={yesTokenReserve ?? BigInt(0)}
              token2Reserve={noTokenReserve ?? BigInt(0)}
              tokenAddress={tokenAddress as string}
              isReported={isReported}
              winningOption={winningOption}
            />
          </div>

          <div className="mt-4">
            <TokenBalance tokenAddress={tokenAddress as string} option={option as string} redeem={false} />
          </div>
        </div>
        <div>
          <div role="tablist" className="tabs tabs-bordered tabs-lg">
            <input
              type="radio"
              name={`${colorScheme}_buy_sell_tab`}
              role="tab"
              className="tab font-medium min-w-32"
              aria-label={`Buy "${option}"`}
              defaultChecked
            />
            <div role="tabpanel" className="tab-content pt-4">
              <div className={`bg-${colorScheme}-50 rounded-lg`}>
                <div className="space-y-4">
                  <input
                    type="number"
                    placeholder="Amount to buy"
                    className={`input input-bordered input-sm w-full rounded-md placeholder-${colorScheme}-500 dark:placeholder-white dark:placeholder-opacity-70`}
                    onChange={e => setInputBuyAmount(BigInt(e.target.value))}
                  />

                  {Boolean(totalPriceInEth) && (
                    <>
                      <div className="text-center">
                        <ProbabilityDisplay
                          token1Reserve={
                            (yesTokenReserve ?? BigInt(0)) - parseEther((inputBuyAmount || BigInt(0)).toString())
                          }
                          token2Reserve={noTokenReserve ?? BigInt(0)}
                          tokenAddress={tokenAddress as string}
                          label="New Probability"
                          isReported={isReported}
                          winningOption={winningOption}
                        />
                      </div>

                      {totalSupply && (
                        <p className="text-sm">
                          For {Number(formatEther(totalPriceInEth || 0n)).toFixed(4)} Ξ you have the chance to win Ξ
                          {Number(formatEther(etherToReceive)).toFixed(4)} (upside Ξ
                          {Number(formatEther(etherToWin)).toFixed(4)})
                        </p>
                      )}
                    </>
                  )}

                  <button
                    className={`btn btn-sm btn-primary min-w-32`}
                    disabled={!totalPriceInEth}
                    onClick={async () => {
                      try {
                        await writeYourContractAsync({
                          functionName: "buyTokensWithETH",
                          args: [optionIndex, tokenBuyAmount],
                          value: totalPriceInEth,
                        });
                      } catch (e) {
                        console.error("Error buying tokens:", e);
                      }
                    }}
                  >
                    Buy
                  </button>
                </div>
              </div>
            </div>

            <input
              type="radio"
              name={`${colorScheme}_buy_sell_tab`}
              role="tab"
              className="tab px-2 font-medium min-w-32"
              aria-label={`Sell "${option}"`}
            />
            <div role="tabpanel" className="tab-content pt-4">
              <div className="">
                <div className="space-y-4">
                  <input
                    type="number"
                    placeholder="Amount to sell"
                    className={`input input-bordered input-sm w-full rounded-md placeholder-${colorScheme}-500 dark:placeholder-white dark:placeholder-opacity-70`}
                    onChange={e => setInputSellAmount(BigInt(e.target.value))}
                  />

                  {Boolean(sellTotalPriceInEth) && (
                    <>
                      <p className="text-sm">Ξ to receive: {formatEther(sellTotalPriceInEth || 0n)}</p>
                      <div className="text-center">
                        <ProbabilityDisplay
                          token1Reserve={
                            (yesTokenReserve ?? BigInt(0)) + parseEther((inputSellAmount || BigInt(0)).toString())
                          }
                          token2Reserve={noTokenReserve ?? BigInt(0)}
                          tokenAddress={tokenAddress as string}
                          label="New Probability"
                          isReported={isReported}
                          winningOption={winningOption}
                        />
                      </div>
                      <p className="text-sm">ETH to receive: {formatEther(sellTotalPriceInEth || 0n)}</p>
                    </>
                  )}

                  <div className="flex items-center gap-4">
                    <GiveAllowance
                      tokenAddress={tokenAddress as string}
                      spenderAddress={contractAddress ?? ""}
                      amount={inputSellAmount.toString()}
                      showInput={false}
                      disabled={!tokenSellAmount || tokenSellAmount === 0n}
                    />
                    <button
                      className="btn btn-sm btn-primary min-w-32"
                      disabled={!tokenSellAmount || tokenSellAmount === 0n}
                      onClick={async () => {
                        try {
                          await writeYourContractAsync({
                            functionName: "sellTokensForEth",
                            args: [optionIndex, tokenSellAmount],
                          });
                        } catch (e) {
                          console.error("Error selling tokens:", e);
                        }
                      }}
                    >
                      Sell
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
