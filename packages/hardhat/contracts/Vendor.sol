pragma solidity 0.8.4; //Do not change the solidity version as it negativly impacts submission grading
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./YourToken.sol";

contract Vendor is Ownable {
  // TODO: comment
  event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);
  // TODO: remove
  event SellTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);

  YourToken public yourToken;

  // TODO remove
  uint256 public constant tokensPerEth = 100;

  constructor(address tokenAddress) {
    yourToken = YourToken(tokenAddress);
  }

  // ToDo: create a payable buyTokens() function:
  // TODO remove
  function buyTokens() external payable {
    uint256 tokens = (msg.value * tokensPerEth);
    yourToken.transfer(msg.sender, tokens);

    emit BuyTokens(msg.sender, msg.value, tokens);
  }

  // ToDo: create a withdraw() function that lets the owner withdraw ETH
  // TODO remove
  function withdraw() external onlyOwner {
    (bool success, ) = owner().call{value: address(this).balance}("");
    require(success, "Something went wrong Withdraw");
  }

  // ToDo: create a sellTokens(uint256 _amount) function:
  function sellTokens(uint256 _amount) external {
    uint256 ethValue = (_amount / tokensPerEth);
    require(ethValue <= address(this).balance, "Inusfficient funds");

    yourToken.transferFrom(msg.sender, address(this), _amount);

    (bool success, ) = msg.sender.call{value: ethValue}("");
    require(success, "Something went wrong Sell");

    emit SellTokens(msg.sender, ethValue, _amount);
  }
}
