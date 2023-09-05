import React from "react";
import { TWinnerItemProps, WinnerItem } from "./ActivitiesItem";

export type TActivitiesProps = {
  winners: TWinnerItemProps[];
};

export const Winners = ({ winners }: TActivitiesProps) => {
  return (
    <div className="card bg-base-300 shadow-xl mx-10 p-1">
      <div className="flex w-auto  justify-center h-10">
        <p className="flex justify-center">Winners Event</p>
      </div>
      <div className="card-body flex flex-col p-4 mt-0">
        <div className="flex flex-row">
          <div className="w-2/4">
            <span> Dice rolled by</span>
          </div>
          <div className="flex w-2/4 justify-center">
            <span> Won </span>
          </div>
        </div>
        <div>
          {winners.map(({ address, amount }, i) => (
            <WinnerItem key={i} address={address} amount={amount}  />
          ))}
        </div>
      </div>
    </div>
  );
};
