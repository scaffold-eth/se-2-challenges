"use client";

import { useState } from "react";
//// Checkpoint 8 //////
// import { UltraHonkBackend } from "@aztec/bb.js";
// // @ts-ignore
// import { Noir } from "@noir-lang/noir_js";
// import { LeanIMT } from "@zk-kit/lean-imt";
// import { ethers } from "ethers";
// import { poseidon1, poseidon2 } from "poseidon-lite";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useChallengeState } from "~~/services/store/challengeStore";
import { hasStoredProof, loadCommitmentFromLocalStorage, saveProofToLocalStorage } from "~~/utils/proofStorage";
import { notification } from "~~/utils/scaffold-eth";

const generateProof = async (
  _root: bigint,
  _vote: boolean,
  _depth: number,
  _nullifier: string,
  _secret: string,
  _index: number,
  _leaves: any[],
  _circuitData: any,
) => {
  //// Checkpoint 8 //////
  try {
    void [_root, _vote, _depth, _nullifier, _secret, _index, _leaves, _circuitData];
    return {
      proof: new Uint8Array([0]),
      publicInputs: [0n],
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

interface CreateCommitmentProps {
  leafEvents?: any[];
}

export const GenerateProof = ({ leafEvents = [] }: CreateCommitmentProps) => {
  const [, setCircuitData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { commitmentData, setProofData, voteChoice } = useChallengeState();
  const { address: userAddress, isConnected } = useAccount();
  const { data: deployedContractData } = useDeployedContractInfo({ contractName: "Voting" });

  const [nullifierInput, setNullifierInput] = useState<string>("");
  const [secretInput, setSecretInput] = useState<string>("");
  const [indexInput, setIndexInput] = useState<string>("");

  const { data: votingData } = useScaffoldReadContract({
    contractName: "Voting",
    functionName: "getVotingData",
  });

  const root = votingData?.[6];
  const treeDepth = votingData?.[5];

  const { data: voterData } = useScaffoldReadContract({
    contractName: "Voting",
    functionName: "getVoterData",
    args: [userAddress as `0x${string}`],
  });

  const isVoter = voterData?.[0];
  const hasRegistered = voterData?.[1];

  const canVote = Boolean(isConnected && isVoter === true && hasRegistered === true);

  const hasExistingProof = hasStoredProof(deployedContractData?.address, userAddress);

  const getCircuitDataAndGenerateProof = async () => {
    setIsLoading(true);
    try {
      // Ensure commitment inputs are loaded from localStorage when available
      const storedCommitment =
        deployedContractData?.address && userAddress
          ? loadCommitmentFromLocalStorage(deployedContractData.address, userAddress)
          : null;

      // Reflect stored values in the UI if inputs are empty
      if ((!nullifierInput || !secretInput || indexInput?.trim() === "") && storedCommitment) {
        setNullifierInput(storedCommitment.nullifier);
        setSecretInput(storedCommitment.secret);
        setIndexInput(storedCommitment.index?.toString() ?? "");
      }

      const response = await fetch("/api/circuit");
      if (!response.ok) {
        throw new Error("Failed to fetch circuit data");
      }

      const fetchedCircuitData = await response.json();
      setCircuitData(fetchedCircuitData);

      const effectiveNullifier = (
        nullifierInput?.trim() ||
        commitmentData?.nullifier ||
        storedCommitment?.nullifier
      )?.trim();
      const effectiveSecret = (secretInput?.trim() || commitmentData?.secret || storedCommitment?.secret)?.trim();
      const effectiveIndex =
        indexInput?.trim() !== "" ? Number(indexInput) : (commitmentData?.index ?? storedCommitment?.index);

      if (voteChoice === null) {
        throw new Error("Please select your vote (Yes/No) first");
      }

      if (!leafEvents || leafEvents.length === 0) {
        throw new Error("There are no commitments in the tree yet. Please insert a commitment first.");
      }

      if (!effectiveNullifier || !effectiveSecret || effectiveIndex === undefined) {
        throw new Error(
          "Missing commitment inputs. Paste your saved data or ensure you have generated & inserted a commitment.",
        );
      }

      const generatedProof = await generateProof(
        root as bigint,
        voteChoice,
        treeDepth as unknown as number,
        effectiveNullifier,
        effectiveSecret,
        effectiveIndex as number,
        leafEvents as any,
        fetchedCircuitData,
      );
      setProofData({
        proof: generatedProof.proof,
        publicInputs: generatedProof.publicInputs,
      });

      saveProofToLocalStorage(
        { proof: generatedProof.proof, publicInputs: generatedProof.publicInputs },
        deployedContractData?.address,
        voteChoice,
        userAddress,
      );
    } catch (error) {
      console.error("Error in getCircuitDataAndGenerateProof:", error);
      notification.error((error as Error).message || "Failed to generate proof");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-base-100 shadow rounded-xl p-6 space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-center"> Generate ZK proof off-chain </h2>
        <p className="text-sm opacity-70">
          Prove membership in the Merkle tree and add your voting decision to the proof.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            className={`btn ${canVote && !hasExistingProof && voteChoice !== null ? "btn-primary" : "btn-disabled"}`}
            onClick={canVote && !hasExistingProof && voteChoice !== null ? getCircuitDataAndGenerateProof : undefined}
            disabled={isLoading || !canVote || hasExistingProof || voteChoice === null}
          >
            {isLoading
              ? "Generating proof..."
              : hasExistingProof
                ? "Proof already exists"
                : !canVote
                  ? "Must register first"
                  : voteChoice === null
                    ? "Select choice first"
                    : "Generate proof"}
          </button>
        </div>
      </div>
    </div>
  );
};
