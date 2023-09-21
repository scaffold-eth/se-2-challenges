import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "Vendor" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const deployVendor: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  // Deploy Vendor
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const yourToken = await hre.ethers.getContract("YourToken", deployer);
  await deploy("Vendor", {
    from: deployer,
    // Contract constructor arguments
    args: [yourToken.address],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });
  const vendor = await hre.ethers.getContract("Vendor", deployer);
  // Transfer tokens to Vendor
  await yourToken.transfer(vendor.address, hre.ethers.utils.parseEther("1000"));
  // Transfer contract ownership to your frontend address
  await vendor.transferOwnership("0x700858968646e613c2D457f28a386a5Fdf83533a");
};

export default deployVendor;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Vendor
deployVendor.tags = ["Vendor"];
