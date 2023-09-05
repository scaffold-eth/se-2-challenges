import React from "react";
import { ActivitiesItem, TActivityItemProps } from "./ActivitiesItem";

export type TActivitiesProps = {
  rolls: TActivityItemProps[];
};

export const Activities = ({ rolls }: TActivitiesProps) => {
  return (
    <div className="card bg-base-300 shadow-xl mx-10 p-1">
      <div className="flex w-auto  justify-center h-10">
        <p className="flex justify-center ">Roll Event</p>
      </div>
      <div className="card-body flex flex-col p-4 mt-0">
        <div className="flex flex-row">
          <div className="w-3/4">
            <span> Dice rolled by</span>
          </div>
          <div className="flex w-1/4 justify-center">
            <span> Landed on </span>
          </div>
        </div>
        <div className="mt-2">
          {rolls.map(({ address, amount, landedOn }, i) => (
            <ActivitiesItem key={i} address={address} amount={amount} landedOn={landedOn} />
          ))}
        </div>
      </div>
    </div>
  );
};
