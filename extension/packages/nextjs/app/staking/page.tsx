"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { BucketCountdown } from "~~/components/oracle/BucketCountdown";
import { BuyOraWidget } from "~~/components/oracle/BuyOraWidget";
import { NodesTable } from "~~/components/oracle/NodesTable";
import { PriceWidget } from "~~/components/oracle/PriceWidget";
import { TotalSlashedWidget } from "~~/components/oracle/TotalSlashedWidget";

const Home: NextPage = () => {
  const [selectedBucket, setSelectedBucket] = useState<bigint | "current">("current");

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-2">
        <div className="w-full px-0 sm:px-2">
          <div className="flex justify-end mr-4 pt-2">
            <BuyOraWidget />
          </div>
        </div>

        <div className="px-5 w-full max-w-5xl mx-auto">
          <div className="flex flex-col gap-8">
            <div className="w-full">
              <div className="grid w-full items-stretch grid-cols-1 md:grid-cols-3 gap-4">
                <PriceWidget contractName="StakingOracle" />
                <BucketCountdown />
                <TotalSlashedWidget />
              </div>
            </div>
            <div className="w-full">
              <NodesTable selectedBucket={selectedBucket} onBucketChange={setSelectedBucket} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
