//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/PredictionMarket.sol";
import "../contracts/PredictionMarketToken.sol";
import "./DeployHelpers.s.sol";

contract DeployPredictionMarket is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        string memory question = "Will the green car win the race?";
        uint256 initialLiquidity = 1 ether;
        uint256 initialTokenValue = 0.01 ether;
        uint8 initialProbability = 50;
        uint8 percentageLocked = 10;
        address liquidityProvider = deployer;
        address oracle = deployer;

        PredictionMarket predictionMarket = new PredictionMarket{value: initialLiquidity}(
            liquidityProvider,
            oracle,
            question,
            initialTokenValue,
            initialProbability,
            percentageLocked
        );

        console.logString(
            string.concat("PredictionMarket deployed at: ", vm.toString(address(predictionMarket)))
        );
    }
}
