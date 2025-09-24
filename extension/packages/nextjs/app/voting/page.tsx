"use client";

import { VoteWithBurnerHardhat } from "./_challengeComponents/VoteWithBurnerHardhat";
import { ShowVotersButton } from "./_components/ShowVotersButton";
import { NextPage } from "next";
import { hardhat, sepolia } from "viem/chains";
import { CreateCommitment } from "~~/app/voting/_challengeComponents/CreateCommitment";
import { GenerateProof } from "~~/app/voting/_challengeComponents/GenerateProof";
import { VoteWithBurnerSepolia } from "~~/app/voting/_challengeComponents/VoteWithBurnerSepolia";
import { AddVotersModal } from "~~/app/voting/_components/AddVotersModal";
import { ClearStorageButton } from "~~/app/voting/_components/ClearStorageButton";
import { LogStorageButton } from "~~/app/voting/_components/LogStorageButton";
import { VoteSelector } from "~~/app/voting/_components/VoteChoice";
import { VotingStats } from "~~/app/voting/_components/VotingStats";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

const VotingPage: NextPage = () => {
  const network = useTargetNetwork();

  const { data: leafEvents } = useScaffoldEventHistory({
    contractName: "Voting",
    eventName: "NewLeaf",
    watch: true,
    enabled: true,
  });

  return (
    <div className="flex items-center justify-center flex-col grow pt-6 w-full">
      <div className="px-4 sm:px-5 w-full max-w-7xl mx-auto">
        <div className="flex flex-col items-center w-full">
          <div className="w-full max-w-2xl space-y-4 mt-6">
            <div className="flex flex-wrap gap-2 justify-between">
              <ShowVotersButton />
              <AddVotersModal />
            </div>
            <VotingStats />
            <CreateCommitment leafEvents={leafEvents || []} />
            <VoteSelector />
            <GenerateProof leafEvents={leafEvents || []} />
            {network.targetNetwork.id === hardhat.id && <VoteWithBurnerHardhat />}
            {network.targetNetwork.id === sepolia.id && <VoteWithBurnerSepolia />}

            {/* Storage Management Buttons - placed at the bottom for safety */}
            <div className="mt-8 pt-6 border-t border-base-300">
              <div className="flex justify-center gap-4">
                <LogStorageButton />
                <ClearStorageButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotingPage;
