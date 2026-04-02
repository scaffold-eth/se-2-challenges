// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILending {
    // Errors
    error Lending__InvalidAmount();
    error Lending__TransferFailed();
    error Lending__UnsafePositionRatio();
    error Lending__BorrowingFailed();
    error Lending__RepayingFailed();
    error Lending__PositionSafe();
    error Lending__NotLiquidatable();
    error Lending__InsufficientLiquidatorCorn();

    // Events
    event CollateralAdded(address indexed user, uint256 indexed amount, uint256 price);
    event CollateralWithdrawn(address indexed user, uint256 indexed amount, uint256 price);
    event AssetBorrowed(address indexed user, uint256 indexed amount, uint256 price);
    event AssetRepaid(address indexed user, uint256 indexed amount, uint256 price);
    event Liquidation(
        address indexed user,
        address indexed liquidator,
        uint256 amountForLiquidator,
        uint256 liquidatedUserDebt,
        uint256 price
    );

    // Functions
    function addCollateral() external payable;
    function withdrawCollateral(uint256 amount) external;
    function calculateCollateralValue(address user) external view returns (uint256);
    function isLiquidatable(address user) external view returns (bool);
    function borrowCorn(uint256 borrowAmount) external;
    function repayCorn(uint256 repayAmount) external;
    function liquidate(address user) external;
    function s_userCollateral(address user) external view returns (uint256);
    function s_userBorrowed(address user) external view returns (uint256);
}
