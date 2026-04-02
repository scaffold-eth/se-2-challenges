// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMyUSDEngine {
    // Errors
    error Engine__InvalidAmount();
    error Engine__UnsafePositionRatio();
    error Engine__NotLiquidatable();
    error Engine__InvalidBorrowRate();
    error Engine__NotRateController();
    error Engine__InsufficientCollateral();
    error Engine__TransferFailed();

    // Events
    event CollateralAdded(address indexed user, uint256 indexed amount, uint256 price);
    event CollateralWithdrawn(address indexed withdrawer, uint256 indexed amount, uint256 price);
    event BorrowRateUpdated(uint256 newRate);
    event DebtSharesMinted(address indexed user, uint256 amount, uint256 shares);
    event DebtSharesBurned(address indexed user, uint256 amount, uint256 shares);
    event Liquidation(
        address indexed user,
        address indexed liquidator,
        uint256 amountForLiquidator,
        uint256 liquidatedUserDebt,
        uint256 price
    );

    // State variable getters
    function borrowRate() external view returns (uint256);
    function totalDebtShares() external view returns (uint256);
    function debtExchangeRate() external view returns (uint256);
    function lastUpdateTime() external view returns (uint256);
    function s_userCollateral(address user) external view returns (uint256);
    function s_userDebtShares(address user) external view returns (uint256);

    // Functions
    function addCollateral() external payable;
    function calculateCollateralValue(address user) external view returns (uint256);
    function getCurrentDebtValue(address user) external view returns (uint256);
    function calculatePositionRatio(address user) external view returns (uint256);
    function mintMyUSD(uint256 mintAmount) external;
    function setBorrowRate(uint256 newRate) external;
    function repayUpTo(uint256 amount) external;
    function withdrawCollateral(uint256 amount) external;
    function isLiquidatable(address user) external view returns (bool);
    function liquidate(address user) external;
}
