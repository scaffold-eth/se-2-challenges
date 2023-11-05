import { type FC } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAccount } from "wagmi";
import { Address, Balance } from "~~/components/scaffold-eth";

const Multisig: FC = () => {
  const { address } = useAccount();

  return (
    <div className="w-full flex flex-col items-center mt-20 gap-8">
      <Balance address={address} />
      <QRCodeSVG value={address || ""} size={256} />
      <Address address={address} />
    </div>
  );
};

export default Multisig;
