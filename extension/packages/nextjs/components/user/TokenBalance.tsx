import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount, useBlockNumber, useReadContract } from "wagmi";
import { erc20Abi } from "~~/components/constants";
import { useScaffoldReadContract, useSelectedNetwork } from "~~/hooks/scaffold-eth";

export function TokenBalance({
  tokenAddress,
  option,
  redeem,
}: {
  tokenAddress: string;
  option: string;
  redeem: boolean;
}) {
  const { address } = useAccount();

  const { data: balance, queryKey } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "balanceOf",
    args: [address ?? "0x0"],
  });

  const { data: prediction } = useScaffoldReadContract({
    contractName: "PredictionMarket",
    functionName: "getPrediction",
  });

  const tokenValue = prediction?.[4];

  const selectedNetwork = useSelectedNetwork();
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({
    watch: true,
    chainId: selectedNetwork.id,
    query: {
      enabled: true,
    },
  });

  const tokenBalanceValue = balance && tokenValue ? (balance * tokenValue) / BigInt(10n ** 18n) : 0n;

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockNumber]);

  return (
    <>
      <div>
        <div className="">
          <h3 className="text-lg font-medium">
            My Token Balance of &quot;{option}&quot;:{" "}
            <span className="">{balance ? formatEther(balance) : "0"} tokens</span>
          </h3>
          <p className="mt-0  text-sm">
            ({tokenBalanceValue ? formatEther(tokenBalanceValue) : "0"} {redeem ? "Ξ worth" : "Ξ worth in case of win"})
          </p>
        </div>
      </div>
    </>
  );
}
