pragma solidity >=0.8.0 <0.9.0; //Do not change the solidity version as it negatively impacts submission grading
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";

contract DiceGame {
  uint256 public nonce = 0;
  uint256 public prize = 0;

  error NotEnoughEther();

  event Roll(address indexed player, uint256 amount, uint256 roll);
  event Winner(address winner, uint256 amount);

  constructor() payable {
    resetPrize();
  }

  function resetPrize() private {
    prize = ((address(this).balance * 10) / 100);
  }

  function rollTheDice() public payable {
    if (msg.value < 0.002 ether) {
      revert NotEnoughEther();
    }

    bytes32 prevHash = blockhash(block.number - 1);
    bytes32 hash = keccak256(abi.encodePacked(prevHash, address(this), nonce));
    uint256 roll = uint256(hash) % 16;

    console.log("\t", "   Dice Game Roll:", roll);

    nonce++;
    prize += ((msg.value * 40) / 100);

    emit Roll(msg.sender, msg.value, roll);

    if (roll > 5) {
      return;
    }

    uint256 amount = prize;
    (bool sent, ) = msg.sender.call{value: amount}("");
    require(sent, "Failed to send Ether");

    resetPrize();
    emit Winner(msg.sender, amount);
  }

  receive() external payable {}
}
