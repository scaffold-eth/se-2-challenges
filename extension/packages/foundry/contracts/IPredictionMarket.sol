// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IPredictionMarket {
    /////////////////
    /// Errors //////
    /////////////////

    error PredictionMarket__MustProvideETHForInitialLiquidity();
    error PredictionMarket__InvalidProbability();
    error PredictionMarket__PredictionAlreadyReported();
    error PredictionMarket__OnlyOracleCanReport();
    error PredictionMarket__OwnerCannotCall();
    error PredictionMarket__PredictionNotReported();
    error PredictionMarket__InsufficientWinningTokens();
    error PredictionMarket__AmountMustBeGreaterThanZero();
    error PredictionMarket__MustSendExactETHAmount();
    error PredictionMarket__InsufficientTokenReserve(Outcome _outcome, uint256 _amountToken);
    error PredictionMarket__TokenTransferFailed();
    error PredictionMarket__ETHTransferFailed();
    error PredictionMarket__InsufficientBalance(uint256 _tradingAmount, uint256 _userBalance);
    error PredictionMarket__InsufficientAllowance(uint256 _tradingAmount, uint256 _allowance);
    error PredictionMarket__InsufficientLiquidity();
    error PredictionMarket__InvalidPercentageToLock();

    //////////////////////////
    /// Enums ////////////////
    //////////////////////////

    enum Outcome {
        YES,
        NO
    }

    /////////////////////////
    /// Events //////////////
    /////////////////////////

    event TokensPurchased(address indexed buyer, Outcome outcome, uint256 amount, uint256 ethAmount);
    event TokensSold(address indexed seller, Outcome outcome, uint256 amount, uint256 ethAmount);
    event WinningTokensRedeemed(address indexed redeemer, uint256 amount, uint256 ethAmount);
    event MarketReported(address indexed oracle, Outcome winningOutcome, address winningToken);
    event MarketResolved(address indexed resolver, uint256 totalEthToSend);
    event LiquidityAdded(address indexed provider, uint256 ethAmount, uint256 tokensAmount);
    event LiquidityRemoved(address indexed provider, uint256 ethAmount, uint256 tokensAmount);

    /////////////////////////
    /// Functions ///////////
    /////////////////////////

    function addLiquidity() external payable;
    function removeLiquidity(uint256 _ethToWithdraw) external;
    function report(Outcome _winningOutcome) external;
    function resolveMarketAndWithdraw() external returns (uint256 ethRedeemed);
    function buyTokensWithETH(Outcome _outcome, uint256 _amountTokenToBuy) external payable;
    function sellTokensForEth(Outcome _outcome, uint256 _tradingAmount) external;
    function redeemWinningTokens(uint256 _amount) external;
    function getBuyPriceInEth(Outcome _outcome, uint256 _tradingAmount) external view returns (uint256);
    function getSellPriceInEth(Outcome _outcome, uint256 _tradingAmount) external view returns (uint256);

    function getPrediction()
        external
        view
        returns (
            string memory question,
            string memory outcome1,
            string memory outcome2,
            address oracle,
            uint256 initialTokenValue,
            uint256 yesTokenReserve,
            uint256 noTokenReserve,
            bool isReported,
            address yesToken,
            address noToken,
            address winningToken,
            uint256 ethCollateral,
            uint256 lpTradingRevenue,
            address predictionMarketOwner,
            uint256 initialProbability,
            uint256 percentageLocked
        );

    /////////////////////////
    /// Getters /////////////
    /////////////////////////

    function i_oracle() external view returns (address);
    function i_initialTokenValue() external view returns (uint256);
    function i_percentageLocked() external view returns (uint8);
    function i_initialYesProbability() external view returns (uint8);
    function i_yesToken() external view returns (address);
    function i_noToken() external view returns (address);
    function s_question() external view returns (string memory);
    function s_ethCollateral() external view returns (uint256);
    function s_lpTradingRevenue() external view returns (uint256);
    function s_winningToken() external view returns (address);
    function s_isReported() external view returns (bool);
}
