import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { MetaHeader } from "~~/components/MetaHeader";
import { Address, Balance, EtherInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldContract, useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [ethToTokenAmount, setEthToTokenAmount] = useState("");
  const [tokenToETHAmount, setTokenToETHAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [approveSpender, setApproveSpender] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [accountBalanceOf, setAccountBalanceOf] = useState("");

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

  return (
    <>
      <MetaHeader />
      <h1 className="text-center mb-4 mt-9">
            <span className="block text-2xl mb-2">SpeedRunEthereum</span>
            <span className="block text-4xl font-bold">Challenge 4: Minimum Viable Exchange </span>
          </h1>
      <div className="flex items-center flex-col flex-grow pt-10 grid grid-cols-2">
        <div className="px-5 border rounded-3xl py-5 ml-3">
              <div className="flex text-center mb-8 px-4 gap-4">
                <span className="block text-2xl mb-2"><Address address={DEXInfo?.address}/></span>
                <span><Balance address={DEXInfo?.address}/></span>
                {isLoading ? (
                  <span>Loading...</span>
                ) : (
                  <span>Balloons: {ethers.utils.formatEther(DEXBalloonBalance?.toString() || 0)}</span>
                )}
              </div>
              <div className="border rounded-3xl py-3 px-4">
              <div className="flex mb-4">
                <span>ethToToken  <EtherInput value={ethToTokenAmount} onChange={(value) => setEthToTokenAmount(value)}/></span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5" onClick={ethToTokenWrite}>Send</button>
              </div>
              <div className="flex">
                <span>tokenToETH  <EtherInput value={tokenToETHAmount} onChange={(value) => setTokenToETHAmount(value)}/></span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5" onClick={tokenToEthWrite}>Send</button>
              </div>
            </div>
            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-400"></div>
                <span className="flex-shrink mx-4 text-gray-400">Liquidity(None)</span>
                <div className="flex-grow border-t border-gray-400"></div>
            </div>

            <div className="border rounded-3xl px-4 py-3">

              <div className="flex mb-4">
                
                <span>Deposit  <EtherInput value={depositAmount} onChange={(value) => setDepositAmount(value)}/></span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5" onClick={depositWrite}>Send</button>
              </div>

              <div className="flex">
                <span>Withdraw  <EtherInput value={withdrawAmount} onChange={(value) => setWithdrawAmount(value)}/></span>
                <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-6 mx-5" onClick={withdrawWrite}>Send</button>
              </div>
            </div>

            <div className="relative flex pt-8 items-center">
                <div className="flex-grow border-t border-gray-400"></div>
                <div className="flex-grow border-t border-gray-400"></div>
            </div>

            <div className="flex text-center mt-8 gap-5 mb-5">
                <span className="block text-2xl mb-2">Balloons</span>
                <span className="ml-8"><Address address={BalloonsInfo?.address}/></span>
            </div>

            <div className="border rounded-3xl px-4 py-3 grid grid-cols-2">
              <div className="flex flex-col gap-4 mb-4">
                <span className="flex flex-col">Approve  <input className="pl-4 py-4 px-8 text-accent bg-transparent border border-blue-100 rounded-2xl h-[2.2rem] min-h-[2.2rem]" value={approveSpender} onChange={(event) => setApproveSpender(event.target.value)} placeholder="Address Spender"/></span>
                <EtherInput value={approveAmount} onChange={(value) => setApproveAmount(value)} placeholder="uint256 Amount"/>
              </div>

              <div className=" my-auto">
              <button className="btn btn-primary h-[2.2rem] min-h-[2.2rem] mt-auto ml-5" onClick={approveWrite}>Send</button>
              </div> 
            </div>

            <div className="border rounded-3xl px-4 py-3 mt-6">
              <div className="flex mb-4">
                <span className="flex flex-col mt-2">balanceOf <input className="pl-4 py-4 px-8 text-accent bg-transparent border border-blue-100 rounded-2xl h-[2.2rem] min-h-[2.2rem]" value={accountBalanceOf} onChange={(event) => setAccountBalanceOf(event.target.value)} placeholder="address Account"/></span>                
            </div>
              {balanceOfWrite === undefined
                ? (
                  <h1></h1>
                ):
                (
                  <span className="font-bold bg-primary px-3 rounded-2xl">BAL Balance:  {ethers.utils.formatEther(balanceOfWrite || BigNumber.from("0"))}</span>
                )
                }
            </div>
        </div>




        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-2xl mb-2">SpeedRunEthereum</span>
            <span className="block text-4xl font-bold">Challenge 4: Minimum Viable Exchange </span>
          </h1>
          <p className="text-center text-lg">
            PLOT WILL BE HERE!
          </p>
          
        </div>
      </div>
    </>
  );
};

export default Home;
