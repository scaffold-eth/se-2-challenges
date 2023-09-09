import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { createTestClient, http } from "viem";
import { hardhat } from "viem/chains";
import { useBalance } from "wagmi";
import { Amount } from "~~/components/Amount";
import { Dice } from "~~/components/Dice";
import { MetaHeader } from "~~/components/MetaHeader";
import { Roll, RollEvents } from "~~/components/RollEvents";
import { Winner, WinnerEvents } from "~~/components/WinnerEvents";
import { Address } from "~~/components/scaffold-eth";
import {
  useScaffoldContract,
  useScaffoldContractWrite,
  useScaffoldEventHistory,
  useScaffoldEventSubscriber,
} from "~~/hooks/scaffold-eth";

const ROLL_ETH_VALUE = "0.002";
const CHANGE_BLOCKS_INTERVAL_MS = 1000;

const DiceGame: NextPage = () => {
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);

  const { data: riggedRollContract } = useScaffoldContract({ contractName: "RiggedRoll" });
  const { data: riggedRollBalance, isLoading: riggedRollBalanceLoading } = useBalance({
    address: riggedRollContract?.address,
    watch: true,
  });

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
          roll: args.roll.toString(16).toUpperCase(),
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
            { address: player, amount: Number(amount), roll: roll.toString(16).toUpperCase() },
            ...rolls,
          ]);
        }
      });
    },
  });

  const { data: winnerHistoryData, isLoading: winnerHistoryLoading } = useScaffoldEventHistory({
    contractName: "DiceGame",
    eventName: "Winner",
    fromBlock: 0n,
  });

  useEffect(() => {
    if (!winners.length && !!winnerHistoryData?.length && !winnerHistoryLoading) {
      setWinners(
        winnerHistoryData?.map(({ args }) => ({
          address: args.winner,
          amount: args.amount,
        })) || [],
      );
    }
  }, [winnerHistoryData, winnerHistoryLoading, winners.length]);

  useScaffoldEventSubscriber({
    contractName: "DiceGame",
    eventName: "Winner",
    listener: logs => {
      logs.map(log => {
        const { winner, amount } = log.args;

        if (winner && amount) {
          setWinners(winners => [{ address: winner, amount }, ...winners]);
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

  return (
    <>
      <MetaHeader />
      <div className="py-20 px-10">
        <div className="flex flex-row">
          <div className="w-1/3">
            <RollEvents rolls={rolls} />
          </div>
          <div className="w-1/3 flex flex-col items-center">
            <Dice />
            <button onClick={() => randomDiceRoll()} className="btn btn-secondary btn-xl normal-case font-xl text-lg">
              Roll the dice
            </button>
            <div className="mt-4 pt-4 flex flex-col items-center w-full justify-center border-t-4 border-primary">
              <span className="text-2xl">Rigged Roll</span>
              <div className="flex mt-2 items-center">
                <span className="mr-2 text-lg">Address:</span>{" "}
                <Address size="lg" address={riggedRollContract?.address} />{" "}
              </div>
              <div className="flex mt-1 items-center">
                <span className="text-lg mr-2">Balance:</span>
                <Amount
                  amount={Number(riggedRollBalance?.formatted || 0)}
                  showUsdPrice
                  isLoading={riggedRollBalanceLoading}
                  className="text-lg"
                />
              </div>
            </div>
            <button onClick={() => riggedRoll()} className="mt-4 btn btn-secondary btn-xl normal-case font-xl text-lg">
              Rigged Roll
            </button>
          </div>
          <div className="w-1/3">
            <WinnerEvents winners={winners} />
          </div>
        </div>
      </div>
    </>
  );
};

export default DiceGame;
