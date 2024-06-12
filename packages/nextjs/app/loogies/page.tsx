"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const Loogies: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [allLoogies, setAllLoogies] = useState<any[]>();
  const [page, setPage] = useState(1n);
  const [loadingLoogies, setLoadingLoogies] = useState(true);
  const perPage = 12n;

  const { data: price } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "price",
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "totalSupply",
  });

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  const { data: contract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  useEffect(() => {
    const updateAllLoogies = async () => {
      setLoadingLoogies(true);
      if (contract && totalSupply) {
        const collectibleUpdate = [];
        const startIndex = totalSupply - 1n - perPage * (page - 1n);
        for (let tokenIndex = startIndex; tokenIndex > startIndex - perPage && tokenIndex >= 0; tokenIndex--) {
          try {
            const tokenId = await contract.read.tokenByIndex([tokenIndex]);
            const tokenURI = await contract.read.tokenURI([tokenId]);
            const jsonManifestString = atob(tokenURI.substring(29));

            try {
              const jsonManifest = JSON.parse(jsonManifestString);
              collectibleUpdate.push({ id: tokenId, uri: tokenURI, ...jsonManifest });
            } catch (e) {
              console.log(e);
            }
          } catch (e) {
            console.log(e);
          }
        }
        console.log("Collectible Update: ", collectibleUpdate);
        setAllLoogies(collectibleUpdate);
      }
      setLoadingLoogies(false);
    };
    updateAllLoogies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSupply, page, perPage, Boolean(contract)]);

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-4xl font-bold">OptimisticLoogies</span>
            <span className="block text-2xl mt-4 mb-2">Loogies with a smile :)</span>
          </h1>
          <div className="text-center">
            <p>Only 3728 Optimistic Loogies available on a price curve increasing 0.2% with each new mint.</p>
            <p>
              Double the supply of the{" "}
              <a href="https://loogies.io/" target="_blank">
                Original Ethereum Mainnet Loogies
              </a>
            </p>
          </div>
          <div className="flex flex-col justify-center items-center mt-6 space-x-2">
            <button
              onClick={async () => {
                try {
                  await writeContractAsync({
                    functionName: "mintItem",
                    value: price,
                  });
                } catch (e) {
                  console.error(e);
                }
              }}
              className="btn btn-primary"
              disabled={!connectedAddress || !price}
            >
              Mint Now for {price ? (+formatEther(price)).toFixed(6) : "-"} ETH
            </button>
            <p>{Number(3728n - (totalSupply || 0n))} Loogies left</p>
          </div>
        </div>

        <div className="flex-grow bg-base-300 w-full mt-8 px-8 py-12">
          <div className="flex justify-center items-center space-x-2">
            {loadingLoogies ? (
              <p className="my-2 font-medium">Loading...</p>
            ) : !allLoogies?.length ? (
              <p className="my-2 font-medium">No loogies minted</p>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 my-8 px-8 justify-center">
                  {allLoogies.map(loogie => {
                    return (
                      <div
                        key={loogie.id}
                        className="flex flex-col bg-base-100 px-5 py-10 text-center items-center max-w-xs rounded-3xl"
                      >
                        <h2 className="text-xl font-bold">{loogie.name}</h2>
                        <Image src={loogie.image} alt={loogie.name} width="300" height="300" />
                        <p>{loogie.description}</p>
                        <Address address={loogie.owner} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center mt-8">
                  <div className="join">
                    {page > 1n && (
                      <button className="join-item btn" onClick={() => setPage(page - 1n)}>
                        «
                      </button>
                    )}
                    <button className="join-item btn btn-disabled">Page {page.toString()}</button>
                    {totalSupply !== undefined && totalSupply > page * perPage && (
                      <button className="join-item btn" onClick={() => setPage(page + 1n)}>
                        »
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Loogies;
