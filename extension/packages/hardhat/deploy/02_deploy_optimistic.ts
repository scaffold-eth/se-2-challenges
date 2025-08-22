import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployOptimisticOracle: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying OptimisticOracle...");
  console.log("Deployer:", deployer);
  // Get the deployer's current nonce
  const deployerNonce = await hre.ethers.provider.getTransactionCount(deployer);

  const futureDeciderAddress = hre.ethers.getCreateAddress({
    from: deployer,
    nonce: deployerNonce + 1, // +1 because it will be our second deployment
  });
  // Deploy the OptimisticOracle contract with deployer as temporary decider
  const optimisticOracle = await deploy("OptimisticOracle", {
    contract: "OptimisticOracle",
    from: deployer,
    args: [futureDeciderAddress], // Use deployer as temporary decider
    log: true,
    autoMine: true,
  });

  // Deploy the Decider contract
  const decider = await deploy("Decider", {
    contract: "Decider",
    from: deployer,
    args: [optimisticOracle.address],
    log: true,
    autoMine: true,
  });

  // Check if the decider address matches the expected address
  if (decider.address !== futureDeciderAddress) {
    throw new Error("Decider address does not match expected address");
  }

  console.log("OptimisticOracle deployed to:", optimisticOracle.address);
  console.log("Decider deployed to:", decider.address);
};

deployOptimisticOracle.id = "deploy_optimistic_oracle";
deployOptimisticOracle.tags = ["OptimisticOracle"];

export default deployOptimisticOracle;
