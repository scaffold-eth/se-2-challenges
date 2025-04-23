import React, { useState } from "react";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const LiquidateOperations = () => {
  const [targetAddress, setTargetAddress] = useState("");

  const { data: isLiquidatable } = useScaffoldReadContract({
    contractName: "Lending",
    functionName: "isLiquidatable",
    args: [targetAddress || "0x0000000000000000000000000000000000000000"],
  });

  const { writeContractAsync: liquidate } = useScaffoldWriteContract({
    contractName: "Lending",
  });

  const handleLiquidate = async () => {
    try {
      await liquidate({
        functionName: "liquidate",
        args: [targetAddress],
      });
      setTargetAddress("");
    } catch (error) {
      console.error("Error liquidating position:", error);
    }
  };

  return (
    <div className="card bg-base-100 w-96 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Liquidate Position</h2>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Target Address</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Address"
              className="input input-bordered w-full"
              value={targetAddress}
              onChange={e => setTargetAddress(e.target.value)}
            />
          </div>
          {targetAddress && (
            <div className="mt-2">
              <span className="text-sm">Status: {isLiquidatable ? "Liquidatable ⚠️" : "Safe ✅"}</span>
            </div>
          )}
          <button
            className="btn btn-primary mt-4"
            onClick={handleLiquidate}
            disabled={!targetAddress || !isLiquidatable}
          >
            Liquidate Position
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiquidateOperations;
