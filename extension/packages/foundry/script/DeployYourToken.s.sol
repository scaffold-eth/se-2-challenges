//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/YourToken.sol";
import "../contracts/Vendor.sol";
import "./DeployHelpers.s.sol";

contract DeployYourToken is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        YourToken yourToken = new YourToken();
        console.logString(string.concat("YourToken deployed at: ", vm.toString(address(yourToken))));

        Vendor vendor = new Vendor(address(yourToken));
        console.logString(string.concat("Vendor deployed at: ", vm.toString(address(vendor))));

        // Transfer tokens to Vendor and transfer ownership
        // Uncomment the lines below when you're ready for Checkpoint 2
        // yourToken.transfer(address(vendor), 1000 ether);
        // vendor.transferOwnership(YOUR_FRONTEND_ADDRESS);
    }
}
