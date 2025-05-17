"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useBlockNumber, useReadContract } from "wagmi";
import { erc20Abi } from "~~/components/constants";
import { useSelectedNetwork } from "~~/hooks/scaffold-eth";

export function LPFinalTokenBalance({
  tokenAddress,
  address,
  tokenValue,
  winningOption,
  lpRevenue,
}: {
  tokenAddress: string;
  address: string;
  tokenValue: bigint;
  winningOption: string;
  lpRevenue: bigint;
}) {
  const { data: balance, queryKey } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "balanceOf",
    args: [address],
  });

  const selectedNetwork = useSelectedNetwork();
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({
    watch: true,
    chainId: selectedNetwork.id,
    query: {
      enabled: true,
    },
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockNumber]);

  return (
    <div className="text-lg">
      <p className="mt-0 mb-0">
        Redeemable &quot;{winningOption}&quot; Token Balance: <br />
        <span className="text-gray-700">{balance ? formatEther(balance) : "0"} tokens</span> worth{" "}
        {tokenValue && balance ? formatEther((tokenValue * balance) / BigInt(10 ** 18)) : "0"} ETH
      </p>
      <p className="mt-4 mb-0">
        LP Revenue:{" "}
        <span className="text-gray-700">{lpRevenue ? Number(formatEther(lpRevenue)).toFixed(4) : "0"} ETH</span>
        <br />
        <strong>Withdraw in total: </strong>
        {balance && tokenValue && lpRevenue
          ? (Number(formatEther((tokenValue * balance) / BigInt(10 ** 18))) + Number(formatEther(lpRevenue))).toFixed(4)
          : "0"}{" "}
        ETH
      </p>
    </div>
  );
}
