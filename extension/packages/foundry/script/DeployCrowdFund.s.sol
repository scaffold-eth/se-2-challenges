//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/FundingRecipient.sol";
import "../contracts/CrowdFund.sol";
import "./DeployHelpers.s.sol";

contract DeployCrowdFund is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        FundingRecipient fundingRecipient = new FundingRecipient();
        console.logString(string.concat("FundingRecipient deployed at: ", vm.toString(address(fundingRecipient))));

        CrowdFund crowdFund = new CrowdFund(address(fundingRecipient));
        console.logString(string.concat("CrowdFund deployed at: ", vm.toString(address(crowdFund))));
    }
}
