import React from "react";
import { Amount } from "./Amount";
import { Address } from "./scaffold-eth";
import { formatEther } from "viem";

export type Winner = {
  address: string;
  amount: bigint;
};

export type WinnerEventsProps = {
  winners: Winner[];
};

export const WinnerEvents = ({ winners }: WinnerEventsProps) => {
  return (
    <div className="card bg-base-300 shadow-xl mx-10 p-1">
      <div className="flex w-auto  justify-center h-10">
        <p className="flex justify-center text-lg font-bold">Roll Events</p>
      </div>
      <div className="p-2 flex flex-col mt-0">
        <div className="grid grid-cols-4 text-lg">
          <div className="col-span-3">
            <span>Address</span>
          </div>
          <div className="col-span-1">
            <span>Won</span>
          </div>
        </div>
        <div className="mt-2">
          {winners.map(({ address, amount }, i) => (
            <div key={i} className=" grid grid-cols-4 gap-y-4 px-1 mb-2 items-center">
              <div className="col-span-3">
                <Address address={address} size="lg" />
              </div>
              <div className="col-span-1">
                <Amount showUsdPrice={true} amount={Number(formatEther(amount))} className="text-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
