import React from "react";
import { ActivitiesItem, TActivityItemProps } from "./ActivitiesItem";

export type TActivitiesProps = {
  rolls: TActivityItemProps[];
};

export const Activities = ({ rolls }: TActivitiesProps) => {
  return (
    <div className="card bg-base-300 shadow-xl mx-10 p-1">
      <div className="card-body flex flex-col">
        <div className="flex flex-row">
          <div className="w-3/4">
            <span> Dice rolled by:</span>
          </div>
          <div className="w-1/4">
            <span> Landed on: </span>
          </div>
        </div>
        <div>
          {rolls.map(({ address, amount, landedOn }, i) => (
            <ActivitiesItem key={i} address={address} amount={amount} landedOn={landedOn} />
          ))}
        </div>
      </div>
    </div>
  );
};
