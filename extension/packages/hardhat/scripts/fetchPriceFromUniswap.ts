import * as dotenv from "dotenv";
dotenv.config();

import { createPublicClient, http, zeroAddress } from "viem";
import { mainnet } from "viem/chains";

const UNISWAP_V2_PAIR_ABI = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { internalType: "uint112", name: "reserve0", type: "uint112" },
      { internalType: "uint112", name: "reserve1", type: "uint112" },
      { internalType: "uint32", name: "blockTimestampLast", type: "uint32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const UNISWAP_V2_FACTORY_ABI = [
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
    ],
    name: "getPair",
    outputs: [{ internalType: "address", name: "pair", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F" as const;
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as const;
const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" as const;

const providerApiKey = process.env.ALCHEMY_API_KEY || "IZYEU2cWBgnFmgiTAgpWD";
const MAINNET_RPC = `https://eth-mainnet.g.alchemy.com/v2/${providerApiKey}`;

export const fetchPriceFromUniswap = async (): Promise<bigint> => {
  try {
    const client = createPublicClient({ chain: mainnet, transport: http(MAINNET_RPC) });
    const tokenAddress = WETH_ADDRESS;

    const pairAddress = (await client.readContract({
      address: UNISWAP_V2_FACTORY,
      abi: UNISWAP_V2_FACTORY_ABI,
      functionName: "getPair",
      args: [tokenAddress, DAI_ADDRESS],
    })) as `0x${string}`;
    if (pairAddress === zeroAddress) {
      throw new Error("No liquidity pair found");
    }

    const [reserves, token0Address] = await Promise.all([
      client.readContract({ address: pairAddress, abi: UNISWAP_V2_PAIR_ABI, functionName: "getReserves" }),
      client.readContract({ address: pairAddress, abi: UNISWAP_V2_PAIR_ABI, functionName: "token0" }),
    ]);

    const isToken0 = (token0Address as string).toLowerCase() === tokenAddress.toLowerCase();
    const tokenReserve = isToken0 ? reserves[0] : reserves[1];
    const daiReserve = isToken0 ? reserves[1] : reserves[0];

    // Calculate price (DAI per token)
    const price = BigInt(Math.floor((Number(daiReserve) / Number(tokenReserve)) * 1e18));
    return price;
  } catch (error) {
    console.error("Error fetching ETH price from Uniswap: ", error);
    // Fallback so local deploy/seeding still works when the mainnet RPC is unavailable
    // (e.g. no/invalid Alchemy key, rate limit, offline). ~ETH/DAI price as of 2025-06-02.
    return 2600n * 10n ** 18n;
  }
};
