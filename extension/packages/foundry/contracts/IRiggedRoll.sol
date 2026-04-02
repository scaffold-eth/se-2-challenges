// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IDiceGame } from "./IDiceGame.sol";

interface IRiggedRoll {
    error NotEnoughETH(uint256 required, uint256 available);
    error NotWinningRoll(uint256 roll);
    error InsufficientBalance(uint256 requested, uint256 available);

    function diceGame() external view returns (IDiceGame);
    function riggedRoll() external;
    function withdraw(address _addr, uint256 _amount) external;
}
