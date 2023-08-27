import { parseEther } from "viem";

export function multiplyTo1e18(tokens: string | bigint) {
  let result = 0n;
  try {
    result = parseEther(tokens.toString());
  } catch (err) {
    // wrong tokens value
  }
  return result;
}

export function getTokenPriceInWei(tokens: string | bigint, tokensPerEth?: bigint) {
  const tokensMultiplied = multiplyTo1e18(tokens);
  if (!tokensPerEth) return tokensMultiplied;

  return tokensMultiplied / tokensPerEth;
}
