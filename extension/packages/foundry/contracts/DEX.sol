// SPDX-License-Identifier: MIT
pragma solidity 0.8.20; //Do not change the solidity version as it negatively impacts submission grading

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DEX {
    /////////////////
    /// Errors //////
    /////////////////

    // Errors go here

    //////////////////////
    /// State Variables //
    //////////////////////

    IERC20 public immutable token;

    ////////////////
    /// Events /////
    ////////////////

    // Events go here...

    ///////////////////
    /// Constructor ///
    ///////////////////

    constructor(address tokenAddr) {
        token = IERC20(tokenAddr);
    }

    ///////////////////
    /// Functions /////
    ///////////////////

    function init(uint256 tokens) public payable returns (uint256 initialLiquidity) {
        // Your code here...
    }

    function price(uint256 xInput, uint256 xReserves, uint256 yReserves) public pure returns (uint256 yOutput) {
        // Your code here...
    }

    function getLiquidity(address lp) public view returns (uint256 lpLiquidity) {
        // Your code here...
    }

    function ethToToken() public payable returns (uint256 tokenOutput) {
        // Your code here...
    }

    function tokenToEth(uint256 tokenInput) public returns (uint256 ethOutput) {
        // Your code here...
    }

    function deposit() public payable returns (uint256 tokensDeposited) {
        // Your code here...
    }

    function withdraw(uint256 amount) public returns (uint256 ethAmount, uint256 tokenAmount) {
        // Your code here...
    }
}
