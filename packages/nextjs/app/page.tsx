"use client";

import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useState } from "react";


const Home: NextPage = () => {
  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-[90%] md:w-[75%]">
        <h1 className="text-center mb-6">
          <span className="block text-2xl mb-2">La Blocka</span>
          <span className="block text-4xl font-bold">Bingo-Nboarding</span>
        </h1>
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/hero.png"
            width="727"
            height="231"
            alt="challenge banner"
            className="rounded-xl border-4 border-primary"
          />
          <p></p>
          <div className="flex justify-center items-center h-1/5">
            <Link href="https://zora.co/collect/base:0x6344baad01857cb07c4eeb8077a6a45426ac34ee/1" className="inline-block bg-purple-500 text-white font-bold py-2 px-4 rounded-full shadow-lg transform transition-transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 animate-pulse mb-2">
              Mintea los NFTs del juego
            </Link>
          </div>
          <div className="max-w-3xl">
            <p className="text-center text-lg mt-8">
              Acompaña a Fomito en sus aventuras por la WEB3
              <a href="https://linktr.ee/lablocka" target="_blank" rel="noreferrer" className="underline">
                La Blocka
              </a>{" "}
              con mucho humor y memes 🤪💸📉
            </p>
            <p className="text-center text-lg">
              🌟 Mintea los espisodios de la blocka en Zora the url on{" "}
              <a href="/myNFTs" target="_blank" rel="noreferrer" className="underline">
                Zora Episodes
              </a>{" "}
              !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

