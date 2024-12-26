"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NextPage } from "next";
import {
  Address as AddressType,
  TestClient,
  formatEther,
  parseEther,
} from "viem";
import { createTestClient, http } from "viem";
import { hardhat } from "viem/chains";
import { useAccount, usePublicClient } from "wagmi";
import {
  Amount,
  Roll,
  RollEvents,
  Winner,
  WinnerEvents,
} from "~~/app/dice/_components";
import { Address } from "~~/components/scaffold-eth";
import {
  useScaffoldContract,
  useScaffoldEventHistory,
  useScaffoldReadContract,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";

const ROLL_ETH_VALUE = "0.002";
const MAX_TABLE_ROWS = 10;

const DiceGame: NextPage = () => {
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);

  const { chain } = useAccount();

  const publicClient = usePublicClient();

  const client = useMemo(
    () =>
      chain?.id === hardhat.id
        ? createTestClient({
            chain: hardhat,
            mode: "hardhat",
            transport: http(),
          })
        : publicClient,
    [chain]
  );

  const videoRef = useRef<HTMLVideoElement>(null);

  const [rolled, setRolled] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  const { data: riggedRollContract } = useScaffoldContract({
    contractName: "RiggedRoll",
  });
  const { data: riggedRollBalance } = useWatchBalance({
    address: riggedRollContract?.address,
  });
  const { data: prize } = useScaffoldReadContract({
    contractName: "DiceGame",
    functionName: "prize",
  });

  const { data: rollsHistoryData, isLoading: rollsHistoryLoading } =
    useScaffoldEventHistory({
      contractName: "DiceGame",
      eventName: "Roll",
      fromBlock: 0n,
      watch: true,
    });

  useEffect(() => {
    if (!client || client.type !== "testClient") return;

    const interval = setInterval(async () => {
      try {
        await (client as TestClient).mine({ blocks: 1 });
      } catch (error) {
        console.error("Error mining block:", error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [client]);

  useEffect(() => {
    if (
      !rollsHistoryLoading &&
      Boolean(rollsHistoryData?.length) &&
      (rollsHistoryData?.length as number) > rolls.length
    ) {
      setIsRolling(false);

      setRolls(
        rollsHistoryData?.map(({ args }) => ({
          address: args.player as AddressType,
          amount: Number(args.amount),
          roll: (args.roll as bigint).toString(16).toUpperCase(),
        })) || []
      );
    }
  }, [rolls, rollsHistoryData, rollsHistoryLoading]);

  const { data: winnerHistoryData, isLoading: winnerHistoryLoading } =
    useScaffoldEventHistory({
      contractName: "DiceGame",
      eventName: "Winner",
      fromBlock: 0n,
      watch: true,
    });

  useEffect(() => {
    if (
      !winnerHistoryLoading &&
      Boolean(winnerHistoryData?.length) &&
      (winnerHistoryData?.length as number) > winners.length
    ) {
      setIsRolling(false);

      setWinners(
        winnerHistoryData?.map(({ args }) => ({
          address: args.winner as AddressType,
          amount: args.amount as bigint,
        })) || []
      );
    }
  }, [winnerHistoryData, winnerHistoryLoading, winners.length]);

  const { writeContractAsync: writeDiceGameAsync, isError: rollTheDiceError } =
    useScaffoldWriteContract("DiceGame");

  const { writeContractAsync: writeRiggedRollAsync, isError: riggedRollError } =
    useScaffoldWriteContract("RiggedRoll");

  useEffect(() => {
    if (rollTheDiceError || riggedRollError) {
      setIsRolling(false);
      setRolled(false);
    }
  }, [riggedRollError, rollTheDiceError]);

  useEffect(() => {
    if (videoRef.current && !isRolling) {
      // show last frame
      videoRef.current.currentTime = 9999;
    }
  }, [isRolling]);

  return (
    <div className="py-10 px-10">
      <div className="grid grid-cols-3 max-lg:grid-cols-1">
        <div className="max-lg:row-start-2">
          <RollEvents rolls={rolls.slice(0, MAX_TABLE_ROWS)} />
        </div>

        <div className="flex flex-col items-center pt-4 max-lg:row-start-1">
          <div className="flex w-full justify-center">
            <span className="text-xl">
              Roll a 0, 1, 2, 3, 4 or 5 to win the prize!
            </span>
          </div>

          <div className="flex items-center mt-1">
            <span className="text-lg mr-2">Prize:</span>
            <Amount
              amount={prize ? Number(formatEther(prize)) : 0}
              showUsdPrice
              className="text-lg"
            />
          </div>

          <button
            onClick={async () => {
              if (!rolled) {
                setRolled(true);
              }
              setIsRolling(true);
              try {
                await writeDiceGameAsync({
                  functionName: "rollTheDice",
                  value: parseEther(ROLL_ETH_VALUE),
                });
              } catch (err) {
                console.error("Error calling rollTheDice function", err);
              }
            }}
            disabled={isRolling}
            className="mt-2 btn btn-secondary btn-xl normal-case font-xl text-lg"
          >
            Roll the dice!
          </button>
          <div className="mt-4 pt-2 flex flex-col items-center w-full justify-center border-t-4 border-primary">
            <span className="text-2xl">Rigged Roll</span>
            <div className="flex mt-2 items-center">
              <span className="mr-2 text-lg">Address:</span>
              <Address size="lg" address={riggedRollContract?.address} />
            </div>
            <div className="flex mt-1 items-center">
              <span className="text-lg mr-2">Balance:</span>
              <Amount
                amount={Number(riggedRollBalance?.formatted || 0)}
                showUsdPrice
                className="text-lg"
              />
            </div>
          </div>
          {/* <button
            onClick={async () => {
              if (!rolled) {
                setRolled(true);
              }
              setIsRolling(true);
              try {
                await writeRiggedRollAsync({ functionName: "riggedRoll" });
              } catch (err) {
                console.error("Error calling riggedRoll function", err);
              }
            }}
            disabled={isRolling}
            className="mt-2 btn btn-secondary btn-xl normal-case font-xl text-lg"
          >
            Rigged Roll!
          </button> */}
          <div className="flex mt-8">
            {rolled ? (
              isRolling ? (
                <video
                  key="rolling"
                  width={300}
                  height={300}
                  loop
                  src="/rolls/Spin.webm"
                  autoPlay
                />
              ) : (
                <video
                  key="rolled"
                  width={300}
                  height={300}
                  src={`/rolls/${rolls[0]?.roll || "0"}.webm`}
                  autoPlay
                />
              )
            ) : (
              <video
                ref={videoRef}
                key="last"
                width={300}
                height={300}
                src={`/rolls/${rolls[0]?.roll || "0"}.webm`}
              />
            )}
          </div>
        </div>

        <div className="max-lg:row-start-3">
          <WinnerEvents winners={winners.slice(0, MAX_TABLE_ROWS)} />
        </div>
      </div>
    </div>
  );
};

export default DiceGame;
