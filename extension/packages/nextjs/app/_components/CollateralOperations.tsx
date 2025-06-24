import React, { useState } from "react";
import TooltipInfo from "./TooltipInfo";
import { parseEther } from "viem";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const CollateralOperations = () => {
  const [collateralAmount, setCollateralAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const { writeContractAsync: writeStablecoinEngineContract } = useScaffoldWriteContract({
    contractName: "MyUSDEngine",
  });

  const handleAddCollateral = async () => {
    try {
      await writeStablecoinEngineContract({
        functionName: "addCollateral",
        value: collateralAmount ? parseEther(collateralAmount) : 0n,
      });
      setCollateralAmount("");
    } catch (error) {
      console.error("Error adding collateral:", error);
    }
  };

  const handleWithdrawCollateral = async () => {
    try {
      await writeStablecoinEngineContract({
        functionName: "withdrawCollateral",
        args: [withdrawAmount ? parseEther(withdrawAmount) : 0n],
      });
      setWithdrawAmount("");
    } catch (error) {
      console.error("Error withdrawing collateral:", error);
    }
  };

  return (
    <div className="card bg-base-100 w-96 shadow-xl indicator">
      <TooltipInfo
        top={3}
        right={3}
        infoText="Use these controls to add or withdraw collateral from the MyUSDEngine pool"
      />
      <div className="card-body">
        <h2 className="card-title">Collateral Operations (ETH)</h2>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Add Collateral</span>
          </label>
          <div className="flex gap-2 items-center">
            <IntegerInput
              value={collateralAmount}
              onChange={setCollateralAmount}
              placeholder="Amount"
              disableMultiplyBy1e18
            />
            <button className="btn btn-sm btn-primary" onClick={handleAddCollateral} disabled={!collateralAmount}>
              Add
            </button>
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Withdraw Collateral</span>
          </label>
          <div className="flex gap-2 items-center">
            <IntegerInput
              value={withdrawAmount}
              onChange={setWithdrawAmount}
              placeholder="Amount"
              disableMultiplyBy1e18
            />
            <button className="btn btn-sm btn-primary" onClick={handleWithdrawCollateral} disabled={!withdrawAmount}>
              Withdraw
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollateralOperations;
