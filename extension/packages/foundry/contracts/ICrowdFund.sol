// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface ICrowdFund {
    function contribute() external payable;
    function withdraw() external;
    function execute() external;
    function timeLeft() external view returns (uint256);
    function balances(address) external view returns (uint256);
    function openToWithdraw() external view returns (bool);
}
