"use client";

import { useEffect, useState } from "react";
import { Guru, Rube } from "./_components";
import { NextPage } from "next";
import { Address as AddressType } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/**
 * sends the provided wisdom across the application channel
 * with user at `clientAddress`.
 * @param {string} clientAddress
 */

const Streamer: NextPage = () => {
  const { address: userAddress } = useAccount();

  const { data: ownerAddress } = useScaffoldReadContract({
    contractName: "Streamer",
    functionName: "owner",
  });

  const ownerKnown = ownerAddress !== undefined;
  const isGuru = ownerKnown && ownerAddress === userAddress;

  // challenged
  const [challenged, setChallenged] = useState<AddressType[]>([]);

  const { data: challengedHistoryData } = useScaffoldEventHistory({
    contractName: "Streamer",
    eventName: "Challenged",
    fromBlock: 0n,
    watch: true,
  });

  useEffect(() => {
    if (challengedHistoryData?.length !== undefined && challengedHistoryData.length !== challenged.length) {
      const challengedChannelsAddresses = challengedHistoryData?.map(event => event.args[0]) as AddressType[];
      setChallenged(challengedChannelsAddresses || []);
    }
  }, [challenged.length, challengedHistoryData]);

  // closed
  const [closed, setClosed] = useState<AddressType[]>([]);

  const { data: closedHistoryData } = useScaffoldEventHistory({
    contractName: "Streamer",
    eventName: "Closed",
    fromBlock: 0n,
    watch: true,
  });

  useEffect(() => {
    if (closedHistoryData?.length !== undefined && closedHistoryData?.length !== closed.length) {
      const closedChannelsAddresses = closedHistoryData?.map(event => event.args[0]) as AddressType[];
      setClosed(closedChannelsAddresses);
    }
  }, [closed.length, closedHistoryData]);

  // opened
  const { data: openedHistoryData } = useScaffoldEventHistory({
    contractName: "Streamer",
    eventName: "Opened",
    fromBlock: 0n,
    watch: true,
  });

  const [opened, setOpened] = useState<AddressType[]>([]);

  useEffect(() => {
    if (openedHistoryData?.length !== undefined && openedHistoryData?.length !== opened.length) {
      const openedChannelsAddresses = openedHistoryData?.map(event => event.args[0]).reverse() as AddressType[];
      setOpened(openedChannelsAddresses);
    }
  }, [opened.length, openedHistoryData]);

  const writableChannels = opened.filter(addr => !closed.includes(addr));

  return (
    <>
      <div className="flex items-center flex-col flex-grow w-full px-4">
        <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-24 w-full max-w-lg">
          {ownerKnown ? (
            isGuru ? (
              <Guru closed={closed} opened={opened} challenged={challenged} writable={writableChannels} />
            ) : (
              <Rube closed={closed} opened={opened} challenged={challenged} writable={writableChannels} />
            )
          ) : null}
        </div>
      </div>
    </>
  );
};

export default Streamer;
