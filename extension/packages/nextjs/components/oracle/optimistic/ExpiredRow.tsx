import { useState } from "react";
import { formatEther } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export const ExpiredRow = ({ assertionId }: { assertionId: number }) => {
  const [isClaiming, setIsClaiming] = useState(false);

  const { data: assertionData } = useScaffoldReadContract({
    contractName: "OptimisticOracle",
    functionName: "getAssertion",
    args: [BigInt(assertionId)],
  });

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "OptimisticOracle",
  });

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await writeContractAsync({
        functionName: "claimRefund",
        args: [BigInt(assertionId)],
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsClaiming(false);
    }
  };

  if (!assertionData) return null;

  return (
    <tr key={assertionId} className={`border-b border-base-300`}>
      {/* Description Column */}
      <td>{assertionData.description}</td>

      {/* Asserter Column */}
      <td>
        <Address address={assertionData.asserter} format="short" onlyEnsOrAddress disableAddressLink size="sm" />
      </td>

      {/* Reward Column */}
      <td>{formatEther(assertionData.reward)} ETH</td>

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
