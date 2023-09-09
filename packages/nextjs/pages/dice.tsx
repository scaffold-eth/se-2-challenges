import { useEffect, useState } from "react";
import Image from "next/image";
import type { NextPage } from "next";
import { createTestClient, http } from "viem";
import { hardhat } from "viem/chains";
import { useBalance } from "wagmi";
import { Amount } from "~~/components/Amount";
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
const ROLLING_TIME_MS = 500;

const DiceGame: NextPage = () => {
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);

  const [isRolling, setIsRolling] = useState(false);

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
          setTimeout(() => {
            setIsRolling(false);
            setRolls(rolls => [
              { address: player, amount: Number(amount), roll: roll.toString(16).toUpperCase() },
              ...rolls,
            ]);
          }, ROLLING_TIME_MS);
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
          setTimeout(() => {
            setIsRolling(false);
            setWinners(winners => [{ address: winner, amount }, ...winners]);
          }, ROLLING_TIME_MS);
        }
      });
    },
  });

  const { writeAsync: randomDiceRoll, isError: rollTheDiceError } = useScaffoldContractWrite({
    contractName: "DiceGame",
    functionName: "rollTheDice",
    value: ROLL_ETH_VALUE,
  });

  const { writeAsync: riggedRoll, isError: riggedRollError } = useScaffoldContractWrite({
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

  useEffect(() => {
    if (rollTheDiceError || riggedRollError) {
      setTimeout(() => {
        setIsRolling(false);
      }, ROLLING_TIME_MS);
    }
  }, [riggedRollError, rollTheDiceError]);

  return (
    <>
      <MetaHeader />
      <div className="py-10 px-10">
        <div className="grid grid-cols-3">
          <div className="mt-8">
            <RollEvents rolls={rolls} />
          </div>

          <div className="flex flex-col items-center">
            <div className="flex w-full justify-center">
              <span className="text-xl"> Roll a 0, 1, or 2 to win the prize! </span>
            </div>

            <button
              onClick={() => {
                setIsRolling(true);
                randomDiceRoll();
              }}
              disabled={isRolling}
              className="mt-2 btn btn-secondary btn-xl normal-case font-xl text-lg"
            >
              Roll the dice!
            </button>
            <div className="mt-4 pt-2 flex flex-col items-center w-full justify-center border-t-4 border-primary">
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
            <button
              onClick={() => {
                setIsRolling(true);
                riggedRoll();
              }}
              disabled={isRolling}
              className="mt-2 btn btn-secondary btn-xl normal-case font-xl text-lg"
            >
              Rigged Roll!
            </button>

            <div className="flex mt-8">
              <Image
                src={`/rolls/${isRolling ? "ROLL" : rolls[0]?.roll || "0"}.png`}
                width={300}
                height={300}
                alt="roll"
              />
            </div>
          </div>

          <div className="mt-8">
            <WinnerEvents winners={winners} />
          </div>
        </div>
      </div>
    </>
  );
};

export default DiceGame;
