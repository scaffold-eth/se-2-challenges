// SPDX-License-Identifier: MIT
pragma solidity 0.8.20; // Do not change the solidity version as it negatively impacts submission grading

contract FundingRecipient {
    bool public completed;

    function complete() public payable {
        completed = true;
    }
}
