import React, { useEffect, useState } from "react";
import TooltipInfo from "./TooltipInfo";
import UserPosition from "./UserPosition";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { tokenName } from "~~/utils/constant";

const UserPositionsTable = () => {
  const { address: connectedAddress } = useAccount();
  const [users, setUsers] = useState<string[]>([]);
  const { data: events, isLoading } = useScaffoldEventHistory({
    contractName: "MyUSDEngine",
    eventName: "CollateralAdded",
    watch: true,
    blockData: false,
    transactionData: false,
    receiptData: false,
  });
  const { data: ethPrice } = useScaffoldReadContract({
    contractName: "Oracle",
    functionName: "getETHMyUSDPrice",
  });

  useEffect(() => {
    if (!events) return;

    setUsers(prevUsers => {
      const uniqueUsers = new Set([...prevUsers]);
      events
        .filter(event => event && event.args)
        .map(event => event.args.user)
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
        infoText="Monitor all MyUSDEngine positions and liquidate undercollateralized accounts. Hover over the values (Collateral and Debt) to see the exact amounts."
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
                  <div className="skeleton w-20 h-6"></div>
                </td>
              </tr>
            ) : users.length < 2 ? ( // Only deployer account is has a position, but we hide it
              <tr>
                <td colSpan={5} className="text-center">
                  No user positions available
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
