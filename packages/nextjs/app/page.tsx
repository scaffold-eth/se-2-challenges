import Image from "next/image";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center mb-8">
          <span className="block text-2xl mb-2">SpeedRunEthereum</span>
          <span className="block text-4xl font-bold">Challenge #6: 👛 Multisig Wallet </span>
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
              👩‍👩‍👧‍👧 A multisig wallet it&apos;s a smart contract that acts like a wallet, allowing us to secure assets by
              requiring multiple accounts to &quot;vote&quot; on transactions. Think of it as a treasure chest that can
              only be opened when all key parties agree.
            </p>
            <p className="text-center text-lg">
              📜 The contract keeps track of all transactions. Each transaction can be confirmed or rejected by the
              signers (smart contract owners). Only transactions that receive enough confirmations can be
              &quot;executed&quot; by the signers.
            </p>
            <p className="text-center text-lg">
              🌟 The final deliverable is a multisig wallet where you can propose adding and removing signers,
              transferring funds to other accounts, and updating the required number of signers to execute a
              transaction. After any of the signers propose a transaction, it&apos;s up to the signers to confirm and
              execute it. Deploy your contracts to a testnet, then build and upload your app to a public web server.
            </p>
            <p className="text-center text-lg">
              💬 Meet other builders working on this challenge and get help in the{" "}
              <a href="https://t.me/+zKllN8OlGuxmYzFh" target="_blank" rel="noreferrer" className="underline">
                Multisig Build Cohort telegram
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
