import React from "react";
import TooltipInfo from "./TooltipInfo";
import { useTheme } from "next-themes";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { formatEther } from "viem";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { formatDisplayValue } from "~~/utils/helpers";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const PURPLE_COLOR = "#8884d8";
const GREEN_COLOR = "#82ca9d";
const ORANGE_COLOR = "#f9a73e";

type DataPoint = {
  blockNumber: number;
  circulatingSupply: number;
  stakedSupply: number;
  totalSupply: number;
};

const calculateDexSwapAmounts = (event: any) => {
  if (!event || event.eventName !== "Swap") return { sent: 0, received: 0 };

  const { inputToken, inputAmount, outputAmount } = event.args || {};
  const isEthToMyUSD = inputToken === ZERO_ADDRESS;

  return {
    sent: isEthToMyUSD ? Number(formatEther(outputAmount || 0n)) : 0,
    received: !isEthToMyUSD ? Number(formatEther(inputAmount || 0n)) : 0,
  };
};

const CustomTooltip = ({ active, payload, label, data }: TooltipProps<number, string> & { data: DataPoint[] }) => {
  if (active && payload && payload.length) {
    // Find the data point for this block number
    const dataPoint = data?.find(d => d.blockNumber === label);
    const circulating = dataPoint?.circulatingSupply || 0;
    const staked = payload.find(p => p.dataKey === "stakedSupply")?.value || 0;
    const total = payload.find(p => p.dataKey === "totalSupply")?.value || 0;

    return (
      <div className="bg-base-200 border border-base-300 rounded-lg px-3 my-0 shadow-lg">
        <p className="font-semibold text-sm mt-2 mb-1">Block {label}</p>
        <p className="text-sm my-0">
          <span style={{ color: PURPLE_COLOR }}>●</span> Circulating: {formatDisplayValue(circulating)} MyUSD
        </p>
        <p className="text-sm my-0">
          <span style={{ color: GREEN_COLOR }}>●</span> Staked: {formatDisplayValue(staked)} MyUSD
        </p>
        <p className="text-sm my-0">
          <span style={{ color: ORANGE_COLOR }}>●</span> Total: {formatDisplayValue(total)} MyUSD
        </p>
      </div>
    );
  }
  return null;
};

const SupplyGraph = () => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const strokeColor = isDarkMode ? "#ffffff" : "#000000";

  const { data: ethPrice } = useScaffoldReadContract({
    contractName: "Oracle",
    functionName: "getETHUSDPrice",
  });

  const initialDexSupply = Number(formatEther(ethPrice ? ethPrice * 10000000n : 0n));

  const { data: debtSharesMintedEvents, isLoading: isDebtSharesMintedLoading } = useScaffoldEventHistory({
    contractName: "MyUSDEngine",
    eventName: "DebtSharesMinted",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: false,
    receiptData: false,
  });

  const { data: debtSharesBurnedEvents, isLoading: isDebtSharesBurnedLoading } = useScaffoldEventHistory({
    contractName: "MyUSDEngine",
    eventName: "DebtSharesBurned",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: false,
    receiptData: false,
  });

  const { data: stakedEvents, isLoading: isStakedLoading } = useScaffoldEventHistory({
    contractName: "MyUSDStaking",
    eventName: "Staked",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: false,
    receiptData: false,
  });

  const { data: withdrawnEvents, isLoading: isWithdrawnLoading } = useScaffoldEventHistory({
    contractName: "MyUSDStaking",
    eventName: "Withdrawn",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: false,
    receiptData: false,
  });

  const { data: swapEvents, isLoading: isSwapLoading } = useScaffoldEventHistory({
    contractName: "DEX",
    eventName: "Swap",
    fromBlock: 0n,
    watch: true,
    blockData: true,
  });

  const isLoading =
    isDebtSharesMintedLoading || isDebtSharesBurnedLoading || isStakedLoading || isWithdrawnLoading || isSwapLoading;

  const combinedEvents = [
    ...(debtSharesMintedEvents || []),
    ...(debtSharesBurnedEvents || []),
    ...(stakedEvents || []),
    ...(withdrawnEvents || []),
    ...(swapEvents || []),
  ];
  const sortedEvents = combinedEvents.sort((a, b) => Number(a.blockNumber - b.blockNumber));

  const supplyData = sortedEvents.reduce<DataPoint[]>((acc, event, idx) => {
    const prevCirculatingSupply = acc[idx - 1]?.circulatingSupply || 0;
    const prevStakedSupply = acc[idx - 1]?.stakedSupply || 0;
    let minted = event?.eventName === "DebtSharesMinted" ? Number(formatEther(event?.args?.amount || 0n)) : 0;
    const burned = event?.eventName === "DebtSharesBurned" ? Number(formatEther(event?.args?.amount || 0n)) : 0;
    const staked = event?.eventName === "Staked" ? Number(formatEther(event?.args?.amount || 0n)) : 0;
    const withdrawn = event?.eventName === "Withdrawn" ? Number(formatEther(event?.args?.amount || 0n)) : 0;

    const { sent: dexSentMyUSDAmount, received: dexReceivedMyUSDAmount } = calculateDexSwapAmounts(event);

    if (minted >= initialDexSupply) {
      minted = 0;
    }

    const circulatingSupply = Math.max(
      prevCirculatingSupply + minted - burned - staked + withdrawn + dexSentMyUSDAmount - dexReceivedMyUSDAmount,
      0,
    );
    const stakedSupply = Math.max(prevStakedSupply + staked - withdrawn, 0);
    const totalSupply = circulatingSupply + stakedSupply;

    return [
      ...acc,
      {
        blockNumber: Number(event?.blockNumber) || 0,
        circulatingSupply:
          circulatingSupply && Number.isFinite(circulatingSupply) ? circulatingSupply : prevCirculatingSupply,
        stakedSupply: stakedSupply && Number.isFinite(stakedSupply) ? stakedSupply : prevStakedSupply,
        totalSupply:
          totalSupply && Number.isFinite(totalSupply) ? totalSupply : prevCirculatingSupply + prevStakedSupply,
      },
    ];
  }, []);

  return (
    <div className="card bg-base-100 w-full shadow-xl indicator">
      <TooltipInfo
        top={3}
        right={3}
        infoText="Visualize MyUSD's total circulation (purple) and staked tokens (green) across time"
      />
      <div className="card-body p-0 h-96 w-full">
        <div className="flex justify-between items-center pt-5 px-5">
          <h2 className="card-title mb-0">Supply Graph</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center text-center justify-center h-full">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={500} height={300} data={supplyData} margin={{ top: 10, right: 25, bottom: 20, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <YAxis
                tickFormatter={formatDisplayValue}
                domain={[0, (dataMax: number) => dataMax]}
                label={{
                  value: "MyUSD Amount",
                  angle: -90,
                  position: "insideLeft",
                  fill: strokeColor,
                  dy: 50,
                  offset: -10,
                }}
                tick={{ fill: strokeColor, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip data={supplyData} />} />
              <Line
                type="monotone"
                dataKey="totalSupply"
                name="Total"
                stroke={ORANGE_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="stakedSupply"
                name="Staked"
                stroke={GREEN_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                hide={stakedEvents?.length === 0}
              />
              <XAxis
                domain={["auto", "auto"]}
                dataKey="blockNumber"
                stroke={strokeColor}
                tick={false}
                label={{ value: "Time (Blocks)", position: "insideBottom", fill: strokeColor }}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: 10 }}
                formatter={value => <span style={{ color: strokeColor }}>{value}</span>}
                payload={
                  stakedEvents && stakedEvents?.length > 0
                    ? undefined
                    : [{ value: "Total", type: "line", color: ORANGE_COLOR }]
                }
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SupplyGraph;
