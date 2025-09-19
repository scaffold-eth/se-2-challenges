import { getConfig } from "../utils";

export const getRandomPrice = async (nodeAddress: string, currentPrice: number): Promise<number> => {
  const config = getConfig();
  const nodeConfig = config.NODE_CONFIGS[nodeAddress] || config.NODE_CONFIGS.default;

  // Calculate variance range based on the node's PRICE_VARIANCE
  // PRICE_VARIANCE of 0 means no variance, higher values mean wider range
  const varianceRange = Math.floor(currentPrice * nodeConfig.PRICE_VARIANCE);

  // Apply variance to the base price
  const finalPrice = currentPrice + (Math.random() * 2 - 1) * varianceRange;

  // Round to nearest integer
  return Math.round(finalPrice);
};
