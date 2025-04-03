import React from "react";
import { formatEther } from "viem";
import { Address as AddressBlock } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { collateralRatio, tokenName } from "~~/utils/constant";
import { calculatePositionRatio, getRatioColorClass } from "~~/utils/helpers";
import { notification } from "~~/utils/scaffold-eth";

type UserPositionProps = {
  user: string;
  ethPrice: number;
  connectedAddress: string;
};

const UserPosition = ({ user, ethPrice, connectedAddress }: UserPositionProps) => {
  const { data: userCollateral } = useScaffoldReadContract({
    contractName: "Lending",
    functionName: "s_userCollateral",
    args: [user],
  });

  const { data: userBorrowed } = useScaffoldReadContract({
    contractName: "Lending",
    functionName: "s_userBorrowed",
    args: [user],
  });

  const { data: basicLendingContract } = useDeployedContractInfo({
    contractName: "Lending",
  });

  const { data: allowance } = useScaffoldReadContract({
    contractName: "Corn",
    functionName: "allowance",
    args: [user, basicLendingContract?.address],
  });

  const { writeContractAsync: writeLendingContract, isPending: isLiquidating } = useScaffoldWriteContract({
    contractName: "Lending",
  });
  const { writeContractAsync: writeCornContract } = useScaffoldWriteContract({
    contractName: "Corn",
  });

  const borrowedAmount = Number(formatEther(userBorrowed || 0n));
  const ratio =
    borrowedAmount === 0
      ? "N/A"
      : calculatePositionRatio(Number(formatEther(userCollateral || 0n)), borrowedAmount, ethPrice).toFixed(1);

  const isPositionSafe = ratio == "N/A" || Number(ratio) >= collateralRatio;
  const liquidatePosition = async () => {
    if (allowance === undefined || userBorrowed === undefined || basicLendingContract === undefined) return;
    try {
      if (allowance < userBorrowed) {
        await writeCornContract({
          functionName: "approve",
          args: [basicLendingContract?.address, userBorrowed],
        });
      }
      await writeLendingContract({
        functionName: "liquidate",
        args: [user],
      });
      notification.success(<>
        <p className="font-bold mt-0 mb-1">Liquidation successful</p>
        <p className="m-0">
          You repaid {userBorrowed} {tokenName} and received the borrower's ETH collateral
        </p>
      </>);
    } catch (e) {
      console.error("Error liquidating position:", e);
    }
  };

  return (
    <tr key={user} className={`${connectedAddress === user ? "bg-blue-100 dark:bg-blue-900" : ""}`}>
      <td>
        <AddressBlock address={user} disableAddressLink format="short" size="sm" />
      </td>
      <td>{Number(formatEther(userCollateral || 0n)).toFixed(2)} ETH</td>
      <td>
        {Number(formatEther(userBorrowed || 0n)).toFixed(2)} {tokenName}
      </td>
      <td className={getRatioColorClass(ratio)}>{ratio === "N/A" ? "N/A" : `${ratio}%`}</td>
      <td className="flex justify-center">
        <button onClick={liquidatePosition} disabled={isPositionSafe} className="btn btn-sm btn-ghost">
          {isLiquidating ? <span className="loading loading-spinner loading-sm"></span> : "Liquidate"}
        </button>
      </td>
    </tr>
  );
};

export default UserPosition;
