// SPDX-License-Identifier: MIT
pragma solidity 0.8.20; // Do not change the solidity version as it negatively impacts submission grading

import "./FundingRecipient.sol";

contract CrowdFund {
    /////////////////
    /// Errors //////
    /////////////////

    // Errors go here...

    //////////////////////
    /// State Variables //
    //////////////////////

    FundingRecipient public fundingRecipient;

    ////////////////
    /// Events /////
    ////////////////

    // Events go here...

    ///////////////////
    /// Modifiers /////
    ///////////////////

    modifier notCompleted() {
        _;
    }

    ///////////////////
    /// Constructor ///
    ///////////////////

    constructor(address fundingRecipientAddress) {
        fundingRecipient = FundingRecipient(fundingRecipientAddress);
    }

    ///////////////////
    /// Functions /////
    ///////////////////

    function contribute() public payable {

    }

    function withdraw() public {

    }

    function execute() public {

    }

    receive() external payable {

    }

    ////////////////////////
    /// View Functions /////
    ////////////////////////

    function timeLeft() public view returns (uint256) {
        return 0;
    }
}
