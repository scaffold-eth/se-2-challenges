import React from "react";
import { TWinnerItemProps, WinnerItem } from "./ActivitiesItem";

export type TActivitiesProps = {
  winners: TWinnerItemProps[];
};

export const Winners = ({ winners }: TActivitiesProps) => {
  return (
    <div className="card bg-base-300 shadow-xl mx-10 p-1">
      <div className="flex tabs drop-shadow-md w-auto  pt-3">
        <p className={``}>Wins</p>
      </div>
      <div className="card-body flex flex-col">
        <div className="flex flex-row">
          <div className="w-3/4">
            <span> Dice rolled by</span>
          </div>
          <div className="w-1/4">
            <span> Won </span>
          </div>
        </div>
        <div>
          {winners.map(({ address, amount }, i) => (
            <WinnerItem key={i} address={address} amount={amount} />
          ))}
        </div>
      </div>
    </div>
  );
};
