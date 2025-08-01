"use client";

import { type FC, useMemo, useState } from "react";
import { TransactionData } from "../create/page";
import { TransactionItem } from "./_components";
import { useInterval } from "usehooks-ts";
import { useChainId } from "wagmi";
import {
  useDeployedContractInfo,
  useScaffoldContract,
  useScaffoldEventHistory,
  useScaffoldReadContract,
} from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getPoolServerUrl } from "~~/utils/getPoolServerUrl";
import { notification } from "~~/utils/scaffold-eth";

const Pool: FC = () => {
  const [transactions, setTransactions] = useState<TransactionData[]>();
  // const [subscriptionEventsHashes, setSubscriptionEventsHashes] = useState<`0x${string}`[]>([]);
  const { targetNetwork } = useTargetNetwork();
  const poolServerUrl = getPoolServerUrl(targetNetwork.id);
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "MetaMultiSigWallet" });
  const chainId = useChainId();
  const { data: nonce } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
  });

  const { data: eventsHistory } = useScaffoldEventHistory({
    contractName: "MetaMultiSigWallet",
    eventName: "ExecuteTransaction",
    watch: true,
  });

  const { data: metaMultiSigWallet } = useScaffoldContract({
    contractName: "MetaMultiSigWallet",
  });

  const historyHashes = useMemo(
    () => eventsHistory?.map((ev) => ev.args.hash) || [],
    [eventsHistory]
  );

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

            const isOwner = await metaMultiSigWallet?.read.isOwner([
              signer as string,
            ]);

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

  const lastTx = useMemo(
    () =>
      transactions
        ?.filter((tx) => historyHashes.includes(tx.hash))
        .sort((a, b) => (BigInt(a.nonce) < BigInt(b.nonce) ? 1 : -1))[0],
    [historyHashes, transactions]
  );

  return (
    <div className="flex flex-col flex-1 items-center my-20 gap-8">
      <div className="flex items-center flex-col flex-grow w-full max-w-2xl">
        <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 w-full">
          <div className="text-xl font-bold">Pool</div>

          <div>Nonce: {nonce !== undefined ? `#${nonce}` : "Loading..."}</div>

          <div className="flex flex-col mt-8 gap-4">
            {transactions === undefined
              ? "Loading..."
              : transactions.map((tx) => {
                  return (
                    <TransactionItem
                      key={tx.hash}
                      tx={tx}
                      completed={historyHashes.includes(
                        tx.hash as `0x${string}`
                      )}
                      outdated={
                        lastTx?.nonce != undefined &&
                        BigInt(tx.nonce) <= BigInt(lastTx?.nonce)
                      }
                    />
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pool;
