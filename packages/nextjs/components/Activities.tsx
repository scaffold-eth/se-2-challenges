import React, { useEffect, useState } from "react";
import { ActivitiesItems, TActivityItemProps } from "./ActivitiesItem";

export type TActivitiesProps = {
  rolls: TActivityItemProps[];
};

export const Activities = ({ rolls }: TActivitiesProps) => {
  const [currentRolls, setCurrentRolls] = useState<TActivityItemProps[]>([]);
  const [tabIndex, setTabIndex] = useState<number>(0);

  useEffect(() => {
    if (tabIndex == 0) return setCurrentRolls(rolls);
    return setCurrentRolls(
      rolls.filter(roll => {
        const rollNumber = parseInt(roll.landedOn);
        return !Number.isNaN(rollNumber) || rollNumber < 3;
      }),
    );
  }, [tabIndex]);

  const handleActivityTab = (index: number) => {
    return setTabIndex(index);
  };

  return (
    <div className="card bg-base-300 shadow-xl mx-10 p-3 h-full">
      <div className="flex tabs drop-shadow-md w-auto ">
        <a onClick={() => handleActivityTab(0)} className={`tab tab-bordered ${tabIndex == 0 && "tab-active"}`}>
          Activities
        </a>
        <a onClick={() => handleActivityTab(1)} className={`tab tab-bordered ${tabIndex == 1 && "tab-active"}`}>
          Wins
        </a>
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
        {currentRolls.map(({ address, amount, landedOn }, i) => (
          <ActivitiesItems key={i} address={address} amount={amount} landedOn={landedOn} />
        ))}
      </div>
    </div>
  );
};
