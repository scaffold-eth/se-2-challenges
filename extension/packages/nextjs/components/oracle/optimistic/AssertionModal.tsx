"use client";

import { useState } from "react";
import { AssertionWithIdAndState } from "../types";
import { formatEther } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useChallengeState } from "~~/services/store/challengeStore";
import { ZERO_ADDRESS } from "~~/utils/scaffold-eth/common";

const getStateName = (state: number) => {
  switch (state) {
    case 0:
      return "Invalid";
    case 1:
      return "Asserted";
    case 2:
      return "Proposed";
    case 3:
      return "Disputed";
    case 4:
      return "Settled";
    case 5:
      return "Expired";
    default:
      return "Invalid";
  }
};

// Helper function to format timestamp to UTC
const formatTimestamp = (timestamp: bigint | string | number) => {
  const timestampNumber = Number(timestamp);
  const date = new Date(timestampNumber * 1000); // Convert from seconds to milliseconds
  return date.toLocaleString();
};

const Description = ({ assertion }: { assertion: AssertionWithIdAndState }) => {
  return (
    <div className="bg-base-200 p-4 rounded-lg space-y-2 mb-4">
      <div>
        <span className="font-bold">AssertionId:</span> {assertion.assertionId}
      </div>

      <div>
        <span className="font-bold">Description:</span> {assertion.description}
      </div>

      <div>
        <span className="font-bold">Bond:</span> {formatEther(assertion.bond)} ETH
      </div>

      <div>
        <span className="font-bold">Reward:</span> {formatEther(assertion.reward)} ETH
      </div>

      <div>
        <span className="font-bold">Start Time:</span>
        <span className="text-sm"> UTC: {formatTimestamp(assertion.startTime)}</span>
        <span className="text-sm"> Timestamp: {assertion.startTime}</span>
      </div>

      <div>
        <span className="font-bold">End Time:</span>
        <span className="text-sm"> UTC: {formatTimestamp(assertion.endTime)}</span>
        <span className="text-sm"> Timestamp: {assertion.endTime}</span>
      </div>

      {assertion.proposer !== ZERO_ADDRESS && (
        <div>
          <span className="font-bold">Proposed Outcome:</span> {assertion.proposedOutcome ? "True" : "False"}
        </div>
      )}

      {assertion.proposer !== ZERO_ADDRESS && (
        <div>
          <span className="font-bold">Proposer:</span>{" "}
          <Address address={assertion.proposer} format="short" onlyEnsOrAddress disableAddressLink size="sm" />
        </div>
      )}

      {assertion.disputer !== ZERO_ADDRESS && (
        <div>
          <span className="font-bold">Disputer:</span>{" "}
          <Address address={assertion.disputer} format="short" onlyEnsOrAddress disableAddressLink size="sm" />
        </div>
      )}
    </div>
  );
};

export const AssertionModal = () => {
  const [isActionPending, setIsActionPending] = useState(false);
  const { refetchAssertionStates, openAssertion, closeAssertionModal } = useChallengeState();

  const isOpen = !!openAssertion;

  const { writeContractAsync: writeOOContractAsync } = useScaffoldWriteContract({
    contractName: "OptimisticOracle",
  });

  const { writeContractAsync: writeDeciderContractAsync } = useScaffoldWriteContract({
    contractName: "Decider",
  });

  const handleAction = async (args: any) => {
    if (!openAssertion) return;

    try {
      setIsActionPending(true);
      if (args.functionName === "settleDispute") {
        await writeDeciderContractAsync(args);
      } else {
        await writeOOContractAsync(args);
      }
      refetchAssertionStates();
      closeAssertionModal();
    } catch (error) {
      console.log(error);
    } finally {
      setIsActionPending(false);
    }
  };

  if (!openAssertion) return null;

  return (
    <>
      <input type="checkbox" id="challenge-modal" className="modal-toggle" checked={isOpen} readOnly />
      <label htmlFor="challenge-modal" className="modal cursor-pointer" onClick={closeAssertionModal}>
        <label
          className="modal-box relative max-w-2xl w-full bg-base-100"
          htmlFor=""
          onClick={e => e.stopPropagation()}
        >
          {/* dummy input to capture event onclick on modal box */}
          <input className="h-0 w-0 absolute top-0 left-0" />

          {/* Close button */}
          <button onClick={closeAssertionModal} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
            ✕
          </button>

          {/* Modal Content */}
          <div className="">
            {/* Header with Current State */}
            <div className="text-center mb-6">
              <h2 className="text-lg">
                Current State: <span className="font-bold">{getStateName(openAssertion.state)}</span>
              </h2>
            </div>

            <Description assertion={openAssertion} />

            {openAssertion.state === 1 && (
              <>
                {/* Proposed Outcome Section */}
                <div className="rounded-lg p-4">
                  <div className="flex justify-center mb-4">
                    <span className="font-medium">Propose Outcome</span>
                  </div>
                  {isActionPending && <span className="loading loading-spinner loading-xs"></span>}

                  <div className="flex justify-center gap-4">
                    <button
                      className="btn btn-primary flex-1"
                      onClick={() =>
                        handleAction({
                          functionName: "proposeOutcome",
                          args: [BigInt(openAssertion.assertionId), true],
                          value: openAssertion.bond,
                        })
                      }
                      disabled={isActionPending}
                    >
                      True
                    </button>
                    <button
                      className="btn btn-primary flex-1"
                      onClick={() =>
                        handleAction({
                          functionName: "proposeOutcome",
                          args: [BigInt(openAssertion.assertionId), false],
                          value: openAssertion.bond,
                        })
                      }
                      disabled={isActionPending}
                    >
                      False
                    </button>
                  </div>
                </div>
              </>
            )}
            {openAssertion.state === 2 && (
              <div className="rounded-lg p-4">
                <div className="flex justify-center mb-4">
                  <span className="font-medium">Submit Dispute</span>
                </div>

                {isActionPending && <span className="loading loading-spinner loading-xs"></span>}

                <div className="flex justify-center gap-4">
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() =>
                      handleAction({
                        functionName: "disputeOutcome",
                        args: [BigInt(openAssertion.assertionId)],
                        value: openAssertion.bond,
                      })
                    }
                    disabled={isActionPending}
                  >
                    {!openAssertion.proposedOutcome ? "True" : "False"}
                  </button>
                </div>
              </div>
            )}
            {openAssertion.state === 3 && (
              <div className="rounded-lg p-4">
                <div className="flex flex-col items-center gap-2 mb-4">
                  <span className="text-2xl font-medium">Impersonate Decider</span>
                  <span className="font-medium">Resolve Answer to</span>
                </div>
                {isActionPending && <span className="loading loading-spinner loading-xs"></span>}

                <div className="flex justify-center gap-4">
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() =>
                      handleAction({
                        functionName: "settleDispute",
                        args: [BigInt(openAssertion.assertionId), true],
                      })
                    }
                    disabled={isActionPending}
                  >
                    True
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() =>
                      handleAction({
                        functionName: "settleDispute",
                        args: [BigInt(openAssertion.assertionId), false],
                      })
                    }
                    disabled={isActionPending}
                  >
                    False
                  </button>
                </div>
              </div>
            )}
          </div>
        </label>
      </label>
    </>
  );
};
