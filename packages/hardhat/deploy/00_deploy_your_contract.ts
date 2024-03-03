import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { DEX } from "../typechain-types/contracts/DEX";
import { Balloons } from "../typechain-types/contracts/Balloons";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("Balloons", {
    from: deployer,
    // Contract constructor arguments
    //args: [deployer],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });
  // Get the deployed contract
  // const yourContract = await hre.ethers.getContract("YourContract", deployer);
  const balloons: Balloons = await hre.ethers.getContract("Balloons", deployer);
  const balloonsAddress = await balloons.getAddress();

  await deploy("DEX", {
    from: deployer,
    // Contract constructor arguments
    args: [balloonsAddress],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  const dex = (await hre.ethers.getContract("DEX", deployer)) as DEX;

  // // paste in your front-end address here to get 10 balloons on deploy:
  // await balloons.transfer("YOUR_FRONTEND_ADDRESS", "" + 10 * 10 ** 18);

  // // uncomment to init DEX on deploy:

  // const dexAddress = await dex.getAddress();
  // console.log("Approving DEX (" + dexAddress + ") to take Balloons from main account...");
  // // If you are going to the testnet make sure your deployer account has enough ETH
  // await balloons.approve(dexAddress, hre.ethers.parseEther("100"));
  // console.log("INIT exchange...");
  // await dex.init(hre.ethers.parseEther("5"), {
  //   value: hre.ethers.parseEther("5"),
  //   gasLimit: 200000,
  // });
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["Balloons", "DEX"];
