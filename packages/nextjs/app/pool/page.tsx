"use client";

import { type FC, useMemo, useState } from "react";
import { TransactionData, getPoolServerUrl } from "../create/page";
import { useInterval } from "usehooks-ts";
import { useChainId } from "wagmi";
import { TransactionItem } from "~~/components/TransactionItem";
import {
  useDeployedContractInfo,
  useScaffoldContract,
  useScaffoldContractRead,
  useScaffoldEventHistory,
  useScaffoldEventSubscriber,
} from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { notification } from "~~/utils/scaffold-eth";

const Pool: FC = () => {
  const [transactions, setTransactions] = useState<TransactionData[]>();
  const [subscriptionEventsHashes, setSubscriptionEventsHashes] = useState<`0x${string}`[]>([]);
  const { targetNetwork } = useTargetNetwork();
  const poolServerUrl = getPoolServerUrl(targetNetwork.id);
  const { data: contractInfo } = useDeployedContractInfo("MetaMultiSigWallet");
  const chainId = useChainId();
  const { data: nonce } = useScaffoldContractRead({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
  });

  const { data: eventsHistory } = useScaffoldEventHistory({
    contractName: "MetaMultiSigWallet",
    eventName: "ExecuteTransaction",
    fromBlock: 0n,
  });

  const { data: metaMultiSigWallet } = useScaffoldContract({
    contractName: "MetaMultiSigWallet",
  });

  const historyHashes = useMemo(() => eventsHistory?.map(ev => ev.log.args.hash) || [], [eventsHistory]);

  useScaffoldEventSubscriber({
    contractName: "MetaMultiSigWallet",
    eventName: "ExecuteTransaction",
    listener: logs => {
      logs.map(log => {
        const { hash } = log.args;

        if (hash) {
          setSubscriptionEventsHashes(hashes => [...hashes, hash as `0x${string}`]);
        }
      });
    },
  });

  useInterval(() => {
    const getTransactions = async () => {
      try {
        const res: { [key: string]: TransactionData } = await (
          await fetch(`${poolServerUrl}${contractInfo?.address}_${chainId}`)
        ).json();

        const newTransactions: TransactionData[] = [];
        // eslint-disable-next-line no-restricted-syntax, guard-for-in
        for (const i in res) {
          const validSignatures = [];
          // eslint-disable-next-line guard-for-in, no-restricted-syntax
          for (const s in res[i].signatures) {
            const signer = (await metaMultiSigWallet?.read.recover([
              res[i].hash as `0x${string}`,
              res[i].signatures[s],
            ])) as `0x${string}`;

            const isOwner = await metaMultiSigWallet?.read.isOwner([signer as string]);

            if (signer && isOwner) {
              validSignatures.push({ signer, signature: res[i].signatures[s] });
            }
          }
          const update: TransactionData = { ...res[i], validSignatures };
          newTransactions.push(update);
        }
        setTransactions(newTransactions);
      } catch (e) {
        notification.error("Error fetching transactions");
        console.log(e);
      }
    };

    getTransactions();
  }, 3777);

  const allEvents = useMemo(
    () => historyHashes.concat(subscriptionEventsHashes),
    [historyHashes, subscriptionEventsHashes],
  );

  const lastTx = useMemo(
    () =>
      transactions
        ?.filter(tx => allEvents.includes(tx.hash))
        .sort((a, b) => (BigInt(a.nonce) < BigInt(b.nonce) ? 1 : -1))[0],
    [allEvents, transactions],
  );

  return (
    <div className="flex items-center flex-col flex-grow w-full max-w-2xl">
      <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 w-full">
        <div className="text-xl font-bold">Pool</div>

        <div>Nonce: {nonce !== undefined ? `#${nonce}` : "Loading..."}</div>

        <div className="flex flex-col mt-8 gap-4">
          {transactions === undefined
            ? "Loading..."
            : transactions.map(tx => {
                return (
                  <TransactionItem
                    key={tx.hash}
                    tx={tx}
                    completed={allEvents.includes(tx.hash as `0x${string}`)}
                    outdated={lastTx?.nonce != undefined && BigInt(tx.nonce) <= BigInt(lastTx?.nonce)}
                  />
                );
              })}
        </div>
      </div>
    </div>
  );
};

export default Pool;
