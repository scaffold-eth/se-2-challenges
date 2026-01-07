import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "FundingRecipient" using the deployer account.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployFundingRecipient: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("FundingRecipient", {
    from: deployer,
    log: true,
    autoMine: true,
  });
};

export default deployFundingRecipient;

deployFundingRecipient.tags = ["FundingRecipient"];
