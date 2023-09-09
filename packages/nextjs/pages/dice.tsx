import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { Address } from "viem";
import { Activities } from "~~/components/Activities";
import { TActivityItemProps } from "~~/components/ActivitiesItem";
import { Dice } from "~~/components/Dice";
import { MetaHeader } from "~~/components/MetaHeader";
import { Tab } from "~~/components/Tab";
import { Winners } from "~~/components/Winner";
import {
  useAccountBalance,
  useScaffoldContractRead,
  useScaffoldContractWrite,
  useScaffoldEventHistory,
  useScaffoldEventSubscriber,
} from "~~/hooks/scaffold-eth";

const ROLL_ETH_VALUE = "0.002";

const DiceGame: NextPage = () => {
  const [rolls, setRolls] = useState<TActivityItemProps[]>([]);

  const { data: rollsHistoryData, isLoading: rollsHistoryLoading } = useScaffoldEventHistory({
    contractName: "DiceGame",
    eventName: "Roll",
    fromBlock: 0n,
  });

  useEffect(() => {
    if (!rolls.length && !rollsHistoryLoading) {
      setRolls(
        rollsHistoryData?.map(({ args }) => ({
          address: args.player,
          amount: Number(args.amount),
          landedOn: args.roll.toString(16).toUpperCase(),
        })) || [],
      );
    }
  }, [rolls, rollsHistoryData, rollsHistoryLoading]);

  useScaffoldEventSubscriber({
    contractName: "DiceGame",
    eventName: "Roll",
    listener: logs => {
      logs.map(log => {
        const { player, amount, roll } = log.args;

        if (player && amount && roll) {
          setRolls(rolls => [
            ...rolls,
            { address: player, amount: Number(amount), landedOn: roll.toString(16).toUpperCase() },
          ]);
        }
      });
    },
  });

  const { writeAsync: randomDiceRoll } = useScaffoldContractWrite({
    contractName: "DiceGame",
    functionName: "rollTheDice",
    value: ROLL_ETH_VALUE,
  });

  return (
    <>
      <MetaHeader />
      <div className="py-20 px-10">
        <div className="flex flex-row">
          <div className="w-1/3">
            <Activities rolls={rolls} />
          </div>
          <div className="w-1/3">
            <Dice />
            <button onClick={() => randomDiceRoll()} className="btn btn-secondary btn-xl normal-case font-xl text-lg">
              Roll the dice
            </button>
            <div className="mt-6 flex w-full justify-center ">
              <span className="text-xl"> This button allow a rigged roll </span>
            </div>
            {/* <button onClick={onRoll} className="btn btn-secondary btn-xl normal-case font-xl text-lg">
          Rigged Roll
        </button> */}
          </div>
          {/* <div className="w-1/3">
            <Winners winners={won} />
          </div> */}
        </div>
      </div>
    </>
  );
};

export default DiceGame;
