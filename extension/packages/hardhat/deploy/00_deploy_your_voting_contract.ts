import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourVotingContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` or `yarn account:import` to import your
    existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const ownerAddress = "0x0000000000000000000000000000000000000001";

  /// checkpoint 6 //////
  const verifierAddress = "0x0000000000000000000000000000000000000002"; // placeholder
  // const verifier = await deploy("HonkVerifier", {
  //   from: deployer,
  //   log: true,
  //   autoMine: true,
  // });

  /// checkpoint 2 //////
  const leanIMTAddress = "0x0000000000000000000000000000000000000003"; // placeholder
  // const poseidon3 = await deploy("PoseidonT3", {
  //   from: deployer,
  //   log: true,
  //   autoMine: true,
  // });

  // const leanIMT = await deploy("LeanIMT", {
  //   from: deployer,
  //   log: true,
  //   autoMine: true,
  //   libraries: {
  //     PoseidonT3: poseidon3.address,
  //   },
  // });

  await deploy("Voting", {
    from: deployer,
    // Contract constructor arguments
    /// checkpoint 6 //////
    args: [ownerAddress, verifierAddress, "Should we build zk apps?"],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
    libraries: {
      /// checkpoint 2 //////
      LeanIMT: leanIMTAddress,
    },
  });
};

export default deployYourVotingContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourVotingContract.tags = ["YourVotingContract"];
