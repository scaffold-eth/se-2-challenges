// SPDX-License-Identifier: MIT
pragma solidity 0.8.20; // Do not change the solidity version as it negatively impacts submission grading

import "hardhat/console.sol";
import "./FundingRecipient.sol";

contract CrowdFund {
    FundingRecipient public fundingRecipient;

    constructor(address fundingRecipientAddress) {
        fundingRecipient = FundingRecipient(fundingRecipientAddress);
    }

    // Collect funds in a payable `contribute()` function and track individual `balances` with a mapping:
    // (Make sure to add a `Contribution(address,uint256)` event and emit it for the frontend Contributions tab to display)

    // After some `deadline` allow anyone to call an `execute()` function
    // If the deadline has passed and the threshold is met, it should call:
    // fundingRecipient.complete{value: address(this).balance}()

    // If the `threshold` was not met, allow everyone to call a `withdraw()` function to withdraw their balance

    // Add a `timeLeft()` view function that returns the time left before the deadline for the frontend

    // Add the `receive()` special function that receives ETH and calls contribute()
}
