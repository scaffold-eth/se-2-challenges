// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "hardhat/console.sol";
import "./ExampleExternalContract.sol";

contract Staker {
    ExampleExternalContract public exampleExternalContract;
    mapping(address => uint256) public balances;
    uint256 public threshold = 1 ether;
    uint256 public deadline = block.timestamp + 72 hours;

    bool public completed = false;

    event Stake(address indexed sender, uint256 amount);

    constructor(address exampleExternalContractAddress) {
        exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
    }

    modifier notCompleted() {
        require(!completed, "Staker: already completed");
        _;
    }

    function stake() public payable {
        require(msg.value > 0, "Staker: stake amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Stake(msg.sender, msg.value);
    }

    function execute() external notCompleted {
        require(block.timestamp >= deadline, "Staker: deadline not reached");
        if (address(this).balance >= threshold) {
            completed = true;
            exampleExternalContract.complete{value: address(this).balance}();
        }
    }

    function withdraw() external notCompleted {
        require(block.timestamp >= deadline, "Staker: deadline not reached");
        require(address(this).balance < threshold, "Staker: threshold met");
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Staker: no balance to withdraw");
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function timeLeft() external view returns (uint256) {
        if (block.timestamp >= deadline) {
            return 0;
        }
        return deadline - block.timestamp;
    }

    receive() external payable {
        stake();
    }
}
