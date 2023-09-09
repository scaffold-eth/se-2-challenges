import React from "react";
import { Address } from "./scaffold-eth";
import { Address as AddressType } from "viem";

export type Roll = {
  address: AddressType;
  amount: number;
  roll: string;
};

export type RollEventsProps = {
  rolls: Roll[];
};

export const RollEvents = ({ rolls }: RollEventsProps) => {
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
            <span>Roll</span>
          </div>
        </div>
        <div className="mt-2">
          {rolls.map(({ address, roll }, i) => (
            <div key={i} className=" grid grid-cols-4 gap-y-4 px-1 mb-2 items-center h-8">
              <div className="col-span-3">
                <Address address={address} size="lg" />
              </div>
              <div className="col-span-1">
                <span> {roll} </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
