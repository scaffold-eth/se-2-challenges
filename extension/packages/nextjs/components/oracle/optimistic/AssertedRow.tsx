import { TimeLeft } from "./TimeLeft";
import { formatEther } from "viem";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useChallengeState } from "~~/services/store/challengeStore";

export const AssertedRow = ({ assertionId, state }: { assertionId: number; state: number }) => {
  const { openAssertionModal } = useChallengeState();

  const { data: assertionData } = useScaffoldReadContract({
    contractName: "OptimisticOracle",
    functionName: "getAssertion",
    args: [BigInt(assertionId)],
  });

  if (!assertionData) return null;

  return (
    <tr
      key={assertionId}
      onClick={() => {
        openAssertionModal({ ...assertionData, assertionId, state });
      }}
      className={`group border-b border-base-300 cursor-pointer`}
    >
      {/* Description Column */}
      <td>
        <div className="group-hover:text-error">{assertionData.description}</div>
      </td>

      {/* Bond Column */}
      <td>{formatEther(assertionData.bond)} ETH</td>

      {/* Reward Column */}
      <td>{formatEther(assertionData.reward)} ETH</td>

      {/* Time Left Column */}
      <td>
        <TimeLeft startTime={assertionData.startTime} endTime={assertionData.endTime} />
      </td>

      {/* Chevron Column */}
      <td>
        <div className="w-6 h-6 rounded-full border-error border flex items-center justify-center hover:bg-base-200 group-hover:bg-error transition-colors mx-auto">
          <ChevronRightIcon className="w-4 h-4 text-error group-hover:text-white stroke-2 transition-colors" />
        </div>
      </td>
    </tr>
  );
};
