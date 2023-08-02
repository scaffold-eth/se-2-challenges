import { useState } from "react";
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils.js";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import { AddressInput, IntegerInput } from "~~/components/scaffold-eth";
import {
  useAccountBalance,
  useDeployedContractInfo,
  useScaffoldContractRead,
  useScaffoldContractWrite,
} from "~~/hooks/scaffold-eth";
import { getTokenPriceInWei, multiplyTo1e18 } from "~~/utils/scaffold-eth/priceInWei";

const TokenVendor: NextPage = () => {
  const [toAddress, setToAddress] = useState("");
  const [tokensToSend, setTokensToSend] = useState("");
  const [tokensToBuy, setTokensToBuy] = useState<string | BigNumber>("");
  const [isApproved, setIsApproved] = useState(false);
  const [tokensToSell, setTokensToSell] = useState<string>("");

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

  const { writeAsync: transferTokens } = useScaffoldContractWrite({
    contractName: "YourToken",
    functionName: "transfer",
    args: [toAddress, multiplyTo1e18(tokensToSend)],
  });

  // // Vendor Balances
  // const { data: vendorContractData } = useDeployedContractInfo("Vendor");
  // const { data: vendorTokenBalance } = useScaffoldContractRead({
  //   contractName: "YourToken",
  //   functionName: "balanceOf",
  //   args: [vendorContractData?.address],
  // });
  // const { balance: vendorEthBalance } = useAccountBalance(vendorContractData?.address);

  // // tokenPerEth
  // const { data: tokensPerEth } = useScaffoldContractRead({
  //   contractName: "Vendor",
  //   functionName: "tokensPerEth",
  // });

  // // Buy Tokens
  // const { writeAsync: buyTokens } = useScaffoldContractWrite({
  //   contractName: "Vendor",
  //   functionName: "buyTokens",
  //   overrides: {
  //     value: getTokenPriceInWei(tokensToBuy, tokensPerEth),
  //   },
  // });

  // // Approve Tokens
  // const { writeAsync: approveTokens } = useScaffoldContractWrite({
  //   contractName: "YourToken",
  //   functionName: "approve",
  //   args: [vendorContractData?.address, multiplyTo1e18(tokensToSell)],
  // });

  // // Sell Tokens
  // const { writeAsync: sellTokens } = useScaffoldContractWrite({
  //   contractName: "Vendor",
  //   functionName: "sellTokens",
  //   args: [multiplyTo1e18(tokensToSell)],
  // });

  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-24 w-full max-w-lg">
          <div className="text-xl">
            Your token balance:{" "}
            <div className="inline-flex items-center justify-center">
              {parseFloat(formatEther(yourTokenBalance || "0")).toFixed(4)}
              <span className="font-bold ml-1">{yourTokenSymbol}</span>
            </div>
          </div>
          {/* Vendor Balances */}
          {/* <hr className="w-full border-secondary my-3" />
          <div>
            Vendor token balance:{" "}
            <div className="inline-flex items-center justify-center">
              {parseFloat(formatEther(vendorTokenBalance || "0")).toFixed(4)}
              <span className="font-bold ml-1">{yourTokenSymbol}</span>
            </div>
          </div>
          <div>
            Vendor eth balance: {vendorEthBalance?.toFixed(4)}
            <span className="font-bold ml-1">ETH</span>
          </div> */}
        </div>

        {/* Buy Tokens */}
        {/* <div className="flex flex-col items-center space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
          <div className="text-xl">Buy tokens</div>
          <div>{tokensPerEth?.toString() || 0} tokens per ETH</div>

          <div className="w-full flex flex-col space-y-2">
            <IntegerInput
              placeholder="amount of tokens to buy"
              value={tokensToBuy.toString()}
              onChange={value => setTokensToBuy(value)}
              hideSuffix
            />
          </div>

          <button className="btn btn-secondary mt-2" onClick={() => buyTokens()}>
            Buy Tokens
          </button>
        </div> */}

        {yourTokenBalance && !yourTokenBalance?.isZero() && (
          <div className="flex flex-col items-center space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
            <div className="text-xl">Transfer tokens</div>
            <div className="w-full flex flex-col space-y-2">
              <AddressInput placeholder="to address" value={toAddress} onChange={value => setToAddress(value)} />
              <IntegerInput
                placeholder="amount of tokens to send"
                value={tokensToSend}
                onChange={value => setTokensToSend(value as string)}
                hideSuffix
              />
            </div>

            <button className="btn btn-secondary" onClick={() => transferTokens()}>
              Send Tokens
            </button>
          </div>
        )}

        {/* Sell Tokens */}
        {/* {yourTokenBalance && !yourTokenBalance?.isZero() && (
          <div className="flex flex-col items-center space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
            <div className="text-xl">Sell tokens</div>
            <div>{tokensPerEth?.toString() || 0} tokens per ETH</div>

            <div className="w-full flex flex-col space-y-2">
              <IntegerInput
                placeholder="amount of tokens to sell"
                value={tokensToSell}
                onChange={value => setTokensToSell(value as string)}
                disabled={isApproved}
                hideSuffix
              />
            </div>

            <div className="flex gap-4">
              <button
                className={`btn ${isApproved ? "btn-disabled" : "btn-secondary"}`}
                onClick={async () => {
                  await approveTokens();
                  setIsApproved(true);
                }}
              >
                Approve Tokens
              </button>

              <button
                className={`btn ${isApproved ? "btn-secondary" : "btn-disabled"}`}
                onClick={async () => {
                  await sellTokens();
                  setIsApproved(false);
                }}
              >
                Sell Tokens
              </button>
            </div>
          </div>
        )} */}
      </div>
    </>
  );
};

export default TokenVendor;
