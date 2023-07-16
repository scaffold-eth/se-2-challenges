import { useState } from "react";
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils.js";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import { AddressInput, IntegerInput } from "~~/components/scaffold-eth";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

const TokenVendor: NextPage = () => {
  const [toAddress, setToAddress] = useState("");
  const [tokensToSend, setTokensToSend] = useState<string | BigNumber>("");
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

  const { writeAsync } = useScaffoldContractWrite({
    contractName: "YourToken",
    functionName: "transfer",
    args: [toAddress, BigNumber.from(tokensToSend || 0)],
  });

  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="flex flex-col items-center space-y-2 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-24 w-full max-w-lg">
          <div className="text-xl">Your tokens</div>
          <div className="w-full flex items-center justify-center text-xl">
            {parseFloat(formatEther(yourTokenBalance || "0")).toFixed(4)}
            <span className="font-bold ml-1">{yourTokenSymbol}</span>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
          <div className="text-xl">Transfer tokens</div>
          <div className="w-full flex flex-col space-y-2">
            <AddressInput placeholder="to address" value={toAddress} onChange={value => setToAddress(value)} />
            <IntegerInput
              placeholder="amount of tokens to send"
              value={tokensToSend}
              onChange={value => setTokensToSend(value)}
            />
          </div>

          <button className="btn btn-secondary" onClick={() => writeAsync()}>
            Send Tokens
          </button>
        </div>
      </div>
    </>
  );
};

export default TokenVendor;
