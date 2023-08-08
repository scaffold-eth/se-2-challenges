import React, { useEffect, useState } from "react";
import { ActivitiesItem, TActivityItemProps, TWinnerItemProps, WinnerItem } from "./ActivitiesItem";

export type TActivitiesProps = {
  rolls: TActivityItemProps[];
  winners: TWinnerItemProps[];
};

export const Activities = ({ rolls, winners }: TActivitiesProps) => {
  const [currentRolls, setCurrentRolls] = useState<TActivityItemProps[]>([]);
  const [tabIndex, setTabIndex] = useState<number>(0);

  const handleActivityTab = (index: number) => {
    return setTabIndex(index);
  };

  return (
    <div className="card bg-base-300 shadow-xl mx-10 p-1">
      <div className="flex tabs drop-shadow-md w-auto  pt-3">
        <a onClick={() => handleActivityTab(0)} className={`tab tab-bordered ${tabIndex == 0 && "tab-active"}`}>
          Activities
        </a>
        <a onClick={() => handleActivityTab(1)} className={`tab tab-bordered ${tabIndex == 1 && "tab-active"}`}>
          Wins
        </a>
      </div>
      <div className="card-body flex flex-col">
        {tabIndex == 0 ? (
          <>
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
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};
