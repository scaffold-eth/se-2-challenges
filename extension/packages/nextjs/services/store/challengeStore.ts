import { create } from "zustand";
import { AssertionWithIdAndState } from "~~/components/oracle/types";

/**
 * Zustand Store
 *
 * You can add global state to the app using this useGlobalState, to get & set
 * values from anywhere in the app.
 *
 * Think about it as a global useState.
 */

type ChallengeState = {
  // Block timestamp tracking
  timestamp: bigint | null;
  setTimestamp: (timestamp: bigint | null) => void;
  // Optimistic Oracle
  refetchAssertionStates: () => void;
  setRefetchAssertionStates: (refetchFn: () => void) => void;
  // Assertion Modal
  openAssertion: AssertionWithIdAndState | null;
  openAssertionModal: (assertion: AssertionWithIdAndState) => void;
  closeAssertionModal: () => void;
};

export const useChallengeState = create<ChallengeState>(set => ({
  // Block timestamp tracking
  timestamp: null,
  setTimestamp: (timestamp: bigint | null): void => set(() => ({ timestamp })),
  // Optimistic Oracle
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  refetchAssertionStates: () => {},
  setRefetchAssertionStates: (refetchFn: () => void) => set(() => ({ refetchAssertionStates: refetchFn })),
  // Assertion Modal
  openAssertion: null,
  openAssertionModal: (assertion: AssertionWithIdAndState) =>
    set(state => ({
      openAssertion: assertion,
    })),
  closeAssertionModal: () => set(() => ({ openAssertion: null })),
}));
