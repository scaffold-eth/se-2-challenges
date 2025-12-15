import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployStakingOracle: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying Staking Oracle contract...");
  const deployment = await deploy("StakingOracle", {
    contract: "StakingOracle",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const stakingOracleAddress = deployment.address as `0x${string}`;
  console.log("StakingOracle deployed at:", stakingOracleAddress);
};

export default deployStakingOracle;
