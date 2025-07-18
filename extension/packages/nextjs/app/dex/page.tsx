"use client";

import { useEffect, useState } from "react";
import { Curve } from "./_components";
import type { NextPage } from "next";
import { Address as AddressType, formatEther, isAddress, parseEther } from "viem";
import { useAccount } from "wagmi";
import { Address, AddressInput, Balance, EtherInput, IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";

// REGEX for number inputs (only allow numbers and a single decimal point)
const NUMBER_REGEX = /^\.?\d+\.?\d*$/;

const Dex: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [ethToTokenAmount, setEthToTokenAmount] = useState("");
  const [tokenToETHAmount, setTokenToETHAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [approveSpender, setApproveSpender] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [accountBalanceOf, setAccountBalanceOf] = useState("");

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
        <span className="block text-2xl mb-2">SpeedRunEthereum</span>
        <span className="block text-4xl font-bold">Challenge: ⚖️ Build a DEX </span>
      </h1>
      <div className="items-start pt-10 grid grid-cols-1 md:grid-cols-2 content-start">
        <div className="px-5 py-5">
          <div className="bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-8 m-8">
            <div className="flex flex-col text-center">
              <span className="text-3xl font-semibold mb-2">DEX Contract</span>
              <span className="block text-2xl mb-2 mx-auto">
                <Address size="xl" address={DEXInfo?.address} />
              </span>
              <span className="flex flex-row mx-auto mt-5">
                {" "}
                <Balance className="text-xl" address={DEXInfo?.address} /> ⚖️
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
                    value={ethToTokenAmount}
                    onChange={value => {
                      setTokenToETHAmount("");
                      setEthToTokenAmount(value);
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
                  Deposit <EtherInput value={depositAmount} onChange={value => setDepositAmount(value)} />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={async () => {
                    try {
                      await writeDexContractAsync({
                        functionName: "deposit",
                        value: NUMBER_REGEX.test(depositAmount) ? parseEther(depositAmount) : 0n,
                      });
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
                  Withdraw <EtherInput value={withdrawAmount} onChange={value => setWithdrawAmount(value)} />
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

          <div className="space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl py-5 p-8 m-8">
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

        <div className="mx-auto p-8 m-8 md:sticky md:top-0">
          <Curve
            addingEth={ethToTokenAmount !== "" ? parseFloat(ethToTokenAmount.toString()) : 0}
            addingToken={tokenToETHAmount !== "" ? parseFloat(tokenToETHAmount.toString()) : 0}
            ethReserve={parseFloat(formatEther(contractETHBalance?.value || 0n))}
            tokenReserve={parseFloat(formatEther(contractBalance || 0n))}
            width={500}
            height={500}
          />
        </div>
      </div>
    </>
  );
};

export default Dex;
