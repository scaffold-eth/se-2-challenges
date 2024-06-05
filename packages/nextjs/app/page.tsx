import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center mb-8">
          <span className="block text-2xl mb-2">SpeedRunEthereum</span>
          <span className="block text-4xl font-bold">Challenge #7: 🎁 SVG NFT</span>
        </h1>
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/hero.png"
            width="727"
            height="231"
            alt="challenge banner"
            className="rounded-xl border-4 border-primary"
          />
          <div className="max-w-3xl text-center text-lg">
            <p className="text-center text-lg mt-8">
              🏆 Assuming you have made it this far you should be comfortable with the basics of 🏗 Scaffold-Eth 2
            </p>
            <p>⚗️ This challenge is _very_ open-ended!</p>
            <p>
              🛠 Take{" "}
              <Link href={"/loogies"} className="underline">
                Loogies NFT
              </Link>{" "}
              as an example and make your own SVG NFT. Post the minting URL in the chat!
            </p>
            <p className="text-center text-lg font-bold">
              💸 MAIN GOAL: Build an SVG NFT on mainnet and let us ape in.
            </p>
            <p>
              💵 A side goal here is to make something cool enough that people might pay a little ETH for your hardwork
              on the Solidity!
            </p>
            <p>
              💬 Meet other builders working on this challenge and get help in the{" "}
              <a href="https://t.me/+mUeITJ5u7Ig0ZWJh" target="_blank" rel="noreferrer" className="underline">
                🎁 SVG NFT 🎫 Building Cohort
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
