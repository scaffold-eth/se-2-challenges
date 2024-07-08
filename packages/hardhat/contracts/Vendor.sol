pragma solidity 0.8.4; //Do not change the solidity version as it negativly impacts submission grading
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./YourToken.sol";

contract Vendor is Ownable {
  event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);
  event SellTokens(address seller, uint256 amountOfTokens, uint256 amountOfETH);

  YourToken public yourToken;

  uint public constant tokensPerEth = 100;

  constructor(address tokenAddress) {
    yourToken = YourToken(tokenAddress);
  }

  // ToDo: create a payable buyTokens() function:
  function buyTokens() public payable {
    require(msg.value > 0, "You need to send some Ether");
    uint256 amountOfTokens = msg.value * tokensPerEth;
    yourToken.transfer(msg.sender, amountOfTokens);
    emit BuyTokens(msg.sender, msg.value, amountOfTokens);
  }

  // ToDo: create a withdraw() function that lets the owner withdraw ETH
  function withdraw() public onlyOwner {
    (bool success, ) = owner().call{value: address(this).balance}("");
    require(success, "Withdraw failed");
  }
  
  // ToDo: create a sellTokens(uint256 _amount) function:
  function sellTokens(uint _amount) public {
    require(yourToken.balanceOf(msg.sender) >= _amount, "You don't have enough tokens");
    uint256 amountOfEth = _amount / tokensPerEth;
    yourToken.transferFrom(msg.sender, address(this), _amount);
    (bool success, ) = msg.sender.call{value: amountOfEth}("");
    require(success, "Sell failed");
    emit SellTokens(msg.sender, _amount, amountOfEth);
  }
}
