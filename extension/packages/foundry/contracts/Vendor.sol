pragma solidity 0.8.20; //Do not change the solidity version as it negatively impacts submission grading
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./YourToken.sol";

contract Vendor is Ownable {
    /////////////////
    /// Errors //////
    /////////////////

    // Errors go here...

    //////////////////////
    /// State Variables //
    //////////////////////

    YourToken public immutable yourToken;

    ////////////////
    /// Events /////
    ////////////////

    // Events go here...

    ///////////////////
    /// Constructor ///
    ///////////////////

    constructor(address tokenAddress) Ownable(msg.sender) {
        yourToken = YourToken(tokenAddress);
    }

    ///////////////////
    /// Functions /////
    ///////////////////

    function buyTokens() external payable {

    }

    function withdraw() public onlyOwner {

    }

    function sellTokens(uint256 amount) public {

    }
}
