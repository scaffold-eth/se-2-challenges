//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/YourToken.sol";
import "../contracts/Vendor.sol";
import "./DeployHelpers.s.sol";

contract DeployYourToken is ScaffoldETHDeploy {
    /**
     * Student TODO:
     * - Put the address you're using in the frontend here (leave address(0) to default to the deployer)
     */
    address constant FRONTEND_ADDRESS = address(0);

    /**
     * Mode switch:
     * - If true: deploy Vendor and seed it with the token balance
     * - If false: send tokens to your frontend address (or deployer if unset)
     */
    bool constant SEND_TOKENS_TO_VENDOR = false; // Don't switch until Checkpoint 2!

    function run() external ScaffoldEthDeployerRunner {
        YourToken yourToken = new YourToken();
        console.logString(string.concat("YourToken deployed at: ", vm.toString(address(yourToken))));

        address recipient = FRONTEND_ADDRESS != address(0) ? FRONTEND_ADDRESS : msg.sender;

        if (!SEND_TOKENS_TO_VENDOR) {
            // Send the entire initial supply to the wallet you use in the UI.
            // If FRONTEND_ADDRESS is address(0), this defaults to the deployer (no-op transfer).
            if (recipient != msg.sender) {
                yourToken.transfer(recipient, 1000 ether);
            }
            return;
        }

        // Deploy Vendor and seed it with tokens
        Vendor vendor = new Vendor(address(yourToken));
        console.logString(string.concat("Vendor deployed at: ", vm.toString(address(vendor))));

        yourToken.transfer(address(vendor), 1000 ether);

        // Make the UI wallet the owner (for withdraw(), etc). Defaults to deployer if unset.
        vendor.transferOwnership(recipient);
    }
}
