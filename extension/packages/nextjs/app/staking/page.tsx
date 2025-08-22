"use client";

import type { NextPage } from "next";
import { NodesTable } from "~~/components/oracle/NodesTable";
import { PriceWidget } from "~~/components/oracle/PriceWidget";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-full max-w-5xl mx-auto">
          <div className="flex flex-col gap-8">
            <div className="w-full">
              <PriceWidget contractName="StakingOracle" />
            </div>
            <div className="w-full">
              <NodesTable />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
