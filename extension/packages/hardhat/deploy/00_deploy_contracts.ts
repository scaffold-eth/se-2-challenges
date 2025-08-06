import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { fetchPriceFromUniswap } from "../scripts/fetchPriceFromUniswap";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
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

  const ethPrice = await fetchPriceFromUniswap();

  // Add the account that you want to be the owner of your contracts when deployment is complete
  const CONTRACT_OWNER = deployer; // Change this if you want to update the rates with a different account than the deployer

  // Get the deployer's current nonce
  const deployerNonce = await hre.ethers.provider.getTransactionCount(deployer);

  // Calculate future addresses based on nonce
  const futureStakingAddress = hre.ethers.getCreateAddress({
    from: deployer,
    nonce: deployerNonce + 4, // +4 because it will be our fifth deployment (after MyUSD, DEX, Oracle, RateController)
  });

  const futureEngineAddress = hre.ethers.getCreateAddress({
    from: deployer,
    nonce: deployerNonce + 5, // +5 because it will be our sixth deployment (after MyUSD, DEX, Oracle, Staking, RateController)
  });

  await deploy("RateController", {
    from: deployer,
    args: [futureEngineAddress, futureStakingAddress],
    log: true,
  });
  const rateController = await hre.ethers.getContract<Contract>("RateController", deployer);

  await deploy("MyUSD", {
    from: deployer,
    args: [futureEngineAddress, futureStakingAddress],
    log: true,
  });
  const stablecoin = await hre.ethers.getContract<Contract>("MyUSD", deployer);

  await deploy("DEX", {
    from: deployer,
    args: [stablecoin.target],
    log: true,
  });
  const DEX = await hre.ethers.getContract<Contract>("DEX", deployer);

  await deploy("Oracle", {
    from: deployer,
    args: [DEX.target, ethPrice],
    log: true,
  });
  const oracle = await hre.ethers.getContract<Contract>("Oracle", deployer);

  await deploy("MyUSDStaking", {
    from: deployer,
    args: [stablecoin.target, futureEngineAddress, rateController.target],
    log: true,
  });
  const staking = await hre.ethers.getContract<Contract>("MyUSDStaking", deployer);

  // Finally deploy the engine at the predicted address
  await deploy("MyUSDEngine", {
    from: deployer,
    args: [oracle.target, stablecoin.target, staking.target, rateController.target],
    log: true,
  });
  const engine = await hre.ethers.getContract<Contract>("MyUSDEngine", deployer);

  if (engine.target !== futureEngineAddress) {
    throw new Error(
      "Engine address does not match predicted address, did you add transactions above this line that would skew the nonce set for 'futureEngineAddress'?",
    );
  }

  if (hre.network.name === "localhost") {
    // Set deployer ETH balance
    await hre.ethers.provider.send("hardhat_setBalance", [
      deployer,
      `0x${hre.ethers.parseEther("100000000000000000000").toString(16)}`,
    ]);

    // The deployer is going to provide liquidity to the DEX so that we can swap tokens
    // First they will borrow stablecoins and then provide liquidity to the DEX
    // We will make the deployer account deposit a tone of collateral so they are rarely at risk of liquidation
    const ethCollateralAmount = hre.ethers.parseEther("10000000000000000000");
    // Set initial price of stablecoin (as determined by DEX liquidity)
    const ethDEXAmount = hre.ethers.parseEther("10000000");
    const myUSDAmount = ethPrice * 10000000n;

    // Borrow stablecoins
    await engine.addCollateral({ value: ethCollateralAmount });
    await engine.mintMyUSD(myUSDAmount);

    const confirmedBalance = await stablecoin.balanceOf(deployer);
    // Don't add DEX liquidity if the deployer account doesn't have the stablecoins
    if (confirmedBalance == myUSDAmount) {
      // Approve DEX to use tokens and initialize DEX
      await stablecoin.approve(DEX.target, myUSDAmount);
      await DEX.init(myUSDAmount, { value: ethDEXAmount });
    }

    // Set the owner of the engine and staking contracts
    if (CONTRACT_OWNER !== deployer) {
      await engine.transferOwnership(CONTRACT_OWNER);
      await staking.transferOwnership(CONTRACT_OWNER);
    }
  }
};

export default deployContracts;
