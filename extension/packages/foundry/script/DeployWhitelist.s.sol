//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/00_Whitelist/WhitelistOracle.sol";
import "../contracts/00_Whitelist/SimpleOracle.sol";
import "./DeployHelpers.s.sol";

contract DeployWhitelist is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        WhitelistOracle whitelistOracle = new WhitelistOracle();
        console.logString(
            string.concat("WhitelistOracle deployed at: ", vm.toString(address(whitelistOracle)))
        );

        // Create 3 SimpleOracle instances through the WhitelistOracle
        whitelistOracle.addOracle(msg.sender);
        whitelistOracle.addOracle(msg.sender);
        whitelistOracle.addOracle(msg.sender);
        console.logString("Created 3 SimpleOracle instances");
    }
}
