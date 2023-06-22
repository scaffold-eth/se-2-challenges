import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { ipfsClient } from "~~/utils/simpleNFT";
import nftsMetadata from "~~/utils/simpleNFT/nftsMetadata";

const MyNFTs: NextPage = () => {
  const { address: connectedAddress } = useAccount();
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
    try {
      const uploadedItem = await ipfsClient.add(JSON.stringify(currentTokenMetaData));

      // First remove previous loading notification and then show success notification
      notification.remove(loadingNotificatioId);
      notification.success("Uploaded to IPFS successfully");

      setCurrentTokenMintCount(currentTokenMintCount + 1);

      await mintItem({
        args: [connectedAddress, uploadedItem.path],
      });
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
        <button className="btn btn-primary" onClick={handleMintItem}>
          Mint Item
        </button>
      </div>
    </>
  );
};

export default MyNFTs;
