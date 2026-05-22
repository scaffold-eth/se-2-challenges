import { artifacts, deployScript } from "../rocketh/deploy.js";

/**
 * Deploys a contract named "Voting" using the deployer account.
 *
 * On localhost, the deployer account is the one that comes with Hardhat, which is already funded.
 *
 * When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
 * should have sufficient balance to pay for the gas fees for contract creation.
 *
 * You can generate a random account with `yarn generate` or `yarn account:import` to import your
 * existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (used in hardhat.config.ts).
 * Run `yarn account` to check the deployer balance on every network.
 */
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    const ownerAddress = "0x0000000000000000000000000000000000000001";

    /// checkpoint 6 //////
    const verifierAddress = "0x0000000000000000000000000000000000000002"; // placeholder
    // const verifier = await deploy("HonkVerifier", {
    //   account: deployer,
    //   artifact: artifacts.HonkVerifier,
    //   args: [],
    // });

    /// checkpoint 2 //////
    const leanIMTAddress = "0x0000000000000000000000000000000000000003"; // placeholder
    // const poseidon3 = await deploy("PoseidonT3", {
    //   account: deployer,
    //   artifact: artifacts.PoseidonT3,
    //   args: [],
    // });

    // const leanIMT = await deploy("LeanIMT", {
    //   account: deployer,
    //   artifact: artifacts.LeanIMT,
    //   args: [],
    //   libraries: {
    //     PoseidonT3: poseidon3.address,
    //   },
    // });

    await deploy("Voting", {
      account: deployer,
      artifact: artifacts.Voting,
      /// checkpoint 6 //////
      args: [ownerAddress, verifierAddress, "Should we build zk apps?"],
      libraries: {
        /// checkpoint 2 //////
        LeanIMT: leanIMTAddress,
      },
    });
  },
  // Tags are useful if you have multiple deploy files and only want to run one of them.
  // e.g. yarn deploy --tags YourVotingContract
  { tags: ["YourVotingContract"] },
);
