import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { createTestClient, http } from "viem";
import { hardhat } from "viem/chains";
import { useBalance, useChainId } from "wagmi";
import { Activities } from "~~/components/Activities";
import { TActivityItemProps } from "~~/components/ActivitiesItem";
import { Dice } from "~~/components/Dice";
import { MetaHeader } from "~~/components/MetaHeader";
import { Tab } from "~~/components/Tab";
import { Winners } from "~~/components/Winner";
import { Address } from "~~/components/scaffold-eth";
import {
  useAccountBalance,
  useScaffoldContract,
  useScaffoldContractRead,
  useScaffoldContractWrite,
  useScaffoldEventHistory,
  useScaffoldEventSubscriber,
} from "~~/hooks/scaffold-eth";

const ROLL_ETH_VALUE = "0.002";
const CHANGE_BLOCKS_INTERVAL_MS = 1000;

const DiceGame: NextPage = () => {
  const [rolls, setRolls] = useState<TActivityItemProps[]>([]);
  const { data: riggedRollContract } = useScaffoldContract({ contractName: "RiggedRoll" });
  const { data: riggedRollBalance } = useBalance({ address: riggedRollContract?.address, watch: true });

  const { data: rollsHistoryData, isLoading: rollsHistoryLoading } = useScaffoldEventHistory({
    contractName: "DiceGame",
    eventName: "Roll",
    fromBlock: 0n,
  });

  useEffect(() => {
    if (!rolls.length && !!rollsHistoryData?.length && !rollsHistoryLoading) {
      setRolls(
        rollsHistoryData?.map(({ args }) => ({
          address: args.player,
          amount: Number(args.amount),
          landedOn: args.roll.toString(16).toUpperCase(),
        })) || [],
      );
    }
  }, [rolls, rollsHistoryData, rollsHistoryLoading]);

  useEffect(() => {
    try {
      createTestClient({
        chain: hardhat,
        mode: "hardhat",
        transport: http(),
      })?.setIntervalMining({
        interval: CHANGE_BLOCKS_INTERVAL_MS,
      });
    } catch (e) {}
  }, []);

  useScaffoldEventSubscriber({
    contractName: "DiceGame",
    eventName: "Roll",
    listener: logs => {
      logs.map(log => {
        const { player, amount, roll } = log.args;

        if (player && amount && roll) {
          setRolls(rolls => [
            { address: player, amount: Number(amount), landedOn: roll.toString(16).toUpperCase() },
            ...rolls,
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

  const { writeAsync: riggedRoll } = useScaffoldContractWrite({
    contractName: "RiggedRoll",
    functionName: "riggedRoll",
  });

  return (
    <>
      <MetaHeader />
      <div className="py-20 px-10">
        <div className="flex flex-row">
          <div className="w-1/3">
            <Activities rolls={rolls} />
          </div>
          <div className="w-1/3 flex flex-col items-center">
            <Dice />
            <button onClick={() => randomDiceRoll()} className="btn btn-secondary btn-xl normal-case font-xl text-lg">
              Roll the dice
            </button>
            <div className="mt-4 pt-4 flex flex-col items-center w-full justify-center border-t-4 border-primary">
              <span className="text-2xl">Rigged Roll</span>
              <div className="flex my-2">
                <Address address={riggedRollContract?.address} />{" "}
                <span className="ml-4">{riggedRollBalance?.formatted}</span>
              </div>
            </div>
            <button onClick={() => riggedRoll()} className="mt-4 btn btn-secondary btn-xl normal-case font-xl text-lg">
              Rigged Roll
            </button>
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
