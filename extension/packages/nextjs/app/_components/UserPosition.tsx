import React from "react";
import { formatEther, parseEther } from "viem";
import { Address as AddressBlock } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { collateralRatio, tokenName } from "~~/utils/constant";
import { calculatePositionRatio, formatDisplayValue, getRatioColorClass } from "~~/utils/helpers";
import { notification } from "~~/utils/scaffold-eth";

type UserPositionProps = {
  user: string;
  ethPrice: number;
  connectedAddress: string;
};

const UserPosition = ({ user, ethPrice, connectedAddress }: UserPositionProps) => {
  const { data: userCollateral } = useScaffoldReadContract({
    contractName: "MyUSDEngine",
    functionName: "s_userCollateral",
    args: [user],
  });

  const { data: userMinted } = useScaffoldReadContract({
    contractName: "MyUSDEngine",
    functionName: "getCurrentDebtValue",
    args: [user],
  });

  const { data: stablecoinEngineContract } = useDeployedContractInfo({
    contractName: "MyUSDEngine",
  });

  const { data: allowance } = useScaffoldReadContract({
    contractName: "MyUSD",
    functionName: "allowance",
    args: [user, stablecoinEngineContract?.address],
  });

  const { writeContractAsync: writeStablecoinEngineContract, isPending: isLiquidating } = useScaffoldWriteContract({
    contractName: "MyUSDEngine",
  });
  const { writeContractAsync: writeStablecoinContract } = useScaffoldWriteContract({
    contractName: "MyUSD",
  });

  const mintedAmount = Number(formatEther(userMinted || 0n));
  const ratio =
    mintedAmount === 0
      ? "N/A"
      : calculatePositionRatio(Number(formatEther(userCollateral || 0n)), mintedAmount, ethPrice);

  const formattedRatio =
    ratio === "N/A" ? "N/A" : typeof ratio === "number" && ratio >= 9999 ? ">9999" : ratio.toFixed(2);

  const isPositionSafe = ratio == "N/A" || Number(ratio) >= collateralRatio;
  const liquidatePosition = async () => {
    if (allowance === undefined || userMinted === undefined || stablecoinEngineContract === undefined) return;
    try {
      if (allowance < userMinted) {
        await writeStablecoinContract({
          functionName: "approve",
          args: [
            stablecoinEngineContract?.address,
            BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
          ],
        });
      }
      await writeStablecoinEngineContract({
        functionName: "liquidate",
        args: [user],
      });
      const mintedValue = Number(formatEther(userMinted || 0n)) / ethPrice;
      const totalCollateral = Number(formatEther(userCollateral || 0n));
      const rewardValue =
        mintedValue * 1.1 > totalCollateral ? totalCollateral.toFixed(2) : (mintedValue * 1.1).toFixed(2);
      const shortAddress = user.slice(0, 6) + "..." + user.slice(-4);
      notification.success(
        <>
          <p className="font-bold mt-0 mb-1">Liquidation successful</p>
          <p className="m-0">You liquidated {shortAddress}&apos;s position.</p>
          <p className="m-0">
            You repaid {Number(formatEther(userMinted)).toFixed(2)} {tokenName} and received {rewardValue} in ETH
            collateral.
          </p>
        </>,
      );
    } catch (e) {
      console.error("Error liquidating position:", e);
    }
  };

  if (userCollateral === parseEther("10000000000000000000")) return null;

  return (
    <tr key={user} className={`${connectedAddress === user ? "bg-primary" : ""}`}>
      <td>
        <AddressBlock address={user} disableAddressLink format="short" size="sm" />
      </td>
      <td>
        <div
          className="tooltip tooltip-primary"
          data-tip={`${Number(formatEther(userCollateral || 0n)).toFixed(2)} ETH`}
        >
          {formatDisplayValue(Number(formatEther(userCollateral || 0n)))}
        </div>
      </td>
      <td>
        <div
          className="tooltip tooltip-primary"
          data-tip={`${Number(formatEther(userMinted || 0n)).toFixed(2)} ${tokenName}`}
        >
          {formatDisplayValue(Number(formatEther(userMinted || 0n)))}
        </div>
      </td>
      <td className={getRatioColorClass(ratio)}>{formattedRatio === "N/A" ? "N/A" : `${formattedRatio}%`}</td>
      <td className="text-center p-1">
        <button onClick={liquidatePosition} disabled={isPositionSafe} className="btn btn-xs btn-ghost">
          {isLiquidating ? <span className="loading loading-spinner loading-sm"></span> : "Liquidate"}
        </button>
      </td>
    </tr>
  );
};

export default UserPosition;
