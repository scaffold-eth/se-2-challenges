import { artifacts, deployScript } from "../rocketh/deploy.js";

/**
 * Deploys a contract named "CrowdFund" using the deployer account.
 */
export default deployScript(
  async ({ deploy, get, namedAccounts }) => {
    const { deployer } = namedAccounts;

    const fundingRecipient = get("FundingRecipient");

    await deploy("CrowdFund", {
      account: deployer,
      artifact: artifacts.CrowdFund,
      args: [fundingRecipient.address],
    });
  },
  { tags: ["CrowdFund"] },
);
