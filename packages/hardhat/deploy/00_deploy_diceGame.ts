import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat/";
import { DiceGame } from "../typechain-types/";

const deployDiceGame: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("DiceGame", {
    from: deployer,
    value: ethers.utils.parseEther("0.05"),
    log: true,
  });

  // Simple example on how get the deployed dice game contract
  const diceGame: DiceGame = await ethers.getContract("DiceGame");

  console.log("Deployed Dice Game Contract Address", diceGame.address);

  const balance = await ethers.provider.getBalance(diceGame.address);
  console.log("Deployed Dice Game Contract Balance", ethers.utils.formatEther(balance.toString()));
};

export default deployDiceGame;

deployDiceGame.tags = ["DiceGame"];
