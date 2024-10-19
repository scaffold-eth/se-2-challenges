import Image from "next/image";
import type { NextPage } from "next";

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
          <div className="max-w-3xl">
            <p className="text-center text-lg mt-8">
            Acompaña a Fomito en sus aventuras por la WEB3  
              <a href="https://linktr.ee/lablocka" target="_blank" rel="noreferrer" className="underline">
                La Blocka
              </a>{" "}
              con muchos humor y memes 🤪💸📉
            </p>
            <p className="text-center text-lg">
              🌟 Mintea los espisodios de la blocka en Zora the url on{" "}
              <a href="https://zora.co/@lablocka/created?collection=base%3A0x0b80c8514a8b97cc1fabeda25f29a2bf7f43e2f3" target="_blank" rel="noreferrer" className="underline">
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
