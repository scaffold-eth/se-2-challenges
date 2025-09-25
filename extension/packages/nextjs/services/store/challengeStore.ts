import { create } from "zustand";

/**
 * Zustand Store
 *
 * You can add global state to the app using this useGlobalState, to get & set
 * values from anywhere in the app.
 *
 * Think about it as a global useState.
 */

type CommitmentData = {
  commitment: string;
  nullifier: string;
  secret: string;
  index?: number;
};

type ProofData = {
  proof: Uint8Array;
  publicInputs: any[];
};

type ChallengeState = {
  nativeCurrency: {
    price: number;
    isFetching: boolean;
  };
  commitmentData: CommitmentData | null;
  setCommitmentData: (data: CommitmentData | null) => void;
  proofData: ProofData | null;
  setProofData: (data: ProofData | null) => void;
  voteChoice: boolean | null;
  setVoteChoice: (choice: boolean | null) => void;
};

export const useChallengeState = create<ChallengeState>(set => ({
  nativeCurrency: {
    price: 0,
    isFetching: true,
  },
  commitmentData: null,
  setCommitmentData: (data: CommitmentData | null) => set(() => ({ commitmentData: data })),
  proofData: null,
  setProofData: (data: ProofData | null) => set(() => ({ proofData: data })),
  voteChoice: null,
  setVoteChoice: (choice: boolean | null) => set(() => ({ voteChoice: choice })),
}));
