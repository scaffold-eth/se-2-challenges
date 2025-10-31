"use client";

import { useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import TooltipInfo from "~~/components/TooltipInfo";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const SelfNodeReporter = () => {
  const { address: connectedAddress } = useAccount();
  const [stakeAmount, setStakeAmount] = useState<string>("1");
  const [newPrice, setNewPrice] = useState<string>("");
  // Helper to get node index for connected address
  const { data: nodeAddresses } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getNodeAddresses",
    watch: true,
  });
  const [initialPrice, setInitialPrice] = useState<string>("");
  // Add exit node handler
  const handleExitNode = async () => {
    if (!isRegistered) {
      return;
    }
    if (!nodeAddresses || !connectedAddress) {
      return;
    }
    // Find index of connected address in nodeAddresses
    const index = nodeAddresses.findIndex((addr: string) => addr.toLowerCase() === connectedAddress.toLowerCase());
    if (index === -1) {
      return;
    }
    try {
      await writeStaking({ functionName: "exitNode", args: [BigInt(index)] });
    } catch (e: any) {
      console.error(e);
    }
  };

  const { data: nodeData } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "nodes",
    args: [connectedAddress ?? "0x0000000000000000000000000000000000000000"] as any,
    watch: true,
  });

  // firstBucket is at index 4 of OracleNode struct
  const firstBucket = (nodeData?.[4] as bigint | undefined) ?? undefined;
  const lastReportedBucket = (nodeData?.[1] as bigint | undefined) ?? undefined;
  const stakedAmountRaw = (nodeData?.[0] as bigint | undefined) ?? undefined;

  const { writeContractAsync: writeStaking } = useScaffoldWriteContract({ contractName: "StakingOracle" });

  const isRegistered = useMemo(() => {
    return Boolean(firstBucket && firstBucket > 0n);
  }, [firstBucket]);

  // Fetch last reported price using helper view: getAddressDataAtBucket(address, bucket)
  const { data: addressDataAtBucket } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getAddressDataAtBucket",
    args: [connectedAddress ?? "0x0000000000000000000000000000000000000000", lastReportedBucket ?? 0n] as any,
    watch: true,
  });
  const lastReportedPrice = (addressDataAtBucket?.[0] as bigint | undefined) ?? undefined;

  const handleStake = async () => {
    if (!connectedAddress) {
      return;
    }
    const amount = Number(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }
    const priceNum = Number(initialPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      notification.error("Enter a valid initial price (USD)");
      return;
    }
    try {
      await writeStaking({
        functionName: "registerNode",
        args: [parseEther(priceNum.toString())],
        value: parseEther(amount.toString()),
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleReport = async () => {
    const price = Number(newPrice);
    if (isNaN(price)) {
      notification.error("Enter a valid price");
      return;
    }
    try {
      await writeStaking({ functionName: "reportPrice", args: [parseEther(price.toString())] });
      setNewPrice("");
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <div className="bg-base-100 rounded-lg p-4 relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">My Node</h2>
          <TooltipInfo infoText="Manage your own node with the connected wallet: stake to register, then report prices." />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-500">Node Address</div>
          <div className="font-mono break-all">{connectedAddress ?? "Not connected"}</div>
          <div className="text-sm text-gray-500">Staked ETH</div>
          <div className="font-semibold">
            {stakedAmountRaw !== undefined ? Number(formatEther(stakedAmountRaw)).toFixed(4) : "—"}
          </div>
          <div className="text-sm text-gray-500">Last Reported Price (USD)</div>
          <div className="font-semibold">
            {lastReportedPrice !== undefined ? Number(formatEther(lastReportedPrice)).toFixed(2) : "—"}
          </div>
          <div className="text-sm text-gray-500">ORA Balance</div>
          <div className="font-semibold">{/* Displayed in NodeRow via ERC20 read; keep simple here */}—</div>
          {/* Claim rewards and Exit Node buttons (shown if registered) */}
          {isRegistered && (
            <div className="flex gap-2 mt-2">
              <button className="btn btn-secondary btn-sm" onClick={handleExitNode} disabled={!connectedAddress}>
                Exit Node
              </button>
              {/* Placeholder for Claim Rewards button if/when implemented */}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {!isRegistered ? (
            <div className="flex items-end gap-2">
              <div>
                <div className="text-sm text-gray-500">Stake Amount (ETH)</div>
                <input
                  className="input input-bordered input-sm w-40"
                  type="text"
                  value={stakeAmount}
                  onChange={e => setStakeAmount(e.target.value)}
                />
              </div>
              <div>
                <div className="text-sm text-gray-500">Initial Price (USD)</div>
                <input
                  className="input input-bordered input-sm w-40"
                  type="text"
                  value={initialPrice}
                  onChange={e => setInitialPrice(e.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleStake} disabled={!connectedAddress}>
                Stake & Register
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div>
                <div className="text-sm text-gray-500">Report Price (USD)</div>
                <input
                  className="input input-bordered input-sm w-40"
                  type="text"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleReport} disabled={!connectedAddress}>
                Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
