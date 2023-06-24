import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { MyHoldings } from "~~/components/simpleNFT";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { ipfsClient } from "~~/utils/simpleNFT";
import nftsMetadata from "~~/utils/simpleNFT/nftsMetadata";

const MyNFTs: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [currentTokenMintCount, setCurrentTokenMintCount] = useState(0);

  const { writeAsync: mintItem } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "mintItem",
    args: [connectedAddress, ""],
  });

  const handleMintItem = async () => {
    // circel back to the zeroitem if we've reached the end of the array
    const currentTokenMetaData = nftsMetadata[currentTokenMintCount % nftsMetadata.length];
    const loadingNotificatioId = notification.loading("Uploading to IPFS");
    console.log("Minting token object ---------", currentTokenMetaData, currentTokenMintCount % nftsMetadata.length);
    try {
      const uploadedItem = await ipfsClient.add(JSON.stringify(currentTokenMetaData));

      // First remove previous loading notification and then show success notification
      notification.remove(loadingNotificatioId);
      notification.success("Metadata uploaded to IPFS");

      await mintItem({
        args: [connectedAddress, uploadedItem.path],
      });

      setCurrentTokenMintCount(prevCount => prevCount + 1);
    } catch (error) {
      notification.remove(loadingNotificatioId);
      console.error(error);
    }
  };

  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">My NFTs</span>
          </h1>
        </div>
      </div>
      <div className="flex justify-center">
        {!isConnected || isConnecting ? (
          <RainbowKitCustomConnectButton />
        ) : (
          <button className="btn btn-secondary" onClick={handleMintItem}>
            Mint Item
          </button>
        )}
      </div>
      <MyHoldings />
    </>
  );
};

export default MyNFTs;
