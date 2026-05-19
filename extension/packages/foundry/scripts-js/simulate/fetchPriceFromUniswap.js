import { createPublicClient, http, parseEther, formatEther } from "viem";
import { mainnet } from "viem/chains";
import { getConfig, updatePriceCache } from "./utils.js";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

const UNISWAP_V2_PAIR_ABI = [
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
  },
  {
    type: "function",
    name: "token0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
];

const UNISWAP_V2_FACTORY_ABI = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
  },
];

const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

export const fetchPriceFromUniswap = async () => {
  const config = getConfig();
  const cachedPrice = config.PRICE.CACHEDPRICE;
  const timestamp = config.PRICE.TIMESTAMP;

  if (Date.now() - timestamp < 1000 * 60 * 60) {
    return parseEther(cachedPrice.toString());
  }
  console.log(
    "Cache expired or missing, fetching fresh price from Uniswap..."
  );

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  const rpcUrl = alchemyKey
    ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : "https://eth.llamarpc.com";

  try {
    const mainnetClient = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl),
    });

    const pairAddress = await mainnetClient.readContract({
      address: UNISWAP_V2_FACTORY,
      abi: UNISWAP_V2_FACTORY_ABI,
      functionName: "getPair",
      args: [WETH_ADDRESS, DAI_ADDRESS],
    });

    if (
      pairAddress === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("No liquidity pair found");
    }

    const [reserves, token0Address] = await Promise.all([
      mainnetClient.readContract({
        address: pairAddress,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: "getReserves",
      }),
      mainnetClient.readContract({
        address: pairAddress,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: "token0",
      }),
    ]);

    const isToken0 =
      token0Address.toLowerCase() === WETH_ADDRESS.toLowerCase();
    const tokenReserve = isToken0 ? reserves[0] : reserves[1];
    const daiReserve = isToken0 ? reserves[1] : reserves[0];

    const price = BigInt(
      Math.floor((Number(daiReserve) / Number(tokenReserve)) * 1e18)
    );

    const pricePerEther = parseFloat(formatEther(price));
    updatePriceCache(pricePerEther, Date.now());
    console.log(`Fresh price fetched and cached: ${formatEther(price)} ETH`);

    return price;
  } catch (error) {
    console.error("Error fetching ETH price from Uniswap:", error.message);
    return parseEther(cachedPrice.toString());
  }
};
