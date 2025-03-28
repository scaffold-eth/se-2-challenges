import React, { useEffect, useState } from "react";
import TooltipInfo from "./TooltipInfo";
import UserPosition from "./UserPosition";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const UserPositionsTable = () => {
  const { address: connectedAddress } = useAccount();
  const [users, setUsers] = useState<string[]>([]);
  const { data: events, isLoading } = useScaffoldEventHistory({
    contractName: "Lending",
    eventName: "CollateralAdded",
    fromBlock: 0n, // should be the block number where the contract was deployed
    watch: true,
    blockData: false,
    transactionData: false,
    receiptData: false,
  });
  const { data: ethPrice } = useScaffoldReadContract({
    contractName: "CornDEX",
    functionName: "currentPrice",
  });

  useEffect(() => {
    if (!events) return;
    console.log(events);
    setUsers(prevUsers => {
      const uniqueUsers = new Set([...prevUsers]);
      events
        .map(event => {
          console.log(event.args);
          return event.args.user;
        })
        .filter((user): user is string => !!user)
        .forEach(user => uniqueUsers.add(user));
      return uniqueUsers.size > prevUsers.length ? Array.from(uniqueUsers) : prevUsers;
    });
  }, [events, users]);

  return (
    <div className="card bg-base-100 w-full shadow-xl indicator">
      <TooltipInfo
        top={3}
        right={3}
        infoText="This table displays all users with a position in the lending pool. It also allows users to liquidate positions that have fallen into the liquidation zone using the provided button"
      />
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Collateral</th>
              <th>Debt</th>
              <th>Ratio</th>
              <th></th>
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
                <td>
                  <div className="skeleton w-16 h-6"></div>
                </td>
                <td>
                  <div className="skeleton w-16 h-6"></div>
                </td>
                <td>
                  <div className="skeleton w-24 h-6"></div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">
                  No user positions available.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <UserPosition
                  key={user}
                  user={user}
                  connectedAddress={connectedAddress || ""}
                  ethPrice={Number(formatEther(ethPrice || 0n))}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserPositionsTable;
