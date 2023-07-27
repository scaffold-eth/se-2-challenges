import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat/";
import { DiceGame, SimpleRoll } from "../typechain-types/";

const deploySimpleRoll: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const diceGame: DiceGame = await ethers.getContract("DiceGame");

  await deploy("SimpleRoll", {
    from: deployer,
    log: true,
    args: [diceGame.address],
    autoMine: true,
  });

  const simpleRoll: SimpleRoll = await ethers.getContract(
    "SimpleRoll",
    deployer,
  );

  // Please replace the text "Your Address" with your own address.
  // const ownershipTransaction =  await simpleRoll.transferOwnership("Your Address");
};

export default deploySimpleRoll;

deploySimpleRoll.tags = ["SimpleRoll"];
