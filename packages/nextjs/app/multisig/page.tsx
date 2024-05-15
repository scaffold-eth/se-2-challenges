"use client";

import { type FC } from "react";
import { QRCodeSVG } from "qrcode.react";
import { TransactionEventItem } from "~~/components/TransactionEventItem";
import { Address, Balance } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const Multisig: FC = () => {
  const { data: contractInfo } = useDeployedContractInfo("MetaMultiSigWallet");

  const contractAddress = contractInfo?.address;

  const { data: executeTransactionEvents } = useScaffoldEventHistory({
    contractName: "MetaMultiSigWallet",
    eventName: "ExecuteTransaction",
    fromBlock: 0n,
  });

  return (
    <div className="flex items-center flex-col flex-grow w-full my-20 gap-8">
      <div className="flex flex-col gap-4 items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 w-full max-w-lg">
        <Balance address={contractAddress} />
        <QRCodeSVG value={contractAddress || ""} size={256} />
        <Address address={contractAddress} />
      </div>

      <div className="flex flex-col mt-10 items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 w-full max-w-3xl">
        <div className="text-xl font-bold my-2">Events:</div>
        {executeTransactionEvents?.map(txEvent => (
          <TransactionEventItem key={txEvent.args.hash} {...(txEvent.args as Required<(typeof txEvent)["args"]>)} />
        ))}
      </div>
    </div>
  );
};

export default Multisig;
