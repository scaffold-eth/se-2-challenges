import { artifacts, deployScript } from "../rocketh/deploy.js";
import { parseEther, formatEther } from "viem";

export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    const diceGame = await env.deploy("DiceGame", {
      account: deployer,
      artifact: artifacts.DiceGame,
      args: [],
    });

    // env.deploy ignores `value`; fund the contract separately (DiceGame has receive())
    await env.tx({
      account: deployer,
      to: diceGame.address,
      value: parseEther("0.05"),
    });

    console.log("Deployed Dice Game Contract Address", diceGame.address);

    const balanceHex = (await env.network.provider.request({
      method: "eth_getBalance",
      params: [diceGame.address, "latest"],
    })) as `0x${string}`;
    console.log("Deployed Dice Game Contract Balance", formatEther(BigInt(balanceHex)));
  },
  { tags: ["DiceGame"] },
);
