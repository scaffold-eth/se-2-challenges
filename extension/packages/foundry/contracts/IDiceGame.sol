// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IDiceGame {
    error NotEnoughEther();

    event Roll(address indexed player, uint256 amount, uint256 roll);
    event Winner(address winner, uint256 amount);

    function nonce() external view returns (uint256);
    function prize() external view returns (uint256);
    function rollTheDice() external payable;
}
