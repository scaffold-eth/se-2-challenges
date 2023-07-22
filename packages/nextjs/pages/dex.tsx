import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { MetaHeader } from "~~/components/MetaHeader";
import { Address, AddressInput, Balance, EtherInput, IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldContract, useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { Curve } from "~~/components/Curve";
import { useBalance } from "wagmi";

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

  const {data: DEXInfo} = useDeployedContractInfo("DEX");
  const {data: BalloonsInfo} = useDeployedContractInfo("Balloons");
  
  const {data: DEXBalloonBalance} = useScaffoldContractRead({
    contractName:"Balloons",
    functionName:"balanceOf",
    args:[DEXInfo?.address?.toString()]
  });

  useEffect(() => {
    if (DEXBalloonBalance !== undefined) {
      setIsLoading(false);
    }
  }, [DEXBalloonBalance]);

  const {data: DEXtotalLiquidity} = useScaffoldContractRead({
    contractName:"DEX",
    functionName:"totalLiquidity"
  });

  useEffect(() => {
    if (DEXtotalLiquidity !== undefined) {
      setTotalLiquidity(DEXtotalLiquidity);
    }
  }, [DEXtotalLiquidity]);

  const { writeAsync: ethToTokenWrite } = useScaffoldContractWrite({
    contractName: "DEX",
    functionName: "ethToToken",
    value: ethToTokenAmount
  });

  const { writeAsync: tokenToEthWrite } = useScaffoldContractWrite({
    contractName: "DEX",
    functionName: "tokenToEth",
    args: [ethers.utils.parseEther(tokenToETHAmount || "0")]
  });

  const {writeAsync: depositWrite} = useScaffoldContractWrite({
    contractName:"DEX",
    functionName:"deposit",
    value: depositAmount
  });

  const {writeAsync: withdrawWrite} = useScaffoldContractWrite({
    contractName:"DEX",
    functionName:"withdraw",
    args: [ethers.utils.parseEther(withdrawAmount || "0")]
  });

  const {writeAsync: approveWrite} = useScaffoldContractWrite({
    contractName:"Balloons",
    functionName:"approve",
    args: [approveSpender, ethers.utils.parseEther(approveAmount || "0")]
  });

  const {data: balanceOfWrite} = useScaffoldContractRead({
    contractName:"Balloons",
    functionName:"balanceOf",
    args: [accountBalanceOf]
  });

  const {data: contractBalance} = useScaffoldContractRead({
    contractName:"Balloons",
    functionName:"balanceOf",
    args: [DEXInfo?.address]
  });

  const { data: contractETHBalance } = useBalance({
    address: DEXInfo?.address,
  })

  return (
    <>
      <MetaHeader />
      <h1 className="text-center mb-4 mt-9">
            <span className="block text-2xl mb-2">SpeedRunEthereum</span>
            <span className="block text-4xl font-bold">Challenge 4: Minimum Viable Exchange </span>
          </h1>
      <div className="flex flex-col flex-grow items-center pt-10 grid grid-cols-2">
        <div className="px-5 py-5 ml-3">
              
          <div className="space-y-8 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl py-6">
              <div className="flex text-center mb-8 px-4 gap-4 text-xl">
                <span className="block text-2xl mb-2"><Address size="xl" address={DEXInfo?.address}/></span>
                <span className="flex flex-row mx-auto pl-5"> <Balance className="text-xl" address={DEXInfo?.address}/> ⚖️
                {isLoading ? (
                  <span>Loading...</span>
                ) : (
                  <span className="ml-8">
                    🎈  {parseFloat(ethers.utils.formatEther(DEXBalloonBalance?.toString() || 0)).toFixed(4)}
                  </span>
                )}
                </span>

              </div>
              
              <div className=" py-3 px-4">
              <div className="flex mb-4">
                <span>ethToToken  <EtherInput value={ethToTokenAmount} onChange={(value) => setEthToTokenAmount(value)} name="ethToToken"/></span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5" onClick={ethToTokenWrite}>Send</button>
              </div>
              <div className="flex">
                <span>tokenToETH  <IntegerInput value={tokenToETHAmount} onChange={(value) => setTokenToETHAmount(value)} name="tokenToETH"/></span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5" onClick={tokenToEthWrite}>Send</button>
              </div>
            </div>
            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-400"></div>
                <span className="flex-shrink mx-4 text-gray-400">Liquidity ({totalLiquidity ? parseFloat(ethers.utils.formatEther(totalLiquidity?.toString() || 0)).toFixed(4) : "None"})</span>
                <div className="flex-grow border-t border-gray-400"></div>
            </div>

            <div className="px-4 py-3">
              <div className="flex mb-4">
                <span>Deposit  <IntegerInput value={depositAmount} onChange={value => setDepositAmount(value)}/></span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5" onClick={depositWrite}>Send</button>
              </div>

              <div className="flex">
                <span>Withdraw  <IntegerInput value={withdrawAmount} onChange={value => setWithdrawAmount(value)}/></span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5" onClick={withdrawWrite}>Send</button>
              </div>
            </div>
            </div>

            <div className="relative flex pt-8 items-center">
            </div>
            <div className="space-y-8 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl py-5">
            <div className="flex text-center mt-8 gap-5 mb-5 px-4">
                <span className="block text-2xl mb-2">Balloons</span>
                <span className="ml-8"><Address address={BalloonsInfo?.address}/></span>
            </div>

            <div className=" px-4 py-3 grid grid-cols-2">
              <div className="flex flex-col gap-4 mb-4">
                <span className="flex flex-col">Approve  <AddressInput  value={approveSpender ?? ""} onChange={value => setApproveSpender(value)} placeholder="Address Spender"/></span>
                <IntegerInput value={approveAmount} onChange={value => setApproveAmount(value)} placeholder="uint256 Amount"/>
              </div>

              <div className=" my-auto">
              <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-auto ml-5" onClick={approveWrite}>Send</button>
              </div> 
            </div>

            <div className=" px-4 py-3 mt-6">
              <div className="flex mb-4">
                <span className="flex flex-col mt-2">balanceOf <AddressInput value={accountBalanceOf} onChange={value => setAccountBalanceOf(value)} placeholder="address Account"/></span>                
            </div>
              {balanceOfWrite === undefined
                ? (
                  <h1></h1>
                ):
                (
                  <span className="font-bold bg-primary px-3 rounded-2xl">BAL Balance:  {parseFloat(ethers.utils.formatEther(balanceOfWrite?.toString() || 0)).toFixed(4)}</span>
                )
                }
            </div>
            </div>
        </div>

        <div className="px-5 mx-auto">
          <Curve
            addingEth={ethToTokenAmount !== "" ? parseFloat(ethToTokenAmount.toString()) : 0}
            addingToken={tokenToETHAmount !== "" ? parseFloat(tokenToETHAmount.toString()) : 0}
            ethReserve={parseFloat(ethers.utils.formatEther(contractETHBalance?.value || BigNumber.from("0")))}
            tokenReserve={parseFloat(ethers.utils.formatEther(contractBalance || BigNumber.from("0") ))}
            width={500}
            height={500}
          />
        </div>
      </div>
    </>
  );
};

export default Dex;
