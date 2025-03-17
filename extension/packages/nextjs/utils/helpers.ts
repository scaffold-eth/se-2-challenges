import { collateralRatio } from "./constant";

export function getRatioColorClass(ratio: number | string): string {
  if (ratio === "N/A") return "";
  if (Number(ratio) < collateralRatio) return "text-red-800";
  if (Number(ratio) < 200) return "dark:text-[#FFB74D] text-[#FF8C00]";
  return "dark:text-[#00FF7F] text-[#008000]";
}

export function calculatePositionRatio(userCollateral: number, borrowedAmount: number, ethPrice: number): number {
  const collateralValue = userCollateral * ethPrice;
  if (borrowedAmount === 0) return Number.MAX_SAFE_INTEGER; // Return max if no tokens are borrowed
  return (collateralValue / borrowedAmount) * 100; // Calculate position ratio
}
