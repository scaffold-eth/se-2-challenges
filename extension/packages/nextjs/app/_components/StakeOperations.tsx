import React, { useEffect, useState } from "react";
import TooltipInfo from "./TooltipInfo";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const StakeOperations = () => {
  const { address } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawDisabled, setWithdrawDisabled] = useState(true);

  const { writeContractAsync: writeMyUSDContract } = useScaffoldWriteContract({
    contractName: "MyUSD",
  });

  const { data: myUSDCStakingContract } = useScaffoldContract({ contractName: "MyUSDStaking" });

  const { writeContractAsync: writeStakingContract } = useScaffoldWriteContract({
    contractName: "MyUSDStaking",
  });

  const { data: shareBalance } = useScaffoldReadContract({
    contractName: "MyUSDStaking",
    functionName: "userShares",
    args: [address],
  });

  useEffect(() => {
    setWithdrawDisabled(shareBalance === 0n);
  }, [shareBalance]);

  const handleStake = async () => {
    if (!myUSDCStakingContract) {
      notification.error("MyUSDStaking contract not found");
      return;
    }
    try {
      await writeMyUSDContract({
        functionName: "approve",
        args: [myUSDCStakingContract.address, stakeAmount ? parseEther(stakeAmount) : 0n],
      });

      await writeStakingContract({
        functionName: "stake",
        args: [stakeAmount ? parseEther(stakeAmount) : 0n],
      });
      setStakeAmount("");
    } catch (error) {
      console.error("Error staking:", error);
    }
  };

  const handleWithdraw = async () => {
    try {
      await writeStakingContract({
        functionName: "withdraw",
      });
    } catch (error) {
      console.error("Error withdrawing:", error);
    }
  };

  return (
    <div className="card bg-base-100 w-96 shadow-xl indicator">
      <TooltipInfo top={3} right={3} infoText="Use these controls to stake or unstake MyUSD" />
      <div className="card-body">
        <h2 className="card-title">Stake Operations</h2>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Stake (MyUSD)</span>
          </label>
          <div className="flex gap-2 items-center">
            <IntegerInput value={stakeAmount} onChange={setStakeAmount} placeholder="Amount" disableMultiplyBy1e18 />
            <button className="btn btn-sm btn-primary" onClick={handleStake} disabled={!stakeAmount}>
              Stake
            </button>
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Withdraw (MyUSD)</span>
          </label>
          <div className="flex gap-2 items-center">
            <button className="btn btn-sm btn-primary" onClick={handleWithdraw} disabled={withdrawDisabled}>
              Withdraw
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakeOperations;
