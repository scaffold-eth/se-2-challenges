import React, { useCallback, useRef, useState } from "react";
import { ActivitiesItems, TActivityItemProps } from "./ActivitiesItem";

export type TActivitiesProps = {
  rolls: TActivityItemProps[];
};

export const Activities = ({ rolls }: TActivitiesProps) => {
  return (
    <div className="card bg-base-300 shadow-xl mx-10 p-3">
      <div className="tabs h-14 flex drop-shadow-md ">
        <a className="tab tab-active">Activities</a>
        <a className="tab">Wins</a>
      </div>
      <div className="card-body flex flex-row">
        <div className="w-3/4">
          <span> Dice rolled by:</span>
        </div>
        <div className="w-1/4">
          <span> Landed on: </span>
        </div>
      </div>
      <div>
        {rolls.map(({ address, amount, landedOn }, i) => (
          <ActivitiesItems key={i} address={address} amount={amount} landedOn={landedOn} />
        ))}
      </div>
    </div>
  );
};
