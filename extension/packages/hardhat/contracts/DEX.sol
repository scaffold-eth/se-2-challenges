// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Simple DEX contract that allows users to swap ETH for MyUSD and MyUSD for ETH
 */
contract DEX {
    /* ========== GLOBAL VARIABLES ========== */

    IERC20 token; //instantiates the imported contract
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    /* ========== EVENTS ========== */

    event Swap(address swapper, address inputToken, uint256 inputAmount, address outputToken, uint256 outputAmount);
    event PriceUpdated(uint256 price);
    /**
     * @notice Emitted when liquidity provided to DEX and mints LPTs.
     */
    event LiquidityProvided(address liquidityProvider, uint256 liquidityMinted, uint256 ethInput, uint256 tokensInput);

    /**
     * @notice Emitted when liquidity removed from DEX and decreases LPT count within DEX.
     */
    event LiquidityRemoved(
        address liquidityRemover,
        uint256 liquidityWithdrawn,
        uint256 tokensOutput,
        uint256 ethOutput
    );

    /* ========== CONSTRUCTOR ========== */

    constructor(address tokenAddr) {
        token = IERC20(tokenAddr); //specifies the token address that will hook into the interface and be used through the variable 'token'
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice initializes amount of tokens that will be transferred to the DEX itself from the erc20 contract. Loads contract up with both ETH and MyUSD.
     * @param tokens amount to be transferred to DEX
     * @return totalLiquidity is the number of LPTs minting as a result of deposits made to DEX contract
     * NOTE: since ratio is 1:1, this is fine to initialize the totalLiquidity as equal to eth balance of contract.
     */
    function init(uint256 tokens) public payable returns (uint256) {
        require(totalLiquidity == 0, "DEX: init - already has liquidity");
        totalLiquidity = address(this).balance;
        liquidity[msg.sender] = totalLiquidity;
        require(token.transferFrom(msg.sender, address(this), tokens), "DEX: init - transfer did not transact");
        emit PriceUpdated(currentPrice());
        return totalLiquidity;
    }

    /**
     * @notice returns the amount you should receive (yOutput) when given the reserves of both assets in the pool
     */
    function price(uint256 xInput, uint256 xReserves, uint256 yReserves) public pure returns (uint256 yOutput) {
        uint256 numerator = xInput * yReserves;
        uint256 denominator = (xReserves) + xInput;
        return (numerator / denominator);
    }

    /**
     * @notice returns the current price of ETH in $MyUSD
     */
    function currentPrice() public view returns (uint256 _currentPrice) {
        _currentPrice = price(1 ether, address(this).balance, token.balanceOf(address(this)));
    }

    /**
     * @notice returns the amount you need to put in (xInput) when given the amount of yOutput you want along with the reserves of both assets in the pool
     */
    function calculateXInput(
        uint256 yOutput,
        uint256 xReserves,
        uint256 yReserves
    ) public pure returns (uint256 xInput) {
        uint256 numerator = yOutput * xReserves;
        uint256 denominator = yReserves - yOutput;

        return (numerator / denominator) + 1;
    }

    /**
     * @notice sends Ether to DEX in exchange for $MyUSD
     */
    function ethToToken() internal returns (uint256 tokenOutput) {
        require(msg.value > 0, "cannot swap 0 ETH");
        uint256 ethReserve = address(this).balance - msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));
        tokenOutput = price(msg.value, ethReserve, tokenReserve);

        require(token.transfer(msg.sender, tokenOutput), "ethToToken(): reverted swap.");
        emit Swap(msg.sender, address(0), msg.value, address(token), tokenOutput);
        return tokenOutput;
    }

    /**
     * @notice sends $MyUSD tokens to DEX in exchange for Ether
     */
    function tokenToEth(uint256 tokenInput) internal returns (uint256 ethOutput) {
        require(tokenInput > 0, "cannot swap 0 tokens");
        require(token.balanceOf(msg.sender) >= tokenInput, "insufficient token balance");
        require(token.allowance(msg.sender, address(this)) >= tokenInput, "insufficient allowance");
        uint256 tokenReserve = token.balanceOf(address(this));
        ethOutput = price(tokenInput, tokenReserve, address(this).balance);
        require(token.transferFrom(msg.sender, address(this), tokenInput), "tokenToEth(): reverted swap.");
        (bool sent, ) = msg.sender.call{ value: ethOutput }("");
        require(sent, "tokenToEth: revert in transferring eth to you!");
        emit Swap(msg.sender, address(token), tokenInput, address(0), ethOutput);
        return ethOutput;
    }

    /**
     * @notice allows users to swap ETH for $MyUSD or $MyUSD for ETH with a single method
     */
    function swap(uint256 inputAmount) public payable returns (uint256 outputAmount) {
        if (msg.value > 0 && inputAmount == msg.value) {
            outputAmount = ethToToken();
        } else {
            outputAmount = tokenToEth(inputAmount);
        }
        emit PriceUpdated(currentPrice());
    }

    /**
     * @notice allows deposits of $MyUSD and $ETH to liquidity pool
     * NOTE: parameter is the msg.value sent with this function call. That amount is used to determine the amount of $MyUSD needed as well and taken from the depositor.
     * NOTE: user has to make sure to give DEX approval to spend their tokens on their behalf by calling approve function prior to this function call.
     * NOTE: Equal parts of both assets will be removed from the user's wallet with respect to the price outlined by the AMM.
     */
    function deposit() public payable returns (uint256 tokensDeposited) {
        require(msg.value > 0, "Must send value when depositing");
        uint256 ethReserve = address(this).balance - msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 tokenDeposit;

        tokenDeposit = ((msg.value * tokenReserve) / ethReserve) + 1;

        require(token.balanceOf(msg.sender) >= tokenDeposit, "insufficient token balance");
        require(token.allowance(msg.sender, address(this)) >= tokenDeposit, "insufficient allowance");

        uint256 liquidityMinted = (msg.value * totalLiquidity) / ethReserve;
        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;

        require(token.transferFrom(msg.sender, address(this), tokenDeposit));
        emit LiquidityProvided(msg.sender, liquidityMinted, msg.value, tokenDeposit);
        return tokenDeposit;
    }

    /**
     * @notice allows withdrawal of $MyUSD and $ETH from liquidity pool
     * NOTE: with this current code, the msg caller could end up getting very little back if the liquidity is super low in the pool. I guess they could see that with the UI.
     */
    function withdraw(uint256 amount) public returns (uint256 ethAmount, uint256 tokenAmount) {
        require(liquidity[msg.sender] >= amount, "withdraw: sender does not have enough liquidity to withdraw.");
        uint256 ethReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 ethWithdrawn;

        ethWithdrawn = (amount * ethReserve) / totalLiquidity;

        tokenAmount = (amount * tokenReserve) / totalLiquidity;
        liquidity[msg.sender] -= amount;
        totalLiquidity -= amount;
        (bool sent, ) = payable(msg.sender).call{ value: ethWithdrawn }("");
        require(sent, "withdraw(): revert in transferring eth to you!");
        require(token.transfer(msg.sender, tokenAmount));
        emit LiquidityRemoved(msg.sender, amount, tokenAmount, ethWithdrawn);
        return (ethWithdrawn, tokenAmount);
    }
}
