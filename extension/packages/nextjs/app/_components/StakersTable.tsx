import React, { useEffect, useState } from "react";
import TooltipInfo from "./TooltipInfo";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Address as AddressBlock } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const StakerRow = ({ staker, connectedAddress }: { staker: string; connectedAddress: string }) => {
  const { data: stakedAmount } = useScaffoldReadContract({
    contractName: "MyUSDStaking",
    functionName: "getBalance",
    args: [staker],
  });

  return (
    <tr key={staker} className={`${connectedAddress === staker ? "bg-blue-100 dark:bg-blue-900" : ""}`}>
      <td>
        <AddressBlock address={staker} disableAddressLink format="short" size="sm" />
      </td>
      <td>{Number(formatEther(stakedAmount || 0n)).toFixed(2)}</td>
    </tr>
  );
};

const StakersStable = () => {
  const { address: connectedAddress } = useAccount();
  const [stakers, setStakers] = useState<string[]>([]);
  const { data: events, isLoading } = useScaffoldEventHistory({
    contractName: "MyUSDStaking",
    eventName: "Staked",
    fromBlock: 0n, // should be the block number where the contract was deployed
    watch: true,
    blockData: false,
    transactionData: false,
    receiptData: false,
  });

  useEffect(() => {
    if (!events) return;

    setStakers(prevStakers => {
      const uniqueStakers = new Set([...prevStakers]);
      events
        .map(event => event.args.user)
        .filter((user): user is string => !!user)
        .forEach(staker => uniqueStakers.add(staker));
      return uniqueStakers.size > prevStakers.length ? Array.from(uniqueStakers) : prevStakers;
    });
  }, [events, stakers]);

  return (
    <div className="card bg-base-100 w-full shadow-xl indicator">
      <TooltipInfo top={3} right={3} infoText="Monitor all active stakers and their MyUSD token contributions" />
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Staked (MyUSD)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading || events === undefined ? (
              <tr key={"skeleton"}>
                <td>
                  <div className="skeleton w-36 h-6"></div>
                </td>
                <td>
                  <div className="skeleton w-16 h-6"></div>
                </td>
              </tr>
            ) : stakers.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center">
                  No stakers found
                </td>
              </tr>
            ) : (
              stakers.map(staker => (
                <StakerRow key={staker} staker={staker} connectedAddress={connectedAddress || ""} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StakersStable;
