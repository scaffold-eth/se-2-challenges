import { useEffect, useState } from "react";
import { Spinner } from "../Spinner";
import { NFTCard } from "./NFTCard";
import { BigNumber, utils } from "ethers";
import { useAccount } from "wagmi";
import { useScaffoldContract, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { NFTMetaData, getNFTMetadataFromIPFS } from "~~/utils/simpleNFT";

export interface Collectible extends Partial<NFTMetaData> {
  id: number;
  uri: string;
  owner: string;
}

export const MyHoldings = () => {
  const { address: connectedAddress } = useAccount();
  const [myAllCollectibles, setMyAllCollectibles] = useState<Collectible[]>([]);
  const [allCollectiblesLoading, setAllCollectiblesLoading] = useState(false);

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { data: myTotalBalance } = useScaffoldContractRead({
    contractName: "YourCollectible",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true,
  });

  useEffect(() => {
    const updateYourCollectibles = async (): Promise<void> => {
      if (myTotalBalance === undefined || yourCollectibleContract === null || connectedAddress === undefined) return;

      setAllCollectiblesLoading(true);
      const collectibleUpdate: Collectible[] = [];
      const totalBalance = parseInt(myTotalBalance.toString());
      for (let tokenIndex = 0; tokenIndex < totalBalance; tokenIndex++) {
        try {
          console.log("Getting token index", tokenIndex);
          const tokenId = await yourCollectibleContract.tokenOfOwnerByIndex(
            connectedAddress,
            BigNumber.from(tokenIndex.toString()),
          );
          console.log("tokenId", tokenId);
          const tokenURI = await yourCollectibleContract.tokenURI(tokenId);
          console.log("tokenURI", tokenURI);

          const ipfsHash = tokenURI.replace("https://ipfs.io/ipfs/", "");
          console.log("ipfsHash", ipfsHash);

          const nftMetada = await getNFTMetadataFromIPFS(ipfsHash);

          collectibleUpdate.push({
            id: parseInt(tokenId.toString()),
            uri: tokenURI,
            owner: connectedAddress,
            ...nftMetada,
          });
        } catch (e) {
          notification.error("Error fetching all collectibles");
          setAllCollectiblesLoading(false);
          console.log(e);
        }
      }
      setMyAllCollectibles(collectibleUpdate);
      setAllCollectiblesLoading(false);
    };

    updateYourCollectibles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedAddress, myTotalBalance]);

  if (allCollectiblesLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <Spinner width="75" height="75" />
      </div>
    );

  return (
    <>
      {myAllCollectibles.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-2xl text-primary-content">No NFTs found</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-5 mt-5">
          {myAllCollectibles.map(item => (
            <NFTCard nft={item} key={item.id} />
          ))}
        </div>
      )}
    </>
  );
};
