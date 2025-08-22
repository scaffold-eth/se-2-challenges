import TooltipInfo from "~~/components/TooltipInfo";
import { AddOracleButton } from "~~/components/oracle/whitelist/AddOracleButton";
import { WhitelistRow } from "~~/components/oracle/whitelist/WhitelistRow";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const LoadingRow = () => {
  return (
    <tr>
      <td className="animate-pulse">
        <div className="h-8 bg-secondary rounded w-32"></div>
      </td>
      <td className="animate-pulse">
        <div className="h-8 bg-secondary rounded w-20"></div>
      </td>
      <td className="animate-pulse">
        <div className="h-8 bg-secondary rounded w-24"></div>
      </td>
    </tr>
  );
};

const NoNodesRow = () => {
  return (
    <tr>
      <td colSpan={3} className="text-center">
        No nodes found
      </td>
    </tr>
  );
};

export const WhitelistTable = () => {
  const { data: oraclesAdded, isLoading: isLoadingOraclesAdded } = useScaffoldEventHistory({
    contractName: "WhitelistOracle",
    eventName: "OracleAdded",
    fromBlock: 0n,
    watch: true,
  });

  const { data: oraclesRemoved, isLoading: isLoadingOraclesRemoved } = useScaffoldEventHistory({
    contractName: "WhitelistOracle",
    eventName: "OracleRemoved",
    fromBlock: 0n,
    watch: true,
  });

  const { data: activeOracleNodes } = useScaffoldReadContract({
    contractName: "WhitelistOracle",
    functionName: "getActiveOracleNodes",
    watch: true,
  });

  const isLoading = isLoadingOraclesAdded || isLoadingOraclesRemoved;
  const oracleAddresses = oraclesAdded
    ?.map((item, index) => ({
      address: item?.args?.oracleAddress as string,
      originalIndex: index,
    }))
    ?.filter(item => !oraclesRemoved?.some(removedOracle => removedOracle?.args?.oracleAddress === item.address));

  const tooltipText = `This table displays registered oracle nodes that provide price data to the system. Nodes are considered active if they've reported within the last 10 seconds. You can add a new oracle node by clicking the "Add Oracle Node" button or edit the price of an oracle node.`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Oracle Nodes</h2>
          <span className="text-sm text-gray-500">
            <TooltipInfo infoText={tooltipText} className="tooltip-right" />
          </span>
        </div>
        <div className="flex gap-2">
          <AddOracleButton />
        </div>
      </div>
      <div className="bg-base-100 rounded-lg p-4 relative">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Node Address</th>
                <th>
                  <div className="flex items-center gap-1">
                    Last Reported Price (USD)
                    <TooltipInfo infoText="Color shows proximity to median price" />
                  </div>
                </th>
                <th>Last Reported Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingRow />
              ) : oracleAddresses?.length === 0 ? (
                <NoNodesRow />
              ) : (
                oracleAddresses?.map((item, arrayIndex) => (
                  <WhitelistRow
                    key={arrayIndex}
                    index={item.originalIndex}
                    address={item.address}
                    isActive={activeOracleNodes?.includes(item.address) ?? false}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
