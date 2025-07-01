import React, { useState } from "react";
import RatioChange from "./RatioChange";
import TooltipInfo from "./TooltipInfo";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { tokenName } from "~~/utils/constant";

const BorrowOperations = () => {
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  const { address } = useAccount();

  const { data: ethPrice } = useScaffoldReadContract({
    contractName: "CornDEX",
    functionName: "currentPrice",
  });

  const { data: basicLendingContract } = useDeployedContractInfo({
    contractName: "Lending",
  });

  const { writeContractAsync: writeLendingContract } = useScaffoldWriteContract({
    contractName: "Lending",
  });

  const { writeContractAsync: writeCornContract } = useScaffoldWriteContract({
    contractName: "Corn",
  });

  const { data: allowance } = useScaffoldReadContract({
    contractName: "Corn",
    functionName: "allowance",
    args: [address, basicLendingContract?.address],
  });

  const handleBorrow = async () => {
    try {
      await writeLendingContract({
        functionName: "borrowCorn",
        args: [borrowAmount ? parseEther(borrowAmount) : 0n],
      });
      setBorrowAmount("");
    } catch (error) {
      console.error("Error borrowing corn:", error);
    }
  };

  const handleRepay = async () => {
    if (allowance === undefined || repayAmount === undefined || basicLendingContract === undefined) return;
    try {
      const repayAmountWei = repayAmount ? parseEther(repayAmount) : 0n;
      if (allowance < repayAmountWei) {
        console.log("Approving corn contract");
        await writeCornContract({
          functionName: "approve",
          args: [basicLendingContract?.address, repayAmountWei],
        });
      }
      console.log("Repaying corn");
      await writeLendingContract({
        functionName: "repayCorn",
        args: [repayAmountWei],
      });
      setRepayAmount("");
    } catch (error) {
      console.error("Error repaying corn:", error);
    }
  };

  return (
    <div className="card bg-base-100 w-96 shadow-xl indicator">
      <TooltipInfo
        top={3}
        right={3}
        infoText={`Use these controls to borrow and repay ${tokenName} from the lending pool`}
      />
      <div className="card-body">
        <div className="w-full flex justify-between">
          <h2 className="card-title">Borrow Operations</h2>
        </div>

        <div className="form-control">
          <label className="label flex justify-between">
            <span className="label-text">Borrow {tokenName}</span>{" "}
            {address && (
              <RatioChange
                user={address}
                ethPrice={Number(formatEther(ethPrice || 0n))}
                inputAmount={Number(borrowAmount)}
              />
            )}
          </label>
          <div className="flex gap-2 items-center">
            <IntegerInput value={borrowAmount} onChange={setBorrowAmount} placeholder="Amount" disableMultiplyBy1e18 />
            <button className="btn btn-sm btn-primary" onClick={handleBorrow} disabled={!borrowAmount}>
              Borrow
            </button>
          </div>
        </div>

        <div className="form-control">
          <label className="label flex justify-between">
            <span className="label-text">Repay Debt</span>
            {address && (
              <RatioChange
                user={address}
                ethPrice={Number(formatEther(ethPrice || 0n))}
                inputAmount={-Number(repayAmount)}
              />
            )}
          </label>
          <div className="flex gap-2 items-center">
            <IntegerInput value={repayAmount} onChange={setRepayAmount} placeholder="Amount" disableMultiplyBy1e18 />
            <button className="btn btn-sm btn-primary" onClick={handleRepay} disabled={!repayAmount}>
              Repay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowOperations;
