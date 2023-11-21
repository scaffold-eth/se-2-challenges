import { type FC } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAccount } from "wagmi";
import { TransactionEventItem } from "~~/components/TransactionEventItem";
import { Address, Balance } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const Multisig: FC = () => {
  const { address } = useAccount();
  const { data: executeTransactionEvents } = useScaffoldEventHistory({
    contractName: "MetaMultiSigWallet",
    eventName: "ExecuteTransaction",
    fromBlock: 0n,
  });

  console.log("executeTransactionEvents", executeTransactionEvents);
  return (
    <>
      <Balance address={address} />
      <QRCodeSVG value={address || ""} size={256} />
      <Address address={address} />

      {executeTransactionEvents?.map(txEvent => (
        <TransactionEventItem key={txEvent.args.hash} {...txEvent.args} />
      ))}
    </>
  );
};

export default Multisig;
