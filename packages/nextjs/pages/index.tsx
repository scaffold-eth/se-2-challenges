import Image from "next/image";
import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";

const Home: NextPage = () => {
  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-[90%] md:w-[75%]">
          <h1 className="text-center mb-6">
            <span className="block text-2xl mb-2">SpeedRunEthereum</span>
            <span className="block text-4xl font-bold">Challenge #5: 📺 A State Channel Application</span>
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
                🛣️ The Ethereum blockchain has great decentralization & security properties but these properties come at
                a price: transaction throughput is low, and transactions can be expensive. This makes many traditional
                web applications infeasible on a blockchain... or does it? State channels look to solve these problems
                by allowing participants to securely transact off-chain while keeping interaction with Ethereum Mainnet
                at a minimum.
              </p>
              <p className="text-center text-lg">
                🌟 The final deliverable is deploying a simple state channel application, where users seeking a service{" "}
                <b>lock</b> collateral on-chain with a single transaction, <b>interact</b> with their service provider
                entirely off-chain, and <b>finalize</b> the interaction with a second on-chain transaction. Then deploy
                your app to a public webserver. Submit the url on{" "}
                <a href="https://speedrunethereum.com/" target="_blank" rel="noreferrer" className="underline">
                  SpeedRunEthereum.com
                </a>{" "}
                !
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
