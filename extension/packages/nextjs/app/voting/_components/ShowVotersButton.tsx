import { useMemo, useState } from "react";
import { EyeIcon, UsersIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const ShowVotersButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const {
    data: voters,
    isLoading,
    error,
  } = useScaffoldEventHistory({
    contractName: "Voting",
    eventName: "VoterAdded",
    watch: true,
    enabled: true,
  });

  const uniqueVoters = useMemo(() => {
    if (!voters) return [];

    const addresses = Array.from(
      new Set(voters.map(row => row.args.voter).filter((voter): voter is string => !!voter)),
    );
    return addresses;
  }, [voters]);

  return (
    <>
      <label htmlFor="show-voters-modal" className="btn btn-outline btn-sm font-normal gap-1" onClick={openModal}>
        <UsersIcon className="h-4 w-4" />
        <span>View Voters ({uniqueVoters.length})</span>
      </label>

      {/* Modal - only mounted when open */}
      {isModalOpen && (
        <ShowVotersModal
          isOpen={isModalOpen}
          onClose={closeModal}
          uniqueVoters={uniqueVoters}
          isLoading={isLoading}
          error={error}
        />
      )}
    </>
  );
};

const VoterStatus = ({ address }: { address: string }) => {
  const { data: voterData } = useScaffoldReadContract({
    contractName: "Voting",
    functionName: "getVoterData",
    args: [address as `0x${string}`],
  });

  const isVoter = voterData?.[0];
  const hasRegistered = voterData?.[1];

  return (
    <div className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
      <div className="flex-1">
        <Address address={address as `0x${string}`} />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xs opacity-70">Status:</span>
          <span className={`badge badge-sm ${isVoter ? "badge-success" : "badge-error"}`}>
            {isVoter ? "Allowed" : "Revoked"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs opacity-70">Registered:</span>
          <span className={`badge badge-sm ${hasRegistered ? "badge-info" : "badge-ghost"}`}>
            {hasRegistered ? "Yes" : "No"}
          </span>
        </div>
      </div>
    </div>
  );
};

const ShowVotersModal = ({
  isOpen,
  onClose,
  uniqueVoters,
  isLoading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  uniqueVoters: string[];
  isLoading: boolean;
  error: Error | null;
}) => {
  return (
    <>
      <input type="checkbox" id="show-voters-modal" className="modal-toggle" checked={isOpen} readOnly />
      <label htmlFor="show-voters-modal" className="modal cursor-pointer" onClick={onClose}>
        <label className="modal-box relative max-w-3xl" onClick={e => e.stopPropagation()}>
          {/* dummy input to capture event onclick on modal box */}
          <input className="h-0 w-0 absolute top-0 left-0" />
          <h3 className="text-xl font-bold flex items-center gap-2">
            <EyeIcon className="h-5 w-5" />
            All Voters
          </h3>
          <label
            htmlFor="show-voters-modal"
            className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3"
            onClick={() => onClose()}
          >
            ✕
          </label>

          <div className="">
            <div className="flex items-center justify-between">
              <p className="text-sm opacity-70">
                List of all addresses that have been added as voters for this proposal.
              </p>
              <div className="stats stats-horizontal">
                <div className="stat py-2 px-3">
                  <div className="stat-title text-xs">Total Voters</div>
                  <div className="stat-value text-lg">{uniqueVoters.length}</div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="loading loading-spinner loading-md"></span>
                <span className="ml-2">Loading voters...</span>
              </div>
            ) : error ? (
              <div className="alert alert-error">
                <span>Error loading voters: {error.message}</span>
              </div>
            ) : uniqueVoters.length === 0 ? (
              <div className="text-center py-8 opacity-70">
                <UsersIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No voters have been added yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <div className="text-sm font-medium opacity-80 pb-2 border-b border-base-300">
                  Voter Addresses & Status
                </div>
                {uniqueVoters.map((voterAddress, index) => (
                  <VoterStatus key={`${voterAddress}-${index}`} address={voterAddress} />
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-base-300 mt-4">
              <div className="text-xs">
                • <span className="text-success">Allowed</span>: Can vote in this proposal
                <br />• <span className="text-error">Revoked</span>: Cannot vote (permissions removed)
                <br />• <span className="text-info">Registered</span>: Has submitted their commitment
              </div>
              <label htmlFor="show-voters-modal" className="btn btn-primary btn-sm" onClick={() => onClose()}>
                Close
              </label>
            </div>
          </div>
        </label>
      </label>
    </>
  );
};
