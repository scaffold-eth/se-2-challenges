import { useEffect, useState } from "react";
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { useAccount, useBalance } from "wagmi";
import { Curve } from "~~/components/Curve";
import { MetaHeader } from "~~/components/MetaHeader";
import { Address, AddressInput, Balance, EtherInput, IntegerInput } from "~~/components/scaffold-eth";
import {
  useDeployedContractInfo,
  useScaffoldContract,
  useScaffoldContractRead,
  useScaffoldContractWrite,
} from "~~/hooks/scaffold-eth";

const Dex: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [ethToTokenAmount, setEthToTokenAmount] = useState("");
  const [tokenToETHAmount, setTokenToETHAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [approveSpender, setApproveSpender] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [accountBalanceOf, setAccountBalanceOf] = useState("");
  const [totalLiquidity, setTotalLiquidity] = useState("");

  const { data: DEXInfo } = useDeployedContractInfo("DEX");
  const { data: BalloonsInfo } = useDeployedContractInfo("Balloons");
  const { address: connectedAccount } = useAccount();

  const { data: DEXBalloonBalance } = useScaffoldContractRead({
    contractName: "Balloons",
    functionName: "balanceOf",
    args: [DEXInfo?.address?.toString()],
  });

  useEffect(() => {
    if (DEXBalloonBalance !== undefined) {
      setIsLoading(false);
    }
  }, [DEXBalloonBalance]);

  const { data: DEXtotalLiquidity } = useScaffoldContractRead({
    contractName: "DEX",
    functionName: "totalLiquidity",
  });

  useEffect(() => {
    if (DEXtotalLiquidity !== undefined) {
      setTotalLiquidity(DEXtotalLiquidity.toString());
    }
  }, [DEXtotalLiquidity]);

  const { writeAsync: ethToTokenWrite } = useScaffoldContractWrite({
    contractName: "DEX",
    functionName: "ethToToken",
    value: ethToTokenAmount,
  });

  const { writeAsync: tokenToEthWrite } = useScaffoldContractWrite({
    contractName: "DEX",
    functionName: "tokenToEth",
    args: [ethers.utils.parseEther(tokenToETHAmount || "0")],
  });

  const { writeAsync: depositWrite } = useScaffoldContractWrite({
    contractName: "DEX",
    functionName: "deposit",
    value: depositAmount,
  });

  const { writeAsync: withdrawWrite } = useScaffoldContractWrite({
    contractName: "DEX",
    functionName: "withdraw",
    args: [ethers.utils.parseEther(withdrawAmount || "0")],
  });

  const { writeAsync: approveWrite } = useScaffoldContractWrite({
    contractName: "Balloons",
    functionName: "approve",
    args: [approveSpender, ethers.utils.parseEther(approveAmount || "0")],
  });

  const { data: balanceOfWrite } = useScaffoldContractRead({
    contractName: "Balloons",
    functionName: "balanceOf",
    args: [accountBalanceOf],
  });

  const { data: contractBalance } = useScaffoldContractRead({
    contractName: "Balloons",
    functionName: "balanceOf",
    args: [DEXInfo?.address],
  });

  const { data: userBalloons } = useScaffoldContractRead({
    contractName: "Balloons",
    functionName: "balanceOf",
    args: [connectedAccount]
  });

  const { data: userLiquidity } = useScaffoldContractRead({
    contractName: "DEX",
    functionName: "getLiquidity",
    args: [connectedAccount]
  });

  const { data: contractETHBalance } = useBalance({
    address: DEXInfo?.address,
  });

  return (
    <>
      <MetaHeader />
      <h1 className="text-center mb-4 mt-5">
        <span className="block text-xl text-right mr-7">
          🎈: {parseFloat(ethers.utils.formatEther(userBalloons?.toString() || 0)).toFixed(4)}
        </span>
        <span className="block text-xl text-right mr-7">
        💦💦: {parseFloat(ethers.utils.formatEther(userLiquidity?.toString() || 0)).toFixed(4)}
        </span>
        <span className="block text-2xl mb-2">SpeedRunEthereum</span>
        <span className="block text-4xl font-bold">Challenge 4: Minimum Viable Exchange </span>
      </h1>
      <div className="flex flex-col flex-grow items-start pt-10 grid grid-cols-1 md:grid-cols-2 content-start">
        <div className="px-5 py-5">
          <div className="space-y-8 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-8 m-8">
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
                  <span className="pl-8 text-xl">
                    🎈 {parseFloat(ethers.utils.formatEther(DEXBalloonBalance?.toString() || 0)).toFixed(4)}
                  </span>
                )}
              </span>
            </div>
            <div className="py-3 px-4">
              <div className="flex mb-4 justify-center items-center">
                <span className="w-1/2">
                  ethToToken{" "}
                  <EtherInput
                    value={ethToTokenAmount}
                    onChange={value => setEthToTokenAmount(value)}
                    name="ethToToken"
                  />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={() => ethToTokenWrite()}
                >
                  Send
                </button>
              </div>
              <div className="flex justify-center items-center">
                <span className="w-1/2">
                  tokenToETH{" "}
                  <IntegerInput
                    value={tokenToETHAmount}
                    onChange={value => setTokenToETHAmount(value.toString())}
                    name="tokenToETH"
                    hideSuffix={true}
                  />
                </span>
                <button
                  className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5"
                  onClick={() => tokenToEthWrite()}
                >
                  Send
                </button>
              </div>
            </div>
            <div className="relative flex py-5 items-center">
              <span className="flex-shrink text-gray-400 mx-auto text-xl">
                Liquidity (
                {totalLiquidity
                  ? parseFloat(ethers.utils.formatEther(totalLiquidity?.toString() || 0)).toFixed(4)
                  : "None"}
                )
              </span>
            </div>

            <div className="px-4 py-3">
              <div className="flex mb-4 justify-center items-center">
                <span className="w-1/2">
                  Deposit <EtherInput value={depositAmount} onChange={value => setDepositAmount(value)} />
                </span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5" onClick={() => depositWrite()}>
                  Send
                </button>
              </div>

              <div className="flex justify-center items-center">
                <span className="w-1/2">
                  Withdraw <EtherInput value={withdrawAmount} onChange={value => setWithdrawAmount(value)} />
                </span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5" onClick={() => withdrawWrite()}>
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-8 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl py-5 p-8 m-8">
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
                    placeholder="uint256 Amount"
                    hideSuffix={true}
                  />
                </span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-auto" onClick={() => approveWrite()}>
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
                    BAL Balance: {parseFloat(ethers.utils.formatEther(balanceOfWrite?.toString() || 0)).toFixed(4)}
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
            ethReserve={parseFloat(ethers.utils.formatEther(contractETHBalance?.value || BigNumber.from("0")))}
            tokenReserve={parseFloat(ethers.utils.formatEther(contractBalance || BigNumber.from("0")))}
            width={500}
            height={500}
          />
        </div>
      </div>
    </>
  );
};

export default Dex;
