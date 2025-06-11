import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

import { config } from "hardhat";

const UNISWAP_V2_PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
];

const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const mainnet = config.networks.mainnet;
const MAINNET_RPC = "url" in mainnet ? mainnet.url : "";

export const fetchPriceFromUniswap = async (): Promise<bigint> => {
  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const tokenAddress = WETH_ADDRESS; // Always use WETH for mainnet

    // Get pair address from Uniswap V2 Factory
    const factory = new ethers.Contract(
      UNISWAP_V2_FACTORY,
      ["function getPair(address tokenA, address tokenB) external view returns (address pair)"],
      provider,
    );

    const pairAddress = await factory.getPair(tokenAddress, DAI_ADDRESS);
    if (pairAddress === ethers.ZeroAddress) {
      throw new Error("No liquidity pair found");
    }

    const pairContract = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
    const [reserves, token0Address] = await Promise.all([pairContract.getReserves(), pairContract.token0()]);

    // Determine which reserve is token and which is DAI
    const isToken0 = token0Address.toLowerCase() === tokenAddress.toLowerCase();
    const tokenReserve = isToken0 ? reserves[0] : reserves[1];
    const daiReserve = isToken0 ? reserves[1] : reserves[0];

    // Calculate price (DAI per token)
    const price = BigInt(Math.floor((Number(daiReserve) / Number(tokenReserve)) * 1e18));
    return price;
  } catch (error) {
    console.error("Error fetching ETH price from Uniswap: ", error);
    return 2600n * 10n ** 18n; // Default price as of 2025-06-02
  }
};
