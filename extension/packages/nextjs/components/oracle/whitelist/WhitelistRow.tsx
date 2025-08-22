import { useEffect } from "react";
import { EditableCell } from "../EditableCell";
import { formatEther } from "viem";
import { useBlockNumber, useReadContract } from "wagmi";
import { HighlightedCell } from "~~/components/oracle/HighlightedCell";
import { WhitelistRowProps } from "~~/components/oracle/types";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useSelectedNetwork } from "~~/hooks/scaffold-eth";
import { SIMPLE_ORACLE_ABI } from "~~/utils/constants";
import { getHighlightColorForPrice } from "~~/utils/helpers";

export const WhitelistRow = ({ address, isActive }: WhitelistRowProps) => {
  const selectedNetwork = useSelectedNetwork();

  const { data, refetch } = useReadContract({
    address: address,
    abi: SIMPLE_ORACLE_ABI,
    functionName: "getPrice",
    query: {
      enabled: true,
    },
  }) as { data: readonly [bigint, bigint] | undefined; refetch: () => void };

  const { data: blockNumber } = useBlockNumber({
    watch: true,
    chainId: selectedNetwork.id,
    query: {
      enabled: true,
    },
  });

  useEffect(() => {
    refetch();
  }, [blockNumber, refetch]);

  const { data: medianPrice } = useScaffoldReadContract({
    contractName: "WhitelistOracle",
    functionName: "getPrice",
    watch: true,
  }) as { data: bigint | undefined };

  const lastReportedPriceFormatted =
    data !== undefined ? Number(parseFloat(formatEther(data[0])).toFixed(2)) : "Not reported";

  return (
    <tr className={`table-fixed ${isActive ? "" : "opacity-40"}`}>
      <td>
        <Address address={address} size="sm" format="short" onlyEnsOrAddress={true} />
      </td>
      <EditableCell
        value={lastReportedPriceFormatted}
        address={address}
        highlightColor={getHighlightColorForPrice(data?.[0], medianPrice)}
      />
      <HighlightedCell value={isActive ? "active" : "stale"} highlightColor={""}>
        {isActive ? "Active" : "Stale"}
      </HighlightedCell>
    </tr>
  );
};
