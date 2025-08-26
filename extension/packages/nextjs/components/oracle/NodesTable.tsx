import TooltipInfo from "../TooltipInfo";
import { NodeRow } from "./NodeRow";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

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
      <td className="animate-pulse">
        <div className="h-8 bg-secondary rounded w-20"></div>
      </td>
      <td className="animate-pulse">
        <div className="h-8 bg-secondary rounded w-32"></div>
      </td>
      <td className="animate-pulse">
        <div className="h-8 bg-secondary rounded w-32"></div>
      </td>
    </tr>
  );
};

const NoNodesRow = () => {
  return (
    <tr>
      <td colSpan={6} className="text-center">
        No nodes found
      </td>
    </tr>
  );
};

export const NodesTable = () => {
  const { data: nodeAddresses, isLoading } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getNodeAddresses",
  });

  const { data: staleNodesData } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "separateStaleNodes",
    args: [nodeAddresses || []],
  });

  const tooltipText =
    "This table displays registered oracle nodes that provide price data to the system. Nodes are displayed as inactive if they don't have enough ETH staked. You can edit the skip probability and price variance of an oracle node with the slider.";

  // Extract stale node addresses from the returned data
  const staleNodeAddresses = staleNodesData?.[1] || [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">Oracle Nodes</h2>
        <span>
          <TooltipInfo infoText={tooltipText} />
        </span>
      </div>
      <div className="bg-base-100 rounded-lg p-4 relative">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Node Address</th>
                <th>
                  <div className="flex items-center gap-1">
                    Staked ETH
                    <TooltipInfo infoText="Red shows slashing event" />
                  </div>
                </th>
                <th>
                  <div className="flex items-center gap-1">
                    Last Reported Price (USD)
                    <TooltipInfo infoText="Color shows proximity to median price" />
                  </div>
                </th>
                <th>
                  <div className="flex items-center gap-1">
                    ORA Balance
                    <TooltipInfo infoText="Green shows positive balance" />
                  </div>
                </th>
                <th>Skip Probability</th>
                <th>Price Variance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingRow />
              ) : nodeAddresses?.length === 0 ? (
                <NoNodesRow />
              ) : (
                nodeAddresses?.map((address: string, index: number) => (
                  <NodeRow key={index} index={index} address={address} isStale={staleNodeAddresses.includes(address)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
