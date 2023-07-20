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
            <span className="block text-4xl font-bold">Challenge #2: 🏵 Token Vendor 🤖</span>
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
                🤖 Smart contracts are kind of like "always on" vending machines that anyone can access. Let's make a
                decentralized, digital currency. Then, let's build an unstoppable vending machine that will buy and sell
                the currency. We'll learn about the "approve" pattern for ERC20s and how contract to contract
                interactions work.
              </p>
              <p className="text-center text-lg">
                🌟 The final deliverable is an app that lets users purchase your ERC20 token, transfer it, and sell it
                back to the vendor. Deploy your contracts on your public chain of choice and then deploy your app to a
                public webserver. Submit the url on{" "}
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
