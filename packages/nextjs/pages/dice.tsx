import { useState } from "react";
import type { NextPage } from "next";
import { Activities } from "~~/components/Activities";
import { Dice } from "~~/components/Dice";
import { MetaHeader } from "~~/components/MetaHeader";
import { Tab } from "~~/components/Tab";

const DiceGame: NextPage = () => {
  const [currentTabIndex, setCurrentTabIndex] = useState<number>(0);
  const rolls = [
    { address: "0x6918da6442B0D7D4F142EB92CD6FA5288e690668", amount: 10, landedOn: "F" },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "0" },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "F" },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "F" },
    { address: "0xCbdAa684708c13E7b85EBe3d3410DF02F8700808", amount: 10, landedOn: "2" },
  ];

  const onRollTypeChange = (index: number) => {
    setCurrentTabIndex(index);
  };

  const handleRollDice = () => {
    alert("hdhhd");
    if (currentTabIndex == 0) {
    }

    /// implement the dice roll ui here

    if (currentTabIndex == 1) {
    }

    /// implement the dice roll ui here
    if (currentTabIndex == 2) {
    }
  };

  return (
    <>
      <MetaHeader />
      <div className="py-20 px-40">
        <Tab currentIndex={currentTabIndex} onTabChange={onRollTypeChange} />
        <div className="flex flex-row">
          <div className="w-1/2">
            <Activities rolls={rolls} />
          </div>
          <div className="w-1/2">
            <Dice onRoll={handleRollDice} />
          </div>
        </div>
      </div>
    </>
  );
};

export default DiceGame;
