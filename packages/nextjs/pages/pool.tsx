import { type FC, useState } from "react";
import { POOL_SERVER_URL, TransactionData } from "./create";
import { readContract } from "@wagmi/core";
import { useInterval } from "usehooks-ts";
import { Abi, Address } from "viem";
import { useChainId } from "wagmi";
import { TransactionItem } from "~~/components/TransactionItem";
import {
  useDeployedContractInfo,
  useScaffoldContractRead,
  useScaffoldEventHistory,
  useScaffoldEventSubscriber,
} from "~~/hooks/scaffold-eth";

const Pool: FC = () => {
  const [transactions, setTransactions] = useState<TransactionData[]>();
  const [subscriptionEventsHashes, setSubscriptionEventsHashes] = useState<`0x${string}`[]>([]);
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

  const historyHashes = eventsHistory?.map(ev => ev.log.args.hash) || [];

  useScaffoldEventSubscriber({
    contractName: "MetaMultiSigWallet",
    eventName: "ExecuteTransaction",
    listener: logs => {
      logs.map(log => {
        const { hash } = log.args;

        if (hash) {
          setSubscriptionEventsHashes(hashes => [...hashes, hash]);
        }
      });
    },
  });

  useInterval(() => {
    const getTransactions = async () => {
      const res: { [key: string]: TransactionData } = await (
        await fetch(`${POOL_SERVER_URL}${contractInfo?.address}_${chainId}`)
      ).json();

      const newTransactions: TransactionData[] = [];
      // eslint-disable-next-line no-restricted-syntax, guard-for-in
      for (const i in res) {
        const thisNonce = BigInt(res[i].nonce);
        // TODO: figure out how to fix nonces here
        // if (thisNonce && nonce && thisNonce > nonce) {
        const validSignatures = [];
        // eslint-disable-next-line guard-for-in, no-restricted-syntax
        for (const s in res[i].signatures) {
          const signer = (await readContract({
            address: contractInfo?.address as Address,
            abi: contractInfo?.abi as Abi,
            functionName: "recover",
            args: [res[i].hash, res[i].signatures[s]],
          })) as Address;

          const isOwner = await readContract({
            address: contractInfo?.address as Address,
            abi: contractInfo?.abi as Abi,
            functionName: "isOwner",
            args: [signer],
          });

          if (signer && isOwner) {
            validSignatures.push({ signer, signature: res[i].signatures[s] });
          }
        }
        const update: TransactionData = { ...res[i], validSignatures };
        newTransactions.push(update);
      }
      setTransactions(newTransactions);
    };

    getTransactions();
  }, 3777);

  return (
    <div className="flex items-center flex-col flex-grow w-full max-w-2xl">
      <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 w-full">
        <div className="text-xl font-bold">Pool</div>

        <div>Nonce: #{nonce ? String(nonce) : "Loading..."}</div>

        <div className="flex flex-col mt-8 gap-4">
          {transactions?.map(tx => {
            return (
              <TransactionItem
                key={tx.hash}
                tx={tx}
                completed={
                  historyHashes.includes(tx.hash) || subscriptionEventsHashes.includes(tx.hash as `0x${string}`)
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Pool;
