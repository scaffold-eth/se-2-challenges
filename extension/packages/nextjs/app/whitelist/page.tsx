"use client";

import type { NextPage } from "next";
import { PriceWidget } from "~~/components/oracle/PriceWidget";
import { WhitelistTable } from "~~/components/oracle/whitelist/WhitelistTable";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-full max-w-5xl mx-auto">
          <div className="flex flex-col gap-8">
            <div className="w-full">
              <PriceWidget contractName="WhitelistOracle" />
            </div>
            <div className="w-full">
              <WhitelistTable />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
