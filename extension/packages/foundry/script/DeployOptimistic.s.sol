//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/02_Optimistic/OptimisticOracle.sol";
import "../contracts/02_Optimistic/Decider.sol";
import "./DeployHelpers.s.sol";

contract DeployOptimistic is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Predict Decider address using CREATE nonce
        uint64 nonce = vm.getNonce(msg.sender);
        // OptimisticOracle will be deployed at nonce, Decider at nonce+1
        address futureDeciderAddress = vm.computeCreateAddress(msg.sender, nonce + 1);

        OptimisticOracle optimisticOracle = new OptimisticOracle(futureDeciderAddress);
        console.logString(
            string.concat("OptimisticOracle deployed at: ", vm.toString(address(optimisticOracle)))
        );

        Decider decider = new Decider(address(optimisticOracle));
        console.logString(string.concat("Decider deployed at: ", vm.toString(address(decider))));

        require(address(decider) == futureDeciderAddress, "Decider address mismatch");
    }
}
