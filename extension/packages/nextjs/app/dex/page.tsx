"use client";

import { useEffect, useRef, useState } from "react";
import { Curve } from "./_components";
import { Address, AddressInput, Balance, EtherInput } from "@scaffold-ui/components";
import { IntegerInput } from "@scaffold-ui/debug-contracts";
import { useWatchBalance } from "@scaffold-ui/hooks";
import type { NextPage } from "next";
import { Address as AddressType, formatEther, isAddress, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// REGEX for number inputs (only allow numbers and a single decimal point)
const NUMBER_REGEX = /^\.?\d+\.?\d*$/;

const Dex: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const curveWrapRef = useRef<HTMLDivElement>(null);
  const [curveSize, setCurveSize] = useState(500);
  const [ethToTokenAmount, setEthToTokenAmount] = useState("");
  const [tokenToETHAmount, setTokenToETHAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [approveSpender, setApproveSpender] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [accountBalanceOf, setAccountBalanceOf] = useState("");
  const [ethToTokenInputKey, setEthToTokenInputKey] = useState(0);
  const [depositInputKey, setDepositInputKey] = useState(0);
  const [withdrawInputKey, setWithdrawInputKey] = useState(0);

  const { data: DEXInfo } = useDeployedContractInfo({ contractName: "DEX" });
  const { data: BalloonsInfo } = useDeployedContractInfo({ contractName: "Balloons" });
  const { address: connectedAccount } = useAccount();

  const { data: DEXBalloonBalance } = useScaffoldReadContract({
    contractName: "Balloons",
    functionName: "balanceOf",
    args: [DEXInfo?.address?.toString()],
  });

  useEffect(() => {
    if (DEXBalloonBalance !== undefined) {
      setIsLoading(false);
    }
  }, [DEXBalloonBalance]);

  useEffect(() => {
    const el = curveWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      const width = entry?.contentRect?.width ?? 0;
      if (!Number.isFinite(width) || width <= 0) return;
      // Keep the chart from causing horizontal overflow and scrollbars.
      const next = Math.max(260, Math.min(500, Math.floor(width)));
      setCurveSize(next);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { data: DEXtotalLiquidity } = useScaffoldReadContract({
    contractName: "DEX",
    functionName: "totalLiquidity",
  });

  const { writeContractAsync: writeDexContractAsync } = useScaffoldWriteContract({ contractName: "DEX" });

  const { writeContractAsync: writeBalloonsContractAsync } = useScaffoldWriteContract({ contractName: "Balloons" });

  const { data: balanceOfWrite } = useScaffoldReadContract({
    contractName: "Balloons",
    functionName: "balanceOf",
    args: [accountBalanceOf as AddressType],
    query: {
      enabled: isAddress(accountBalanceOf),
    },
  });

  const { data: contractBalance } = useScaffoldReadContract({
    contractName: "Balloons",
    functionName: "balanceOf",
    args: [DEXInfo?.address],
  });

  const { data: userBalloons } = useScaffoldReadContract({
    contractName: "Balloons",
    functionName: "balanceOf",
    args: [connectedAccount],
  });

  const { data: userLiquidity } = useScaffoldReadContract({
    contractName: "DEX",
    functionName: "getLiquidity",
    args: [connectedAccount],
  });

  const { data: contractETHBalance } = useWatchBalance({ address: DEXInfo?.address });

  return (
    <>
      <h1 className="text-center mb-4 mt-5">
        <span className="block text-xl text-right mr-7">
          🎈: {parseFloat(formatEther(userBalloons || 0n)).toFixed(4)}
        </span>
        <span className="block text-xl text-right mr-7">
          💦💦: {parseFloat(formatEther(userLiquidity || 0n)).toFixed(4)}
        </span>
        <span className="block text-2xl mb-2">Speedrun Ethereum</span>
        <span className="block text-4xl font-bold">Challenge: ⚖️ Build a DEX </span>
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-10 content-start">
        <div className="px-5 py-5 space-y-6 min-w-0">
          <div className="bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-8">
            <div className="flex flex-col text-center">
              <span className="text-3xl font-semibold mb-2">DEX Contract</span>
              <span className="block text-2xl mb-2 mx-auto">
                <Address size="xl" address={DEXInfo?.address} />
              </span>
              <span className="flex flex-row mx-auto mt-5">
                {" "}
                <Balance
                  style={{ fontSize: "var(--text-xl)", lineHeight: "var(--text-xl-line-height)" }}
                  address={DEXInfo?.address}
                />{" "}
                ⚖️
                {isLoading ? (
                  <span>Loading...</span>
                ) : (
                  <span className="pl-8 text-xl">🎈 {parseFloat(formatEther(DEXBalloonBalance || 0n)).toFixed(4)}</span>
                )}
              </span>
            </div>
            <div className="py-3 px-4">
              <div className="flex mb-4 justify-center items-center">
                <span className="w-1/2">
                  ethToToken{" "}
                  <EtherInput
                    key={ethToTokenInputKey}
                    defaultValue={ethToTokenAmount}
                    onValueChange={({ valueInEth }) => {
                      setTokenToETHAmount("");
                      setEthToTokenAmount(valueInEth);
                    }}
                    name="ethToToken"
                  />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={async () => {
                    try {
                      await writeDexContractAsync({
                        functionName: "ethToToken",
                        value: NUMBER_REGEX.test(ethToTokenAmount) ? parseEther(ethToTokenAmount) : 0n,
                      });
                      setEthToTokenAmount("");
                      setTokenToETHAmount("");
                      setEthToTokenInputKey(k => k + 1);
                    } catch (err) {
                      console.error("Error calling ethToToken function", err);
                    }
                  }}
                >
                  Send
                </button>
              </div>
              <div className="flex justify-center items-center">
                <span className="w-1/2">
                  tokenToETH{" "}
                  <IntegerInput
                    value={tokenToETHAmount}
                    onChange={value => {
                      setEthToTokenAmount("");
                      setTokenToETHAmount(value.toString());
                    }}
                    name="tokenToETH"
                    disableMultiplyBy1e18
                  />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={async () => {
                    try {
                      await writeDexContractAsync({
                        functionName: "tokenToEth",
                        // @ts-expect-error - Show error on frontend while sending, if user types invalid number
                        args: [NUMBER_REGEX.test(tokenToETHAmount) ? parseEther(tokenToETHAmount) : tokenToETHAmount],
                      });
                      setEthToTokenAmount("");
                      setTokenToETHAmount("");
                      setEthToTokenInputKey(k => k + 1);
                    } catch (err) {
                      console.error("Error calling tokenToEth function", err);
                    }
                  }}
                >
                  Send
                </button>
              </div>
            </div>
            <p className="text-center text-primary-content text-xl mt-8 -ml-8">
              Liquidity ({DEXtotalLiquidity ? parseFloat(formatEther(DEXtotalLiquidity || 0n)).toFixed(4) : "None"})
            </p>
            <div className="px-4 py-3">
              <div className="flex mb-4 justify-center items-center">
                <span className="w-1/2">
                  Deposit{" "}
                  <EtherInput
                    key={depositInputKey}
                    defaultValue={depositAmount}
                    onValueChange={({ valueInEth }) => setDepositAmount(valueInEth)}
                  />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={async () => {
                    try {
                      await writeDexContractAsync({
                        functionName: "deposit",
                        value: NUMBER_REGEX.test(depositAmount) ? parseEther(depositAmount) : 0n,
                      });
                      setDepositAmount("");
                      setDepositInputKey(k => k + 1);
                    } catch (err) {
                      console.error("Error calling deposit function", err);
                    }
                  }}
                >
                  Send
                </button>
              </div>

              <div className="flex justify-center items-center">
                <span className="w-1/2">
                  Withdraw{" "}
                  <EtherInput
                    key={withdrawInputKey}
                    defaultValue={withdrawAmount}
                    onValueChange={({ valueInEth }) => setWithdrawAmount(valueInEth)}
                  />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={async () => {
                    try {
                      await writeDexContractAsync({
                        functionName: "withdraw",
                        // @ts-expect-error - Show error on frontend while sending, if user types invalid number
                        args: [NUMBER_REGEX.test(withdrawAmount) ? parseEther(withdrawAmount) : withdrawAmount],
                      });
                      setWithdrawAmount("");
                      setWithdrawInputKey(k => k + 1);
                    } catch (err) {
                      console.error("Error calling withdraw function", err);
                    }
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl py-5 p-8">
            <div className="flex flex-col text-center mt-2 mb-4 px-4">
              <span className="block text-3xl font-semibold mb-2">Balloons</span>
              <span className="mx-auto">
                <Address size="xl" address={BalloonsInfo?.address} />
              </span>
            </div>

            <div className=" px-4 py-3">
              <div className="flex flex-col gap-4 mb-4 justify-center items-center">
                <span className="w-1/2">
                  Approve{" "}
                  <AddressInput
                    value={approveSpender ?? ""}
                    onChange={value => setApproveSpender(value)}
                    placeholder="Address Spender"
                  />
                </span>
                <span className="w-1/2">
                  <IntegerInput
                    value={approveAmount}
                    onChange={value => setApproveAmount(value.toString())}
                    placeholder="Amount"
                    disableMultiplyBy1e18
                  />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-auto"
                  onClick={async () => {
                    try {
                      await writeBalloonsContractAsync({
                        functionName: "approve",
                        args: [
                          approveSpender as AddressType,
                          // @ts-expect-error - Show error on frontend while sending, if user types invalid number
                          NUMBER_REGEX.test(approveAmount) ? parseEther(approveAmount) : approveAmount,
                        ],
                      });
                      setApproveSpender("");
                      setApproveAmount("");
                    } catch (err) {
                      console.error("Error calling approve function", err);
                    }
                  }}
                >
                  Send
                </button>
                <span className="w-1/2">
                  balanceOf{" "}
                  <AddressInput
                    value={accountBalanceOf}
                    onChange={value => setAccountBalanceOf(value)}
                    placeholder="address Account"
                  />
                </span>
                {balanceOfWrite === undefined ? (
                  <h1></h1>
                ) : (
                  <span className="font-bold bg-primary px-3 rounded-2xl">
                    BAL Balance: {parseFloat(formatEther(balanceOfWrite || 0n)).toFixed(4)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center px-2 pb-10 lg:pt-5 lg:px-4 lg:sticky lg:top-24 min-w-0">
          <div ref={curveWrapRef} className="flex justify-center w-full max-w-[520px] min-w-0">
            <Curve
              addingEth={ethToTokenAmount !== "" ? parseFloat(ethToTokenAmount.toString()) : 0}
              addingToken={tokenToETHAmount !== "" ? parseFloat(tokenToETHAmount.toString()) : 0}
              ethReserve={parseFloat(formatEther(contractETHBalance?.value || 0n))}
              tokenReserve={parseFloat(formatEther(contractBalance || 0n))}
              width={curveSize}
              height={curveSize}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dex;
