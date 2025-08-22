"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useReadContracts } from "wagmi";
import { AssertedTable } from "~~/components/oracle/optimistic/AssertedTable";
import { AssertionModal } from "~~/components/oracle/optimistic/AssertionModal";
import { DisputedTable } from "~~/components/oracle/optimistic/DisputedTable";
import { ExpiredTable } from "~~/components/oracle/optimistic/ExpiredTable";
import { ProposedTable } from "~~/components/oracle/optimistic/ProposedTable";
import { SettledTable } from "~~/components/oracle/optimistic/SettledTable";
import { SubmitAssertionButton } from "~~/components/oracle/optimistic/SubmitAssertionButton";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useChallengeState } from "~~/services/store/challengeStore";

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-[400px]">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
  </div>
);

const Home: NextPage = () => {
  const setRefetchAssertionStates = useChallengeState(state => state.setRefetchAssertionStates);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const { data: nextAssertionId, isLoading: isLoadingNextAssertionId } = useScaffoldReadContract({
    contractName: "OptimisticOracle",
    functionName: "nextAssertionId",
    query: {
      placeholderData: (previousData: any) => previousData,
    },
  });

  // get deployed contract address
  const { data: deployedContractAddress, isLoading: isLoadingDeployedContract } = useDeployedContractInfo({
    contractName: "OptimisticOracle",
  });

  // Create contracts array to get state for all assertions from 1 to nextAssertionId-1
  const assertionContracts = nextAssertionId
    ? Array.from({ length: Number(nextAssertionId) - 1 }, (_, i) => ({
        address: deployedContractAddress?.address as `0x${string}`,
        abi: deployedContractAddress?.abi,
        functionName: "getState",
        args: [BigInt(i + 1)],
      })).filter(contract => contract.address && contract.abi)
    : [];

  const {
    data: assertionStates,
    refetch: refetchAssertionStates,
    isLoading: isLoadingAssertionStates,
  } = useReadContracts({
    contracts: assertionContracts,
    query: {
      placeholderData: (previousData: any) => previousData,
    },
  });

  // Set the refetch function in the global store
  useEffect(() => {
    if (refetchAssertionStates) {
      setRefetchAssertionStates(refetchAssertionStates);
    }
  }, [refetchAssertionStates, setRefetchAssertionStates]);

  // Map assertion IDs to their states and filter out expired ones (state 5)
  const assertionStateMap =
    nextAssertionId && assertionStates
      ? Array.from({ length: Number(nextAssertionId) - 1 }, (_, i) => ({
          assertionId: i + 1,
          state: (assertionStates[i]?.result as number) || 0, // Default to 0 (Invalid) if no result
        }))
      : [];

  // Track when initial loading is complete
  const isFirstLoading =
    isInitialLoading && (isLoadingNextAssertionId || isLoadingAssertionStates || isLoadingDeployedContract);

  // Mark as initially loaded when all data is available
  useEffect(() => {
    if (isInitialLoading && !isLoadingNextAssertionId && !isLoadingDeployedContract && !isLoadingAssertionStates) {
      setIsInitialLoading(false);
    }
  }, [isInitialLoading, isLoadingNextAssertionId, isLoadingDeployedContract, isLoadingAssertionStates]);

  return (
    <div className="container mx-auto px-8 py-8 max-w-screen-lg xl:max-w-screen-xl">
      {/* Show loading spinner only during initial load */}
      {isFirstLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Submit Assertion Button with Modal */}
          <SubmitAssertionButton />

          {/* Tables */}
          <h2 className="text-2xl font-bold my-4">Asserted</h2>
          <AssertedTable assertions={assertionStateMap.filter(assertion => assertion.state === 1)} />
          <h2 className="text-2xl font-bold mt-12 mb-4">Proposed</h2>
          <ProposedTable assertions={assertionStateMap.filter(assertion => assertion.state === 2)} />
          <h2 className="text-2xl font-bold mt-12 mb-4">Disputed</h2>
          <DisputedTable assertions={assertionStateMap.filter(assertion => assertion.state === 3)} />
          <h2 className="text-2xl font-bold mt-12 mb-4">Settled</h2>
          <SettledTable assertions={assertionStateMap.filter(assertion => assertion.state === 4)} />
          <h2 className="text-2xl font-bold mt-12 mb-4">Expired</h2>
          <ExpiredTable assertions={assertionStateMap.filter(assertion => assertion.state === 5)} />
        </>
      )}

      <AssertionModal />
    </div>
  );
};

export default Home;
