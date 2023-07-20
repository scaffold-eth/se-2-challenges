import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils.js";

export function multiplyTo1e18(tokens: string | BigNumber) {
  let result = BigNumber.from(0);
  try {
    result = BigNumber.from(parseEther(tokens.toString()));
  } catch (err) {
    // wrong tokens value
  }
  return result;
}

export function getTokenPriceInWei(tokens: string | BigNumber, tokensPerEth?: BigNumber) {
  const tokensMultiplied = multiplyTo1e18(tokens);
  if (!tokensPerEth) return tokensMultiplied;

  return tokensMultiplied.div(tokensPerEth);
}
