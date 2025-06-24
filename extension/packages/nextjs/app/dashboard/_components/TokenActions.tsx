import React from "react";
import { TokenSwapModal } from "./Modals/TokenSwapModal";
import { TokenTransferModal } from "./Modals/TokenTransferModal";
import TooltipInfo from "./TooltipInfo";
import { formatEther } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { ArrowsRightLeftIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useAnimationConfig } from "~~/hooks/scaffold-eth";
import { tokenName } from "~~/utils/constant";

const TokenActions = () => {
  const { address, chain: ConnectedChain } = useAccount();
  const transferModalId = `${tokenName}-transfer-modal`;
  const swapModalId = `${tokenName}-swap-modal`;

  const { data: cornBalance } = useScaffoldReadContract({
    contractName: "Corn",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: cornPrice } = useScaffoldReadContract({
    contractName: "CornDEX",
    functionName: "currentPrice",
  });

  const tokenBalance = `${Math.floor(Number(formatEther(cornBalance || 0n)) * 100) / 100}`;
  const { showAnimation } = useAnimationConfig(cornBalance);

  return (
    <div className="card bg-base-100 w-96 shadow-xl indicator">
      <TooltipInfo top={3} right={3} infoText={`Here you can send ${tokenName} to any address or swap it`} />
      <div className="card-body">
        <div className="w-full flex justify-between">
          <h2 className="card-title">Your {tokenName} Wallet</h2>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Balance</span>
          </label>
          <div className="text-lg font-semibold">
            <span
              className={`transition bg-transparent ${showAnimation ? "bg-warning rounded-xs animate-pulse-fast" : ""}`}
            >
              {tokenBalance} {tokenName}
            </span>
          </div>
        </div>

        <div className="form-control">
          <div className="flex gap-2 items-center">
            <label htmlFor={`${transferModalId}`} className="btn btn-primary flex-1">
              <PaperAirplaneIcon className="h-4 w-4 mr-2" />
              Transfer
            </label>
            {ConnectedChain?.id === hardhat.id && (
              <label htmlFor={`${swapModalId}`} className="btn btn-primary flex-1">
                <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
                Swap
              </label>
            )}
          </div>
        </div>
      </div>
      <TokenTransferModal tokenBalance={tokenBalance} connectedAddress={address || ""} modalId={`${transferModalId}`} />
      <TokenSwapModal
        tokenBalance={tokenBalance}
        connectedAddress={address || ""}
        ETHprice={Number(formatEther(cornPrice || 0n)).toFixed(2)}
        modalId={`${swapModalId}`}
      />
    </div>
  );
};

export default TokenActions;
