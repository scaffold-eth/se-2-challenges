"use client";

import type { NextPage } from "next";
import Race from "~~/components/race/Race";
import { OverviewBuySellShares } from "~~/components/user/OverviewBuySellShares";
import { PredictionMarketInfo } from "~~/components/user/PredictionMarketInfo";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Prediction: NextPage = () => {
  const { data: deployedContract, isLoading: isDeployedContractLoading } = useDeployedContractInfo({
    contractName: "PredictionMarket",
  });

  const { data: owner, isLoading: isOwnerLoading } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "owner",
  });

  if (isDeployedContractLoading || isOwnerLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="loading loading-spinner loading-lg"></div>
        <div className="text-lg">
          {isDeployedContractLoading ? "Checking contract deployment..." : "Loading contract data..."}
        </div>
      </div>
    );
  }

  if (!deployedContract || owner === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="alert alert-warning max-w-md center flex justify-center">
          <span>🔮 No prediction market deployed!</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <OverviewBuySellShares />
          </div>
          <div>
            <PredictionMarketInfo />
            <Race />
          </div>
        </div>
      </div>
    </>
  );
};

export default Prediction;
