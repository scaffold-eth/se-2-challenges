pragma solidity 0.8.20; //Do not change the solidity version as it negatively impacts submission grading
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DEX
 * @author
 * @notice Minimal AMM (ETH <-> ERC20) challenge scaffold.
 * @dev This file is intentionally scaffolded like other Speedrun Ethereum challenges:
 * - Sections for Errors / State Variables / Events / Constructor / Functions
 * - Function signatures must stay consistent with the frontend and tests
 * - Implement each checkpoint by filling in the function bodies and adding custom errors/events as instructed in README.md
 */
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

    /**
     * @notice Initializes the pool with ETH + token liquidity.
     * @dev Checkpoint 2
     * - Should only work once
     * - Should mint LP tokens equal to the ETH deposited (msg.value)
     * - Should pull `tokens` from msg.sender via transferFrom (requires prior approve)
     * - Prefer custom errors over require strings (see README)
     */
    function init(uint256 tokens) public payable returns (uint256 initialLiquidity) {
        // Your code here...
    }

    /**
     * @notice Calculates yOutput for a given xInput and reserves.
     * @dev Checkpoint 3
     * - Must be pure
     * - Must include a 0.3% fee (997 / 1000)
     */
    function price(uint256 xInput, uint256 xReserves, uint256 yReserves) public pure returns (uint256 yOutput) {
        // Your code here...
    }

    /**
     * @notice Returns LP token balance for a user.
     * @dev Checkpoint 2
     * NOTE: Mapping is public, but the frontend + tests use this helper.
     */
    function getLiquidity(address lp) public view returns (uint256 lpLiquidity) {
        // Your code here...
    }

    /**
     * @notice Swaps ETH for tokens using the AMM curve.
     * @dev Checkpoint 4
     * - Revert on 0 ETH input
     * - Use `ethReserve = address(this).balance - msg.value`
     * - Emit EthToTokenSwap(swapper, tokenOutput, ethInput)
     */
    function ethToToken() public payable returns (uint256 tokenOutput) {
        // Your code here...
    }

    /**
     * @notice Swaps tokens for ETH using the AMM curve.
     * @dev Checkpoint 4
     * - Revert on 0 token input
     * - Check balance + allowance
     * - Transfer tokens in via transferFrom, then send ETH out via call
     * - Emit TokenToEthSwap(swapper, tokensInput, ethOutput)
     */
    function tokenToEth(uint256 tokenInput) public returns (uint256 ethOutput) {
        // Your code here...
    }

    /**
     * @notice Adds liquidity at the current pool ratio.
     * @dev Checkpoint 5
     * - Revert on 0 ETH input
     * - Compute tokenDeposit and liquidityMinted (see README)
     * - Update liquidity[msg.sender] and totalLiquidity
     * - Pull tokens via transferFrom
     * - Emit LiquidityProvided(liquidityProvider, liquidityMinted, ethInput, tokensInput)
     */
    function deposit() public payable returns (uint256 tokensDeposited) {
        // Your code here...
    }

    /**
     * @notice Removes liquidity and returns proportional ETH + tokens.
     * @dev Checkpoint 5
     * - Revert if msg.sender doesn't have enough LP tokens
     * - Burn LP tokens (update liquidity + totalLiquidity)
     * - Send ETH via call and tokens via transfer
     * - Emit LiquidityRemoved(liquidityRemover, liquidityWithdrawn, tokensOutput, ethOutput)
     */
    function withdraw(uint256 amount) public returns (uint256 ethAmount, uint256 tokenAmount) {
        // Your code here...
    }
}

