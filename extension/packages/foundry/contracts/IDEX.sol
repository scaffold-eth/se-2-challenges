// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDEX {
    /////////////////
    /// Errors //////
    /////////////////

    error DexAlreadyInitialized();
    error InvalidEthAmount();
    error InvalidTokenAmount();
    error InsufficientLiquidity(uint256 available, uint256 required);

    ////////////////
    /// Events /////
    ////////////////

    event EthToTokenSwap(address swapper, uint256 ethInput, uint256 tokenOutput);
    event TokenToEthSwap(address swapper, uint256 tokenInput, uint256 ethOutput);
    event LiquidityProvided(address provider, uint256 liquidityMinted, uint256 ethDeposited, uint256 tokensDeposited);
    event LiquidityRemoved(address provider, uint256 liquidityRemoved, uint256 ethWithdrawn, uint256 tokensWithdrawn);

    ///////////////////
    /// Functions /////
    ///////////////////

    function token() external view returns (IERC20);
    function totalLiquidity() external view returns (uint256);
    function init(uint256 tokens) external payable returns (uint256 initialLiquidity);
    function price(uint256 xInput, uint256 xReserves, uint256 yReserves) external pure returns (uint256 yOutput);
    function getLiquidity(address lp) external view returns (uint256 lpLiquidity);
    function ethToToken() external payable returns (uint256 tokenOutput);
    function tokenToEth(uint256 tokenInput) external returns (uint256 ethOutput);
    function deposit() external payable returns (uint256 tokensDeposited);
    function withdraw(uint256 amount) external returns (uint256 ethAmount, uint256 tokenAmount);
}
