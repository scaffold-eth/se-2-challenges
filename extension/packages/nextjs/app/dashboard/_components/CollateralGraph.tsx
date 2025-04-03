import React from "react";
import TooltipInfo from "./TooltipInfo";
import { useTheme } from "next-themes";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEther, parseEther } from "viem";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { collateralRatio, initialPrice } from "~~/utils/constant";

const getPriceFromEvent = (blockNumber: bigint, priceEvents: any) => {
  for (let i = priceEvents.length - 1; i >= 0; i--) {
    if (priceEvents[i].blockNumber <= blockNumber) {
      return priceEvents[i].args.price;
    }
  }
  return initialPrice * parseEther("1");
};

const CollateralGraph = () => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const strokeColor = isDarkMode ? "#ffffff" : "#000000";

  const { data: addEvents } = useScaffoldEventHistory({
    contractName: "Lending",
    eventName: "CollateralAdded",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
    receiptData: true,
  });

  const { data: withdrawEvents } = useScaffoldEventHistory({
    contractName: "Lending",
    eventName: "CollateralWithdrawn",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
    receiptData: true,
  });

  const { data: borrowEvents } = useScaffoldEventHistory({
    contractName: "Lending",
    eventName: "AssetBorrowed",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
    receiptData: true,
  });

  const { data: repaidEvents } = useScaffoldEventHistory({
    contractName: "Lending",
    eventName: "AssetRepaid",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
    receiptData: true,
  });

  const { data: liquidatedEvents } = useScaffoldEventHistory({
    contractName: "Lending",
    eventName: "Liquidation",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
    receiptData: true,
  });

  const { data: priceEvents } = useScaffoldEventHistory({
    contractName: "CornDEX",
    eventName: "PriceUpdated",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
    receiptData: true,
  });

  const combinedEvents = [
    ...(addEvents || []),
    ...(withdrawEvents || []),
    ...(borrowEvents || []),
    ...(repaidEvents || []),
    ...(priceEvents || []),
    ...(liquidatedEvents || []),
  ];
  const sortedEvents = combinedEvents.sort((a, b) => Number(a.blockNumber - b.blockNumber));

  interface DataPoint {
    name: number;
    ratio: number;
    collateral: bigint;
    debt: bigint;
  }

  const ratioData = sortedEvents.reduce<DataPoint[]>((acc, event, idx) => {
    const collateralAdded = event.eventName === "CollateralAdded" ? event.args.amount : 0n;
    const collateralWithdrawn = event.eventName === "CollateralWithdrawn" ? event.args.amount : 0n;
    const price = "price" in event.args ? event.args.price : getPriceFromEvent(event.blockNumber, priceEvents);
    const debtAdded = event.eventName === "AssetBorrowed" ? event.args.amount || 0n : 0n;
    const debtRepaid = event.eventName === "AssetRepaid" ? event.args.amount || 0n : 0n;
    const amountForLiquidator = event.eventName === "Liquidation" ? event.args.amountForLiquidator || 0n : 0n;
    const liquidatedDebtAmount = event.eventName === "Liquidation" ? event.args.liquidatedUserDebt || 0n : 0n;

    const prevCollateral = acc[idx - 1]?.collateral || 0n;
    const prevDebt = acc[idx - 1]?.debt || 0n;

    const collateralInEth =
      prevCollateral + (collateralAdded || 0n) - (collateralWithdrawn || 0n) - (amountForLiquidator || 0n);
    const ethPriceInCorn = BigInt(Math.round(Number(formatEther(price || 0n))));
    const collateralInCorn = collateralInEth * ethPriceInCorn;
    const debt = prevDebt + (debtAdded || 0n) - (debtRepaid || 0n) - (liquidatedDebtAmount || 0n);
    const ratio = Number(formatEther(collateralInCorn) || 1n) / Number(formatEther(debt || collateralInCorn) || 1n);

    return [
      ...acc,
      {
        name: Number(event.blockNumber) || 0,
        ratio: ratio && Number.isFinite(ratio) ? ratio : 1,
        collateral: collateralInEth,
        debt: debt,
      },
    ];
  }, []);

  return (
    <div className="card bg-base-100 w-full shadow-xl indicator">
      <TooltipInfo top={3} right={3} infoText="This graph shows the total collateral/debt ratio over time" />
      <div className="card-body h-96 w-full">
        <h2 className="card-title">Total Collateral/Debt Ratio</h2>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart width={500} height={300} data={ratioData}>
            <XAxis
              domain={["auto", "auto"]}
              dataKey="name"
              stroke={strokeColor}
              tick={false}
              label={{ value: "Time (Blocks)", position: "insideBottom", fill: strokeColor }}
            />
            <YAxis
              scale="log"
              domain={[0.9, 1.5]}
              tickFormatter={value => `${(value * 100).toFixed(0)}%`}
              stroke={strokeColor}
              tick={{ fill: strokeColor }}
            />
            <Tooltip />
            <ReferenceLine y={collateralRatio / 100} stroke="#ff4d4d" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="ratio" stroke="#82ca9d" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CollateralGraph;
