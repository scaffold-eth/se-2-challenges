import { useState } from "react";
import type { NextPage } from "next";
import { Activities } from "~~/components/Activities";
import { Dice } from "~~/components/Dice";
import { MetaHeader } from "~~/components/MetaHeader";
import { Tab } from "~~/components/Tab";
import { Winners } from "~~/components/Winner";
import { useAccountBalance, useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

const DiceGame: NextPage = () => {
  const [currentTabIndex, setCurrentTabIndex] = useState<number>(0);
  const rolls = [
    { address: "0x6918da6442B0D7D4F142EB92CD6FA5288e690668", amount: 10, landedOn: "F" },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "0" },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "F" },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "F" },
    { address: "0xCbdAa684708c13E7b85EBe3d3410DF02F8700808", amount: 10, landedOn: "2" },
  ];

  const won = [
    { address: "0x6918da6442B0D7D4F142EB92CD6FA5288e690668", amount: 10 },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10 },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10 },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10 },
    { address: "0xCbdAa684708c13E7b85EBe3d3410DF02F8700808", amount: 10 },
  ];

  const { writeAsync: randomDiceRoll } = useScaffoldContractWrite({
    contractName: "DiceGame",
    functionName: "rollTheDice",
  });

  const onRollTypeChange = (index: number) => {
    setCurrentTabIndex(index);
  };

  const handleRollDice = async () => {
    if (currentTabIndex == 0) {
      await randomDiceRoll();
    }

    /// implement the rigged roll  dice roll ui here

    if (currentTabIndex == 1) {
    }
  };

  return (
    <>
      <MetaHeader />
      <div className="py-20 px-10">
        <div className="flex flex-row">
          <div className="w-1/3">
            <Activities rolls={rolls} />
          </div>
          <div className="w-1/3">
            <Dice onRoll={handleRollDice} />
          </div>
          <div className="w-1/3">
            <Winners winners={won} />
          </div>
        </div>
      </div>
    </>
  );
};

export default DiceGame;
