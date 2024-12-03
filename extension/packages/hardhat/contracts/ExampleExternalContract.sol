// SPDX-License-Identifier: MIT
pragma solidity 0.8.20; //Do not change the solidity version as it negativly impacts submission grading

contract ExampleExternalContract {
    bool public completed;

    function complete() public payable {
        completed = true;
    }
}
