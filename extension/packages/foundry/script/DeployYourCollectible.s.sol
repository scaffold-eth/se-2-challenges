//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/YourCollectible.sol";
import "./DeployHelpers.s.sol";

contract DeployYourCollectible is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        YourCollectible yourCollectible = new YourCollectible();
        console.logString(string.concat("YourCollectible deployed at: ", vm.toString(address(yourCollectible))));
    }
}
