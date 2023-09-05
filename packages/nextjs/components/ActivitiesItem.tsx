import { useEffect, useState } from "react";
import Link from "next/link";
import { Amount } from "./Amount";
import { ethers } from "ethers";
import { isAddress } from "ethers/lib/utils";
import Blockies from "react-blockies";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useEnsAvatar, useEnsName } from "wagmi";
import { hardhat } from "wagmi/chains";
import { CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { getBlockExplorerAddressLink, getTargetNetwork } from "~~/utils/scaffold-eth";

/**
 * Displays an address (or ENS) with a Blockie image and option to copy address.
 */

const Address = ({ address }: { address: string }) => {
  const [addressCopied, setAddressCopied] = useState(false);
  const displayAddress = address?.slice(0, 5) + "..." + address?.slice(-4);
  const blockExplorerAddressLink = getBlockExplorerAddressLink(getTargetNetwork(), address);

  return (
    <div className="flex">
      {getTargetNetwork().id === hardhat.id ? (
        <span className={`ml-1.5 text-sm font-normal `}>
          <Link href={blockExplorerAddressLink}>{displayAddress}</Link>
        </span>
      ) : (
        <a
          className={`ml-1.5 text-sm font-normal align-middle`}
          target="_blank"
          href={blockExplorerAddressLink}
          rel="noopener noreferrer"
        >
          {displayAddress}
        </a>
      )}
      {addressCopied ? (
        <CheckCircleIcon
          className="ml-1.5 text-xl font-normal text-sky-600 h-5 w-5 cursor-pointer"
          aria-hidden="true"
        />
      ) : (
        <CopyToClipboard
          text={address}
          onCopy={() => {
            setAddressCopied(true);
            setTimeout(() => {
              setAddressCopied(false);
            }, 800);
          }}
        >
          <DocumentDuplicateIcon
            className="ml-1.5 text-xl font-normal text-sky-600 h-5 w-5 cursor-pointer"
            aria-hidden="true"
          />
        </CopyToClipboard>
      )}
    </div>
  );
};

export type TActivityItemProps = {
  address: string;
  amount: number;
  landedOn: string;
};

export const ActivitiesItem = ({ address, amount, landedOn }: TActivityItemProps) => {
  const [ensAvatar, setEnsAvatar] = useState<string | null>();

  const { data: fetchedEnsAvatar } = useEnsAvatar({
    address,
    enabled: isAddress(address ?? ""),
    chainId: 1,
    cacheTime: 30_000,
  });

  const blockieSizeMap = {
    xs: 6,
    sm: 7,
    base: 8,
    lg: 9,
    xl: 10,
    "2xl": 12,
    "3xl": 15,
  };

  const size = "3xl";

  useEffect(() => {
    setEnsAvatar(fetchedEnsAvatar);
  }, [fetchedEnsAvatar]);

  // Skeleton UI
  if (!address) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-md bg-slate-300 h-6 w-6"></div>
        <div className="flex items-center space-y-6">
          <div className="h-2 w-28 bg-slate-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!ethers.utils.isAddress(address)) {
    return (
      <div>
        <span className="text-error">Wrong address</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between space-x-3 px-1 mb-2 items-center">
        <div className=" flex w-1/6 flex-shrink-0 justify-center ">
          {ensAvatar ? (
            <img className="p-0.5" src={ensAvatar} width={45} height={35} alt={`${address} avatar`} />
          ) : (
            <Blockies className="p-0.5" size={blockieSizeMap[size]} seed={address.toLowerCase()} scale={3} />
          )}
        </div>
        <div className="w-4/6">
          <Address address={address} />
        </div>
        <div className=" w-1/6">
          <span> {landedOn} </span>
        </div>
      </div>
    </>
  );
};

export type TWinnerItemProps = {
  address: string;
  amount: number;
};
export const WinnerItem = ({ address, amount }: TWinnerItemProps) => {
  const [ensAvatar, setEnsAvatar] = useState<string | null>();

  const [ens, setEns] = useState<string | null>();
  const { data: fetchedEnsAvatar } = useEnsAvatar({
    address,
    enabled: isAddress(address ?? ""),
    chainId: 1,
    cacheTime: 30_000,
  });

  const blockieSizeMap = {
    xs: 6,
    sm: 7,
    base: 8,
    lg: 9,
    xl: 10,
    "2xl": 12,
    "3xl": 15,
  };

  const size = "3xl";

  useEffect(() => {
    setEns(fetchedEnsAvatar);
  }, [fetchedEnsAvatar]);

  useEffect(() => {
    setEnsAvatar(fetchedEnsAvatar);
  }, [fetchedEnsAvatar]);

  // Skeleton UI
  if (!address) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-md bg-slate-300 h-6 w-6"></div>
        <div className="flex items-center space-y-6">
          <div className="h-2 w-28 bg-slate-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!ethers.utils.isAddress(address)) {
    return <span className="text-error">Wrong address</span>;
  }

  return (
    <>
      <div className="flex justify-between space-x-3 px-1  mb-2 items-center">
        <div className=" flex w-1/6 flex-shrink-0 justify-center">
          {ensAvatar ? (
            <img className="p-0.5" src={ensAvatar} width={45} height={35} alt={`${address} avatar`} />
          ) : (
            <Blockies className="p-0.5" size={blockieSizeMap[size]} seed={address.toLowerCase()} scale={3} />
          )}
        </div>
        <div className="w-3/6">
          <Address address={address} />
        </div>
        <div className=" w-2/6">
          <Amount showUsdPrice={true} amount={amount} />
        </div>
      </div>
    </>
  );
};
