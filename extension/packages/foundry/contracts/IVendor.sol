// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IVendor {
    error InvalidEthAmount();
    error InsufficientVendorTokenBalance(uint256 available, uint256 required);
    error InvalidTokenAmount();
    error InsufficientVendorEthBalance(uint256 available, uint256 required);
    error EthTransferFailed(address to, uint256 amount);

    event BuyTokens(address indexed buyer, uint256 amountOfETH, uint256 amountOfTokens);
    event SellTokens(address indexed seller, uint256 amountOfTokens, uint256 amountOfETH);

    function tokensPerEth() external view returns (uint256);
    function owner() external view returns (address);
    function buyTokens() external payable;
    function withdraw() external;
    function sellTokens(uint256 amount) external;
}
