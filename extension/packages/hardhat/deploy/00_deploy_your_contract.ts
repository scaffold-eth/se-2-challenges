import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import * as fs from "fs";
/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
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

  const question = "Will the green car win the race?";
  const initialLiquidity = ethers.parseEther("1");
  const initialTokenValue = ethers.parseEther("0.01");
  const initialProbability = 50;
  const percentageLocked = 10;
  const liquidityProvider = deployer;
  const oracle = deployer;

  await deploy("PredictionMarket", {
    from: deployer,
    // Contract constructor arguments
    args: [liquidityProvider, oracle, question, initialTokenValue, initialProbability, percentageLocked],
    log: true,
    value: initialLiquidity.toString(),
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const predictionMarket = await hre.ethers.getContract<Contract>("PredictionMarket", deployer);
  console.log("PredictionMarket deployed to:", await predictionMarket.getAddress());

  // Get the deployed contract's address and ABI for the YES and NO tokens and copy them to the deployments directory
  if (predictionMarket.i_yesToken && predictionMarket.i_noToken) {
    try {
      const { abi } = JSON.parse(
        fs.readFileSync("./artifacts/contracts/PredictionMarketToken.sol/PredictionMarketToken.json").toString(),
      );

      const i_yesToken = await predictionMarket.i_yesToken();
      const i_noToken = await predictionMarket.i_noToken();
      const yesToken = { address: i_yesToken, abi };
      const noToken = { address: i_noToken, abi };

      const chainDir = `./deployments/${hre.network.name}`;
      fs.writeFileSync(`${chainDir}/PredictionMarketTokenYes.json`, JSON.stringify(yesToken, null, 2));
      fs.writeFileSync(`${chainDir}/PredictionMarketTokenNo.json`, JSON.stringify(noToken, null, 2));
      console.log("Token JSON files written successfully");
    } catch (error) {
      console.error("Error handling token files:", error);
    }
  } else {
    console.log("No Yes, No token contracts deployed yet");
  }
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["PredictionMarket"];
