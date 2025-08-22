import { useEffect, useRef } from "react";
import { ConfigSlider } from "./ConfigSlider";
import { NodeRowProps } from "./types";
import { erc20Abi, formatEther } from "viem";
import { useReadContract, useWatchContractEvent } from "wagmi";
import { HighlightedCell } from "~~/components/oracle/HighlightedCell";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { getHighlightColorForPrice } from "~~/utils/helpers";

export const NodeRow = ({ address, isStale }: NodeRowProps) => {
  const { data = [] } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "nodes",
    args: [address],
  });

  const { data: oracleTokenAddress } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "oracleToken",
  });

  const { data: oraBalance, refetch: refetchOraBalance } = useReadContract({
    address: oracleTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
    query: {
      enabled: !!oracleTokenAddress,
    },
  });

  useWatchContractEvent({
    address: oracleTokenAddress as `0x${string}`,
    abi: erc20Abi,
    eventName: "Transfer",
    onLogs: logs => {
      const relevantTransfer = logs.find(
        log =>
          log.args.to?.toLowerCase() === address.toLowerCase() ||
          log.args.from?.toLowerCase() === address.toLowerCase(),
      );
      if (relevantTransfer) {
        refetchOraBalance();
      }
    },
    enabled: !!oracleTokenAddress,
  });

  const { data: minimumStake } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "MINIMUM_STAKE",
    args: undefined,
  });

  const { data: medianPrice } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getPrice",
  }) as { data: bigint | undefined };

  const [, stakedAmount, lastReportedPrice] = data;

  const prevMedianPrice = useRef<bigint | undefined>(undefined);

  useEffect(() => {
    if (medianPrice !== undefined && medianPrice !== prevMedianPrice.current) {
      prevMedianPrice.current = medianPrice;
    }
  }, [medianPrice]);

  const stakedAmountFormatted = stakedAmount !== undefined ? Number(formatEther(stakedAmount)) : "Loading...";
  const lastReportedPriceFormatted =
    lastReportedPrice !== undefined ? Number(parseFloat(formatEther(lastReportedPrice)).toFixed(2)) : "Not reported";
  const oraBalanceFormatted = oraBalance !== undefined ? Number(formatEther(oraBalance)) : "Loading...";

  // Check if staked amount is below minimum requirement
  const isInsufficientStake = stakedAmount !== undefined && minimumStake !== undefined && stakedAmount < minimumStake;

  return (
    <tr className={isInsufficientStake ? "opacity-40" : ""}>
      <td>
        <Address address={address} size="sm" format="short" onlyEnsOrAddress={true} />
      </td>
      <HighlightedCell value={stakedAmountFormatted} highlightColor="bg-error">
        {stakedAmountFormatted}
      </HighlightedCell>
      <HighlightedCell
        value={lastReportedPriceFormatted}
        highlightColor={getHighlightColorForPrice(lastReportedPrice, medianPrice)}
        className={isStale ? "opacity-40" : ""}
      >
        {lastReportedPriceFormatted}
      </HighlightedCell>
      <HighlightedCell value={oraBalanceFormatted} highlightColor="bg-success">
        {oraBalanceFormatted}
      </HighlightedCell>
      <ConfigSlider nodeAddress={address.toLowerCase()} endpoint="skip-probability" label="skip rate" />
      <ConfigSlider nodeAddress={address.toLowerCase()} endpoint="price-variance" label="variance" />
    </tr>
  );
};
