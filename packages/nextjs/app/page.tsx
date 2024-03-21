import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center mb-8">
          <span className="block text-2xl mb-2">SpeedRunEthereum</span>
          <span className="block text-4xl font-bold">Challenge #X: Challenge Title </span>
        </h1>
        <p className="text-center text-lg">
          Get started by editing{" "}
          <code className="italic bg-base-300 text-base font-bold">packages/nextjs/page/app.tsx</code>
        </p>
        <p className="text-center text-lg">
          Edit your smart contract <code className="italic bg-base-300 text-base font-bold">YourContract.sol</code> in{" "}
          <code className="italic bg-base-300 text-base font-bold">packages/hardhat/contracts</code>
        </p>
      </div>
    </div>
  );
};

export default Home;
