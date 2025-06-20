import { collateralRatio } from "./constant";

export function getRatioColorClass(ratio: number | string): string {
  if (ratio === "N/A") return "";
  if (Number(ratio) < collateralRatio) return "text-red-800";
  if (Number(ratio) < 200) return "dark:text-[#FFB74D] text-[#FF8C00]";
  return "dark:text-[#00FF7F] text-[#008000]";
}

export function calculatePositionRatio(userCollateral: number, mintedAmount: number, ethPrice: number): number {
  const collateralValue = userCollateral * ethPrice;
  if (mintedAmount === 0) return Number.MAX_SAFE_INTEGER; // Return max if no tokens are minted
  return (collateralValue / mintedAmount) * 100; // Calculate position ratio
}

export const formatDisplayValue = (value: number) => {
  if (value > 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value > 1000) {
    return `${(value / 1000).toFixed(2)}k`;
  }
  return value.toFixed(2);
};
