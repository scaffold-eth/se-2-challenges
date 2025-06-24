import React, { useState } from "react";
import RatioChange from "./RatioChange";
import TooltipInfo from "./TooltipInfo";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { tokenName } from "~~/utils/constant";
import { notification } from "~~/utils/scaffold-eth";

const MintOperations = () => {
  const [mintAmount, setMintAmount] = useState("");
  const [burnAmount, setBurnAmount] = useState("");

  const { address } = useAccount();

  const { data: ethPrice } = useScaffoldReadContract({
    contractName: "Oracle",
    functionName: "getETHMyUSDPrice",
  });

  const { data: engineContractData } = useScaffoldContract({
    contractName: "MyUSDEngine",
  });

  const { writeContractAsync: writeStablecoinEngineContract } = useScaffoldWriteContract({
    contractName: "MyUSDEngine",
  });

  const { writeContractAsync: writeMyUSDContract } = useScaffoldWriteContract({
    contractName: "MyUSD",
  });

  const { data: currentDebtValue } = useScaffoldReadContract({
    contractName: "MyUSDEngine",
    functionName: "getCurrentDebtValue",
    args: [address],
  });

  const handleMint = async () => {
    try {
      await writeStablecoinEngineContract({
        functionName: "mintMyUSD",
        args: [mintAmount ? parseEther(mintAmount) : 0n],
      });
      setMintAmount("");
    } catch (error) {
      console.error("Error minting MyUSD:", error);
    }
  };

  const handleBurn = async () => {
    try {
      await writeMyUSDContract({
        functionName: "approve",
        args: [engineContractData?.address, burnAmount ? parseEther(burnAmount) : 0n],
      });
      await writeStablecoinEngineContract({
        functionName: "repayUpTo",
        args: [burnAmount ? parseEther(burnAmount) : 0n],
      });
      setBurnAmount("");
    } catch (error) {
      console.error("Error burning MyUSD:", error);
    }
  };

  const handleRepayAll = async () => {
    if (!currentDebtValue) {
      notification.error("No debt value found");
      return;
    }
    const extraRepayment = currentDebtValue + parseEther("0.1");
    try {
      await writeMyUSDContract({
        functionName: "approve",
        args: [engineContractData?.address, extraRepayment],
      });
      await writeStablecoinEngineContract({
        functionName: "repayUpTo",
        args: [extraRepayment],
      });
      setBurnAmount("");
    } catch (error) {
      console.error("Error repaying all:", error);
    }
  };

  return (
    <div className="card bg-base-100 w-96 shadow-xl indicator">
      <TooltipInfo
        top={3}
        right={3}
        infoText={`Use these controls to mint and burn ${tokenName} from the MyUSDEngine pool`}
      />
      <div className="card-body">
        <div className="w-full flex justify-between">
          <h2 className="card-title">Mint Operations ({tokenName})</h2>
        </div>

        <div className="form-control">
          <label className="label flex justify-between">
            <span className="label-text">Mint</span>{" "}
            {address && (
              <RatioChange
                user={address}
                ethPrice={Number(formatEther(ethPrice || 0n))}
                inputAmount={Number(mintAmount)}
              />
            )}
          </label>
          <div className="flex gap-2 items-center">
            <IntegerInput value={mintAmount} onChange={setMintAmount} placeholder="Amount" disableMultiplyBy1e18 />
            <button className="btn btn-sm btn-primary" onClick={handleMint} disabled={!mintAmount}>
              Mint
            </button>
          </div>
        </div>

        <div className="form-control">
          <div className="label flex justify-between">
            <div className="flex gap-2 items-center">
              <span className="label-text">Repay</span>
              <button
                className="btn btn-xs btn-primary text-xs font-medium mb-1"
                disabled={!currentDebtValue}
                onClick={handleRepayAll}
              >
                Repay All
              </button>
            </div>
            {address && (
              <RatioChange
                user={address}
                ethPrice={Number(formatEther(ethPrice || 0n))}
                inputAmount={-Number(burnAmount)}
              />
            )}
          </div>
          <div className="flex gap-2 items-center">
            <IntegerInput value={burnAmount} onChange={setBurnAmount} placeholder="Amount" disableMultiplyBy1e18 />
            <button className="btn btn-sm btn-primary" onClick={handleBurn} disabled={!burnAmount}>
              Repay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MintOperations;
