"use client";

import { useState } from "react";
////// Checkpoint 7 //////
// import { Fr } from "@aztec/bb.js";
// import { ethers } from "ethers";
// import { poseidon2 } from "poseidon-lite";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useChallengeState } from "~~/services/store/challengeStore";
import { saveCommitmentToLocalStorage } from "~~/utils/proofStorage";

const generateCommitment = async (): Promise<CommitmentData> => {
  ////// Checkpoint 7 //////
  const commitmentHex = "0x01"; // placeholder
  const nullifierHex = "0x02"; // placeholder
  const secretHex = "0x03"; // placeholder

  return {
    commitment: commitmentHex,
    nullifier: nullifierHex,
    secret: secretHex,
  };
};

interface CommitmentData {
  commitment: string;
  nullifier: string;
  secret: string;
  index?: number;
}

interface CreateCommitmentProps {
  leafEvents?: any[];
}

export const CreateCommitment = ({ leafEvents = [] }: CreateCommitmentProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [, setIsInserted] = useState(false);
  const { setCommitmentData, commitmentData } = useChallengeState();

  const { address: userAddress, isConnected } = useAccount();

  const { data: deployedContractData } = useDeployedContractInfo({ contractName: "Voting" });

  const { data: voterData } = useScaffoldReadContract({
    contractName: "Voting",
    functionName: "getVoterData",
    args: [userAddress as `0x${string}`],
  });

  const isVoter = voterData?.[0];
  const hasRegistered = voterData?.[1];

  const canRegister = Boolean(isConnected && isVoter !== false && hasRegistered !== true);

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "Voting",
  });

  const handleGenerateCommitment = async () => {
    setIsGenerating(true);
    try {
      const data = await generateCommitment();
      setCommitmentData(data);
      return data;
    } catch (error) {
      console.error("Error generating commitment:", error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertCommitment = async (dataOverride?: CommitmentData) => {
    const localData = dataOverride || commitmentData;
    if (!localData) return;

    setIsInserting(true);
    try {
      await writeContractAsync(
        {
          functionName: "register",
          args: [BigInt(localData.commitment)],
        },
        {
          blockConfirmations: 1,
          onBlockConfirmation: () => {
            if (leafEvents) {
              const newIndex = leafEvents.length;
              const updatedData = { ...localData, index: newIndex };
              setCommitmentData(updatedData);
              setIsInserted(true);

              saveCommitmentToLocalStorage(updatedData, deployedContractData?.address, userAddress);
            }
          },
        },
      );
    } catch (error) {
      console.error("Error inserting commitment:", error);
    } finally {
      setIsInserting(false);
    }
  };

  const handleRegister = async () => {
    const data = await handleGenerateCommitment();
    await handleInsertCommitment(data);
  };

  return (
    <div className="bg-base-100 shadow rounded-xl p-6 space-y-5">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold">Register for this vote</h2>
        <p className="text-sm opacity-70">Generate your anonymous identifier and insert it into the Merkle tree.</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          className={`btn btn-lg ${
            hasRegistered === true
              ? "btn-success cursor-not-allowed"
              : isGenerating || isInserting
                ? "btn-primary"
                : !canRegister
                  ? "btn-disabled"
                  : "btn-primary"
          }`}
          onClick={hasRegistered === true ? undefined : handleRegister}
          disabled={isGenerating || isInserting || !canRegister}
        >
          {isGenerating ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Generating commitment...
            </>
          ) : isInserting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Inserting into Merkle tree...
            </>
          ) : !isConnected ? (
            "Connect wallet to register"
          ) : isVoter === false ? (
            "Not eligible - not on voters list"
          ) : hasRegistered === true ? (
            "✓ Already registered for this vote"
          ) : (
            "Register to vote"
          )}
        </button>
      </div>
    </div>
  );
};
