import React, { useState } from "react";
import RatioChange from "./RatioChange";
import TooltipInfo from "./TooltipInfo";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { tokenName } from "~~/utils/constant";

const BorrowOperations = () => {
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  const { address } = useAccount();

  const { data: ethPrice } = useScaffoldReadContract({
    contractName: "CornDEX",
    functionName: "currentPrice",
  });

  const { writeContractAsync: writeLendingContract } = useScaffoldWriteContract({
    contractName: "Lending",
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
    try {
      await writeLendingContract({
        functionName: "repayCorn",
        args: [repayAmount ? parseEther(repayAmount) : 0n],
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
                inputBorrowAmount={Number(borrowAmount)}
              />
            )}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              className="input input-bordered w-full"
              value={borrowAmount}
              onChange={e => setBorrowAmount(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleBorrow} disabled={!borrowAmount}>
              Borrow
            </button>
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Repay Debt</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              className="input input-bordered w-full"
              value={repayAmount}
              onChange={e => setRepayAmount(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleRepay} disabled={!repayAmount}>
              Repay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowOperations;
