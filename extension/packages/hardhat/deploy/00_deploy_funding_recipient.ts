import { artifacts, deployScript } from "../rocketh/deploy.js";

/**
 * Deploys a contract named "FundingRecipient" using the deployer account.
 */
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("FundingRecipient", {
      account: deployer,
      artifact: artifacts.FundingRecipient,
      args: [],
    });
  },
  { tags: ["FundingRecipient"] },
);
