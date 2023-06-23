import { useState } from "react";
import { Address, AddressInput } from "../scaffold-eth";
import { Collectible } from "./MyHoldings";
import { BigNumber } from "ethers";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

export const NFTCard = ({ nft }: { nft: Collectible }) => {
  const [transferToAddress, setTransferToAddress] = useState("");

  const { writeAsync: transferNFT } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "transferFrom",
    args: [nft.owner, transferToAddress, BigNumber.from(nft.id.toString())],
  });

  return (
    <div className="card bg-base-100 shadow-xl">
      <figure className="px-5 pt-5 relative">
        {/* eslint-disable-next-line  */}
        <img src={nft.image} alt="NFT Image" className="rounded-xl h-60 min-w-full" />
        <figcaption className="glass absolute bottom-4 left-8 p-4 w-25 rounded-xl">
          <span className="text-white "># {nft.id}</span>
        </figcaption>
      </figure>
      <div className="card-body py-5 px-5">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-lg font-semibold">Name : </span>
          <p className="text-lg p-0 m-0">{nft.name}</p>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-lg font-semibold">Desc : </span>
          <p className="my-0">{nft.description}</p>
        </div>
        <div
          className="flex space-x-3 mt-1 items-center
          "
        >
          <span className="text-lg font-semibold">Owner : </span>
          <Address address={nft.owner} />
        </div>
        {/* The Card looks too long if we show attributes too */}
        {/*<div className="flex flex-col my-2 space-y-1">
          <span className="text-lg font-semibold">Attributes : </span>
          <div className="flex flex-wrap space-x-2">
            {nft.attributes?.map((attr, index) => (
              <span key={index} className="badge py-3">
                {attr.value}
              </span>
            ))}
          </div>
        </div>*/}
        <div className="flex flex-col my-2 space-y-1">
          <span className="text-lg font-semibold">Transfer To: </span>
          <AddressInput
            value={transferToAddress}
            placeholder="receiver address"
            onChange={newValue => setTransferToAddress(newValue)}
          />
        </div>
        <div className="card-actions justify-center">
          <button className="btn btn-primary btn-md px-8 tracking-wide" onClick={() => transferNFT()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
