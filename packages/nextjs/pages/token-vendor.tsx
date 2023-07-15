import { formatEther } from "ethers/lib/utils.js";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";

const TokenVendor: NextPage = () => {
  const { address } = useAccount();
  const { data: yourTokenSymbol } = useScaffoldContractRead({
    contractName: "YourToken",
    functionName: "symbol",
  });

  const { data: yourTokenBalance } = useScaffoldContractRead({
    contractName: "YourToken",
    functionName: "balanceOf",
    args: [address],
  });

  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="flex flex-col items-center space-y-2 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-24 w-full max-w-lg">
          <div className="text-xl">Your tokens:</div>
          <div className="w-full flex items-center justify-center text-xl">
            {parseFloat(formatEther(yourTokenBalance || "0")).toFixed(4)}
            <span className="font-bold ml-1">{yourTokenSymbol}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default TokenVendor;
