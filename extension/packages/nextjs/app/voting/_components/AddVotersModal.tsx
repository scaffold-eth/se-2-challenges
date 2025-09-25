"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { PlusIcon, TrashIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

type VoterEntry = {
  address: string;
  status: boolean;
};

export const AddVotersModal = () => {
  const { address: connectedAddress } = useAccount();
  const [voters, setVoters] = useState<VoterEntry[]>([{ address: "", status: true }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if the connected user is the owner of the contract
  const { data: contractOwner } = useScaffoldReadContract({
    contractName: "Voting",
    functionName: "owner",
  });

  const { writeContractAsync: writeVotingAsync } = useScaffoldWriteContract({
    contractName: "Voting",
  });

  // Only show the modal if the connected user is the owner
  const isOwner = connectedAddress && contractOwner && connectedAddress.toLowerCase() === contractOwner.toLowerCase();

  const addVoterEntry = () => {
    setVoters([...voters, { address: "", status: true }]);
  };

  const removeVoterEntry = (index: number) => {
    if (voters.length > 1) {
      setVoters(voters.filter((_, i) => i !== index));
    }
  };

  const updateVoterAddress = (index: number, address: string) => {
    const updatedVoters = [...voters];
    updatedVoters[index].address = address;
    setVoters(updatedVoters);
  };

  const updateVoterStatus = (index: number, status: boolean) => {
    const updatedVoters = [...voters];
    updatedVoters[index].status = status;
    setVoters(updatedVoters);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Filter out empty addresses
      const validVoters = voters.filter(voter => voter.address.trim() !== "");

      if (validVoters.length === 0) {
        alert("Please add at least one valid voter address.");
        return;
      }

      const addresses = validVoters.map(voter => voter.address as `0x${string}`);
      const statuses = validVoters.map(voter => voter.status);

      await writeVotingAsync({
        functionName: "addVoters",
        args: [addresses, statuses],
      });

      // Reset form
      setVoters([{ address: "", status: true }]);

      // Close modal
      const modal = document.getElementById("add-voters-modal") as HTMLInputElement;
      if (modal) modal.checked = false;
    } catch (error) {
      console.error("Error adding voters:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {!isOwner ? (
        <div className="tooltip tooltip-top tooltip-primary" data-tip="Connected address is not the owner">
          <label className="btn btn-sm font-normal gap-1 btn-disabled cursor-not-allowed">
            <UserPlusIcon className="h-4 w-4" />
            <span>Add Voters</span>
          </label>
        </div>
      ) : (
        <label htmlFor="add-voters-modal" className="btn btn-primary btn-sm font-normal gap-1">
          <UserPlusIcon className="h-4 w-4" />
          <span>Add Voters</span>
        </label>
      )}
      {isOwner && (
        <>
          <input type="checkbox" id="add-voters-modal" className="modal-toggle" />
          <label htmlFor="add-voters-modal" className="modal cursor-pointer">
            <label className="modal-box relative max-w-2xl">
              {/* dummy input to capture event onclick on modal box */}
              <input className="h-0 w-0 absolute top-0 left-0" />
              <h3 className="text-xl font-bold mb-3">Add Voters</h3>
              <label htmlFor="add-voters-modal" className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
                ✕
              </label>

              <div className="space-y-4">
                <p className="text-sm opacity-70">
                  Add addresses that are allowed to vote in this proposal. You can grant or revoke voting permissions.
                </p>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {voters.map((voter, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-base-300 rounded-lg">
                      <div className="flex-1">
                        <AddressInput
                          placeholder="Voter Address (0x...)"
                          value={voter.address}
                          onChange={value => updateVoterAddress(index, value as string)}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="label cursor-pointer gap-2">
                          <span className="label-text text-sm">Allow</span>
                          <input
                            type="radio"
                            name={`voter-status-${index}`}
                            className="radio radio-sm radio-success"
                            checked={voter.status === true}
                            onChange={() => updateVoterStatus(index, true)}
                          />
                        </label>
                        <label className="label cursor-pointer gap-2">
                          <span className="label-text text-sm">Revoke</span>
                          <input
                            type="radio"
                            name={`voter-status-${index}`}
                            className="radio radio-sm radio-error"
                            checked={voter.status === false}
                            onChange={() => updateVoterStatus(index, false)}
                          />
                        </label>
                      </div>

                      <button
                        onClick={() => removeVoterEntry(index)}
                        className="btn btn-ghost btn-sm btn-circle"
                        disabled={voters.length === 1}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <button onClick={addVoterEntry} className="btn btn-outline btn-sm gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Add Another Voter
                  </button>

                  <div className="flex gap-2">
                    <label htmlFor="add-voters-modal" className="btn btn-ghost btn-sm">
                      Cancel
                    </label>
                    <button onClick={handleSubmit} className="btn btn-primary btn-sm" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <UserPlusIcon className="h-4 w-4" />
                      )}
                      <span>{isSubmitting ? "Adding..." : "Add Voters"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </label>
          </label>
        </>
      )}
    </div>
  );
};
