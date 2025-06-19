import React, { useState } from "react";
import TooltipInfo from "./TooltipInfo";
import { useTheme } from "next-themes";
import { Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatEther } from "viem";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const PriceGraph = () => {
  const [showRates, setShowRates] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const strokeColor = isDarkMode ? "#ffffff" : "#000000";
  const yellowColor = "#f9a73e";
  const redColor = "#bf212f";
  const greenColor = "#27b376";

  const { data: ethPrice } = useScaffoldReadContract({
    contractName: "Oracle",
    functionName: "getETHUSDPrice",
  });
  const ethPriceInUSD = Number(formatEther(ethPrice || 0n));

  const { data: priceEvents, isLoading: isPriceLoading } = useScaffoldEventHistory({
    contractName: "DEX",
    eventName: "PriceUpdated",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: false,
    receiptData: false,
  });

  const { data: borrowRateUpdatedEvents, isLoading: isBorrowRateLoading } = useScaffoldEventHistory({
    contractName: "MyUSDEngine",
    eventName: "BorrowRateUpdated",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: false,
    receiptData: false,
  });

  const { data: savingsRateUpdatedEvents, isLoading: isSavingsRateLoading } = useScaffoldEventHistory({
    contractName: "MyUSDStaking",
    eventName: "SavingsRateUpdated",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: false,
    receiptData: false,
  });

  const isLoading =
    isPriceLoading ||
    isBorrowRateLoading ||
    isSavingsRateLoading ||
    !priceEvents ||
    !borrowRateUpdatedEvents ||
    !savingsRateUpdatedEvents;

  const combinedEvents = [
    ...(priceEvents || []),
    ...(borrowRateUpdatedEvents || []),
    ...(savingsRateUpdatedEvents || []),
  ];
  const sortedEvents = combinedEvents.sort((a, b) => Number(a.blockNumber - b.blockNumber));

  type DataPoint = {
    blockNumber: number;
    price: number;
    borrowRate: number;
    savingsRate: number;
  };

  const priceData = sortedEvents.reduce<DataPoint[]>((acc, event, idx) => {
    const price =
      event?.eventName === "PriceUpdated" ? 1 / (Number(formatEther(event?.args?.price || 0n)) / ethPriceInUSD) : 0;
    const borrowRate = event?.eventName === "BorrowRateUpdated" ? Number(event?.args?.newRate || 0n) / 100 : -1;
    const savingsRate = event?.eventName === "SavingsRateUpdated" ? Number(event?.args?.newRate || 0n) / 100 : -1;

    const prevPrice = acc[idx - 1]?.price || 1;
    const prevBorrowRate = acc[idx - 1]?.borrowRate || 0;
    const prevSavingsRate = acc[idx - 1]?.savingsRate || 0;

    return [
      ...acc,
      {
        blockNumber: Number(event.blockNumber) || 0,
        price: price && Number.isFinite(price) ? price : prevPrice,
        borrowRate: borrowRate >= 0 && Number.isFinite(borrowRate) ? borrowRate : prevBorrowRate,
        savingsRate: savingsRate >= 0 && Number.isFinite(savingsRate) ? savingsRate : prevSavingsRate,
      },
    ];
  }, []);

  return (
    <div className="card bg-base-100 w-full shadow-xl indicator">
      <TooltipInfo
        top={3}
        right={3}
        infoText="Monitor MyUSD's price dynamics alongside its borrowing and savings interest rates. Toggle rates visibility using the button"
      />
      <div className="card-body p-0 h-96 w-full">
        <div className="flex justify-between items-center pt-5 px-5">
          <h2 className="card-title mb-0">Price Graph</h2>
          <button className="btn btn-sm btn-outline" onClick={() => setShowRates(!showRates)}>
            {showRates ? "Hide Rates" : "Show Rates"}
          </button>
        </div>
        {isLoading ? (
          <div className="flex items-center text-center justify-center h-full">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : priceData.length === 0 ? (
          <div className="flex items-center text-center justify-center h-full">
            <p className="text-lg text-gray-500">No data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={500} height={300} data={priceData} margin={{ top: 10, right: 25, bottom: 20, left: 30 }}>
              <XAxis
                domain={["auto", "auto"]}
                dataKey="blockNumber"
                stroke={strokeColor}
                tick={false}
                label={{ value: "Time (Blocks)", position: "insideBottom", fill: strokeColor }}
              />
              <YAxis
                yAxisId="left"
                scale="linear"
                domain={[(dataMin: number) => dataMin - 0.0001, (dataMax: number) => dataMax + 0.0001]}
                stroke={strokeColor}
                tick={{ fill: strokeColor, fontSize: 12 }}
                label={{ value: "Price", angle: -90, position: "insideLeft", fill: strokeColor, offset: -10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                scale="linear"
                domain={[(dataMin: number) => dataMin - 0.5, (dataMax: number) => dataMax + 0.5]}
                stroke={strokeColor}
                tick={{ fill: strokeColor, fontSize: 12 }}
                label={{ value: "Rates (%)", angle: 90, position: "insideRight", fill: strokeColor, dy: 15, dx: -15 }}
                hide={!showRates}
              />
              <ReferenceLine yAxisId="left" y={1.0} stroke="#71717b" strokeDasharray="5 5" strokeWidth={2} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="price"
                stroke={yellowColor}
                dot={false}
                strokeWidth={2}
                name="Price"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="savingsRate"
                stroke={greenColor}
                dot={false}
                strokeWidth={2}
                name="Savings Rate"
                hide={!showRates}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="borrowRate"
                stroke={redColor}
                dot={false}
                strokeWidth={2}
                name="Borrow Rate"
                hide={!showRates}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: 10 }}
                formatter={value => <span style={{ color: strokeColor }}>{value}</span>}
                payload={showRates ? undefined : [
                  { value: "Price", type: "line", color: yellowColor }
                ]}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PriceGraph;
