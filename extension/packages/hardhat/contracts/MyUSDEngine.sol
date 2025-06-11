// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./MyUSD.sol";
import "./Oracle.sol";
import "./MyUSDStaking.sol";

error Engine__InvalidAmount();
error Engine__UnsafePositionRatio();
error Engine__NotLiquidatable();
error Engine__InvalidBorrowRate();
error Engine__NotRateController();
error Engine__InsufficientCollateral();
error Engine__TransferFailed();

contract MyUSDEngine is Ownable {
    uint256 private constant COLLATERAL_RATIO = 150; // 150% collateralization required
    uint256 private constant LIQUIDATOR_REWARD = 10; // 10% reward for liquidators
    uint256 private constant SECONDS_PER_YEAR = 365 days; // adjust later
    uint256 private constant PRECISION = 1e18;

    MyUSD private i_myUSD;
    Oracle private i_oracle;
    MyUSDStaking private i_staking;
    address private i_rateController;

    uint256 public borrowRate; // Annual interest rate for borrowers in basis points (1% = 100)

    // Total debt shares in the pool
    uint256 public totalDebtShares;

    // Exchange rate between debt shares and MyUSD (1e18 precision)
    uint256 public debtExchangeRate;
    uint256 public lastUpdateTime;

    mapping(address => uint256) public s_userCollateral;
    mapping(address => uint256) public s_userDebtShares;

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

    modifier onlyRateController() {
        if (msg.sender != i_rateController) revert Engine__NotRateController();
        _;
    }

    constructor(
        address _oracle,
        address _myUSDAddress,
        address _stakingAddress,
        address _rateController
    ) Ownable(msg.sender) {
        i_oracle = Oracle(_oracle);
        i_myUSD = MyUSD(_myUSDAddress);
        i_staking = MyUSDStaking(_stakingAddress);
        i_rateController = _rateController;
        lastUpdateTime = block.timestamp;
        debtExchangeRate = PRECISION; // 1:1 initially
    }

    // Checkpoint 2: Depositing Collateral & Understanding Value
    function addCollateral() public payable {
        if (msg.value == 0) {
            revert Engine__InvalidAmount(); // Revert if no collateral is sent
        }

        s_userCollateral[msg.sender] += msg.value; // Update user's collateral balance
        emit CollateralAdded(msg.sender, msg.value, i_oracle.getETHMyUSDPrice()); // Emit event for collateral addition
    }

    function calculateCollateralValue(address user) public view returns (uint256) {
        uint256 collateralAmount = s_userCollateral[user]; // Get user's collateral amount
        return (collateralAmount * i_oracle.getETHMyUSDPrice()) / 1e18; // Calculate collateral value in terms of ETH price
    }

    // Checkpoint 3: Interest Calculation System
    function _getCurrentExchangeRate() internal view returns (uint256) {
        if (totalDebtShares == 0) return debtExchangeRate;
        
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        if (timeElapsed == 0 || borrowRate == 0) return debtExchangeRate;
        
        uint256 totalDebtValue = (totalDebtShares * debtExchangeRate) / PRECISION;
        uint256 interest = (totalDebtValue * borrowRate * timeElapsed) / (SECONDS_PER_YEAR * 10000);
        
        return debtExchangeRate + (interest * PRECISION) / totalDebtShares;
    }

    function _accrueInterest() internal {
        if (totalDebtShares == 0) {
            lastUpdateTime = block.timestamp;
            return;
        }
        
        debtExchangeRate = _getCurrentExchangeRate();
        lastUpdateTime = block.timestamp;
    }

    function _getMyUSDToShares(uint256 amount) internal view returns (uint256) {
        uint256 currentExchangeRate = _getCurrentExchangeRate();
        return (amount * PRECISION) / currentExchangeRate;
    }

    // Checkpoint 4: Minting MyUSD & Position Health
    function getCurrentDebtValue(address user) public view returns (uint256) {
        if (s_userDebtShares[user] == 0) return 0;
        uint256 currentExchangeRate = _getCurrentExchangeRate();
        return ((s_userDebtShares[user] * currentExchangeRate) / PRECISION);
    }

    function calculatePositionRatio(address user) public view returns (uint256) {
        uint256 mintedAmount = getCurrentDebtValue(user);
        uint256 collateralValue = calculateCollateralValue(user);
        if (mintedAmount == 0) return type(uint256).max;
        return (collateralValue * PRECISION) / mintedAmount;
    }

    function _validatePosition(address user) internal view {
        uint256 positionRatio = calculatePositionRatio(user);
        if ((positionRatio * 100) < COLLATERAL_RATIO * PRECISION) {
            revert Engine__UnsafePositionRatio();
        }
    }

    function mintMyUSD(uint256 mintAmount) public {
        if (mintAmount == 0) {
            revert Engine__InvalidAmount(); // Revert if mint amount is zero
        }

        // Calculate debt shares based on current exchange rate
        uint256 debtShares = _getMyUSDToShares(mintAmount);

        // Update user's debt shares and total debt shares
        s_userDebtShares[msg.sender] += debtShares;
        totalDebtShares += debtShares;

        _validatePosition(msg.sender);
        i_myUSD.mintTo(msg.sender, mintAmount);

        emit DebtSharesMinted(msg.sender, mintAmount, debtShares);
    }

    // Checkpoint 5: Accruing Interest & Managing Borrow Rates
    function setBorrowRate(uint256 newRate) external onlyRateController {
        if (newRate < i_staking.savingsRate()) revert Engine__InvalidBorrowRate();
        _accrueInterest();
        borrowRate = newRate;
        emit BorrowRateUpdated(newRate);
    }

    // Checkpoint 6: Repaying Debt & Withdrawing Collateral
    function repayUpTo(uint256 amount) public {
        uint256 amountInShares = _getMyUSDToShares(amount);
        // Check if user has enough debt
        if (amountInShares > s_userDebtShares[msg.sender]) {
            // will only use the max amount of MyUSD that can be repaid
            amountInShares = s_userDebtShares[msg.sender];
            amount = getCurrentDebtValue(msg.sender);
        }

        // Check balance
        if (amount == 0 || i_myUSD.balanceOf(msg.sender) < amount) {
            revert MyUSD__InsufficientBalance();
        }

        // Check allowance
        if (i_myUSD.allowance(msg.sender, address(this)) < amount) {
            revert MyUSD__InsufficientAllowance();
        }

        // Update user's debt shares and total debt shares
        s_userDebtShares[msg.sender] -= amountInShares;
        totalDebtShares -= amountInShares;

        i_myUSD.burnFrom(msg.sender, amount);

        emit DebtSharesBurned(msg.sender, amount, amountInShares);
    }

    function withdrawCollateral(uint256 amount) external {
        if (amount == 0) revert Engine__InvalidAmount();
        if (s_userCollateral[msg.sender] < amount) revert Engine__InsufficientCollateral();
        
        // Temporarily reduce the user's collateral to check if they remain safe
        uint256 newCollateral = s_userCollateral[msg.sender] - amount;
        s_userCollateral[msg.sender] = newCollateral;

        // Validate the user's position after withdrawal
        if (s_userDebtShares[msg.sender] > 0) {
            _validatePosition(msg.sender);
        }

        // Transfer the collateral to the user
        payable(msg.sender).transfer(amount);

        emit CollateralWithdrawn(msg.sender, amount, i_oracle.getETHMyUSDPrice()); // Emit event for collateral withdrawal
    }

    // Checkpoint 7: Liquidation - Enforcing System Stability
    function isLiquidatable(address user) public view returns (bool) {
        uint256 positionRatio = calculatePositionRatio(user);
        return (positionRatio * 100) < COLLATERAL_RATIO * PRECISION;
    }

    function liquidate(address user) external {
        if (!isLiquidatable(user)) {
            revert Engine__NotLiquidatable(); // Revert if position is not liquidatable
        }

        // Calculate current debt value including accrued interest
        uint256 userDebtValue = getCurrentDebtValue(user);
        uint256 userCollateral = s_userCollateral[user]; // Get user's collateral balance
        uint256 collateralValue = calculateCollateralValue(user); // Calculate user's collateral value

        // check that liquidator has enough funds to pay back the debt
        if (i_myUSD.balanceOf(msg.sender) < userDebtValue) {
            revert MyUSD__InsufficientBalance();
        }

        // check that liquidator has approved the engine to transfer the debt
        if (i_myUSD.allowance(msg.sender, address(this)) < userDebtValue) {
            revert MyUSD__InsufficientAllowance();
        }

        // burn the stablecoins
        i_myUSD.burnFrom(msg.sender, userDebtValue);

        // Clear user's debt shares
        totalDebtShares -= s_userDebtShares[user];
        s_userDebtShares[user] = 0;

        // calculate collateral to purchase (maintain the ratio of debt to collateral value)
        uint256 collateralPurchased = (userDebtValue * userCollateral) / collateralValue;
        uint256 liquidatorReward = (collateralPurchased * LIQUIDATOR_REWARD) / 100;
        uint256 amountForLiquidator = collateralPurchased + liquidatorReward;
        amountForLiquidator = amountForLiquidator > userCollateral ? userCollateral : amountForLiquidator; // Ensure we don't exceed user's collateral

        s_userCollateral[user] = userCollateral - amountForLiquidator;

        // transfer 110% of the debt to the liquidator
        (bool sent, ) = payable(msg.sender).call{ value: amountForLiquidator }("");
        if (!sent) revert Engine__TransferFailed();

        emit Liquidation(user, msg.sender, amountForLiquidator, userDebtValue, i_oracle.getETHMyUSDPrice());
    }
}
