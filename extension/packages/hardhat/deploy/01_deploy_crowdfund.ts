import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "CrowdFund" using the deployer account.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployCrowdFund: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const fundingRecipient = await get("FundingRecipient");

  await deploy("CrowdFund", {
    from: deployer,
    args: [fundingRecipient.address],
    log: true,
    autoMine: true,
  });
};

export default deployCrowdFund;

deployCrowdFund.tags = ["CrowdFund"];
