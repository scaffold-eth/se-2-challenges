import { useState } from "react";
import type { NextPage } from "next";
import { Activities } from "~~/components/Activities";
import { Dice } from "~~/components/Dice";
import { MetaHeader } from "~~/components/MetaHeader";
import { Tab } from "~~/components/Tab";

const Home: NextPage = () => {
  const [currentTabIndex, setCurrentTabIndex] = useState<number>(0);
  const rolls = [
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "F" },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "0" },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "F" },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "F" },
    { address: "0xa709FF766777C40bAC916558D9262eC4868496B4", amount: 10, landedOn: "2" },
  ];

  const onRollTypeChange = (index: number) => {
    setCurrentTabIndex(index);
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
            <Dice />
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
