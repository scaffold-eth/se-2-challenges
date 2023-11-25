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

  console.log("executeTransactionEvents", executeTransactionEvents);
  return (
    <>
      <Balance address={contractAddress} />
      <QRCodeSVG value={contractAddress || ""} size={256} />
      <Address address={contractAddress} />

      {executeTransactionEvents?.map(txEvent => (
        <TransactionEventItem key={txEvent.args.hash} {...txEvent.args} />
      ))}
    </>
  );
};

export default Multisig;
