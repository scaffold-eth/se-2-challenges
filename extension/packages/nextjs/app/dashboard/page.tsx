"use client";

import BorrowOperations from "./_components/BorrowOperations";
import CollateralGraph from "./_components/CollateralGraph";
import CollateralOperations from "./_components/CollateralOperations";
import PriceActions from "./_components/PriceActions";
import TokenActions from "./_components/TokenActions";
import UserPositionsTable from "./_components/UserPositionsTable";
import type { NextPage } from "next";

const Dashboard: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10 pb-16">
        <div className="px-5 w-full">
          <div className="relative flex justify-center items-center mb-8">
            <h1 className="text-2xl">Lending Dashboard</h1>
            <PriceActions />
          </div>
          <div className="flex flex-wrap gap-8 justify-center">
            <div className="flex flex-col gap-8">
              <CollateralOperations />
              <BorrowOperations />
              <TokenActions />
            </div>
            <div className="flex flex-col gap-8">
              <UserPositionsTable />
              <CollateralGraph />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
