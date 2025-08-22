import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useChallengeState } from "~~/services/store/challengeStore";

export const DisputedRow = ({ assertionId, state }: { assertionId: number; state: number }) => {
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

      {/* Proposer Column */}
      <td>
        <Address address={assertionData.proposer} format="short" onlyEnsOrAddress disableAddressLink size="sm" />
      </td>

      {/* Disputer Column */}
      <td>
        <Address address={assertionData.disputer} format="short" onlyEnsOrAddress disableAddressLink size="sm" />
      </td>

      {/* Chevron Column */}
      <td className="">
        <div className="w-6 h-6 rounded-full border-error border flex items-center justify-center hover:bg-base-200 group-hover:bg-error transition-colors mx-auto">
          <ChevronRightIcon className="w-4 h-4 text-error group-hover:text-white stroke-2 transition-colors" />
        </div>
      </td>
    </tr>
  );
};
