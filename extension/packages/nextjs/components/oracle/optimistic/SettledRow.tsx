"use client";

import { useState } from "react";
import { SettledRowProps } from "../types";
import { LoadingRow } from "./LoadingRow";
import { formatEther } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { ZERO_ADDRESS } from "~~/utils/scaffold-eth/common";

export const SettledRow = ({ assertionId }: SettledRowProps) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const { data: assertionData, isLoading } = useScaffoldReadContract({
    contractName: "OptimisticOracle",
    functionName: "getAssertion",
    args: [BigInt(assertionId)],
  });

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "OptimisticOracle",
  });

  if (isLoading) return <LoadingRow />;
  if (!assertionData) return null;

  const handleClaim = async () => {
    try {
      setIsClaiming(true);
      const functionName = assertionData?.winner === ZERO_ADDRESS ? "claimUndisputedReward" : "claimDisputedReward";
      await writeContractAsync({
        functionName,
        args: [BigInt(assertionId)],
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsClaiming(false);
    }
  };

  const winner = assertionData?.winner === ZERO_ADDRESS ? assertionData?.proposer : assertionData?.winner;
  const outcome =
    assertionData?.winner === ZERO_ADDRESS ? assertionData?.proposedOutcome : assertionData?.resolvedOutcome;

  return (
    <tr key={assertionId} className={`border-b border-base-300`}>
      {/* Query Column */}
      <td>{assertionData?.description}</td>

      {/* Answer Column */}
      <td>{outcome ? "True" : "False"}</td>

      {/* Winner Column */}
      <td>
        <Address address={winner} format="short" onlyEnsOrAddress disableAddressLink size="sm" />
      </td>

      {/* Reward Column */}
      <td>{formatEther(assertionData?.reward)} ETH</td>

      {/* Claimed Column */}
      <td>
        {assertionData?.claimed ? (
          <button className="btn btn-primary btn-xs" disabled>
            Claimed
          </button>
        ) : (
          <button className="btn btn-primary btn-xs" onClick={handleClaim} disabled={isClaiming}>
            Claim
          </button>
        )}
      </td>
    </tr>
  );
};
