//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/MyUSD.sol";
import "../contracts/MyUSDEngine.sol";
import "../contracts/MyUSDStaking.sol";
import "../contracts/DEX.sol";
import "../contracts/Oracle.sol";
import "../contracts/RateController.sol";
import "./DeployHelpers.s.sol";

contract DeployMyUSD is ScaffoldETHDeploy {
    // Default ETH price (~$2000 USD scaled to 18 decimals).
    // Note: Hardhat deploy fetches real ETH price from Uniswap via fetchPriceFromUniswap().
    // Foundry can't easily call external contracts at deploy time, so we use a hardcoded default.
    uint256 constant DEFAULT_ETH_PRICE = 2000 ether;

    // Set to a non-zero address to transfer engine/staking ownership after deployment.
    // Mirrors Hardhat's CONTRACT_OWNER logic — defaults to address(0) (no transfer).
    address constant CONTRACT_OWNER = address(0);

    function run() external ScaffoldEthDeployerRunner {
        // Pre-compute future addresses for circular dependencies
        // Deploy order: RateController(+0), MyUSD(+1), DEX(+2), Oracle(+3), MyUSDStaking(+4), MyUSDEngine(+5)
        uint64 deployerNonce = vm.getNonce(deployer);

        address futureStakingAddress = vm.computeCreateAddress(deployer, deployerNonce + 4);
        address futureEngineAddress = vm.computeCreateAddress(deployer, deployerNonce + 5);

        // 1. Deploy RateController (needs future engine + staking addresses)
        RateController rateController = new RateController(futureEngineAddress, futureStakingAddress);
        console.logString(string.concat("RateController deployed at: ", vm.toString(address(rateController))));

        // 2. Deploy MyUSD token (needs future engine + staking addresses)
        MyUSD myUSD = new MyUSD(futureEngineAddress, futureStakingAddress);
        console.logString(string.concat("MyUSD deployed at: ", vm.toString(address(myUSD))));

        // 3. Deploy DEX
        DEX dex = new DEX(address(myUSD));
        console.logString(string.concat("DEX deployed at: ", vm.toString(address(dex))));

        // 4. Deploy Oracle
        Oracle oracle = new Oracle(address(dex), DEFAULT_ETH_PRICE);
        console.logString(string.concat("Oracle deployed at: ", vm.toString(address(oracle))));

        // 5. Deploy MyUSDStaking
        MyUSDStaking staking = new MyUSDStaking(address(myUSD), futureEngineAddress, address(rateController));
        console.logString(string.concat("MyUSDStaking deployed at: ", vm.toString(address(staking))));
        require(address(staking) == futureStakingAddress, "Staking address mismatch");

        // 6. Deploy MyUSDEngine
        MyUSDEngine engine = new MyUSDEngine(address(oracle), address(myUSD), address(staking), address(rateController));
        console.logString(string.concat("MyUSDEngine deployed at: ", vm.toString(address(engine))));
        require(address(engine) == futureEngineAddress, "Engine address mismatch");

        // Seed liquidity — localhost only (matches Hardhat's localhost guard).
        // `yarn chain` boots anvil with --balance 100_000_000_000 so the deployer
        // has enough real ETH to fund a deep DEX and a large collateral position.
        if (block.chainid == 31337) {
            uint256 ethCollateralAmount = 3e7 ether;
            uint256 ethDEXAmount = 1e7 ether;
            uint256 myUSDAmount = DEFAULT_ETH_PRICE * 1e7;

            engine.addCollateral{ value: ethCollateralAmount }();
            engine.mintMyUSD(myUSDAmount);

            if (myUSD.balanceOf(deployer) == myUSDAmount) {
                myUSD.approve(address(dex), myUSDAmount);
                dex.init{ value: ethDEXAmount }(myUSDAmount);
            }

            // Transfer ownership if CONTRACT_OWNER is set
            if (CONTRACT_OWNER != address(0) && CONTRACT_OWNER != deployer) {
                engine.transferOwnership(CONTRACT_OWNER);
                staking.transferOwnership(CONTRACT_OWNER);
            }
        }
    }
}
