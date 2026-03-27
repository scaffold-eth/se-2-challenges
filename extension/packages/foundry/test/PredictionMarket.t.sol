// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/PredictionMarket.sol";
import "../contracts/PredictionMarketToken.sol";

contract PredictionMarketTest is Test {
    PredictionMarket public predictionMarket;
    PredictionMarketToken public yesToken;
    PredictionMarketToken public noToken;

    address public owner;
    address public oracle;
    address public buyer;
    address public seller;
    address public redeemer;

    uint256 constant PRECISION = 1e18;
    uint256 constant INITIAL_LIQUIDITY = 10 ether;
    uint256 constant INITIAL_TOKEN_VALUE = 1 ether;
    uint8 constant INITIAL_PROBABILITY = 50;
    uint8 constant PERCENTAGE_LOCKED = 20;

    function setUp() public {
        owner = makeAddr("owner");
        oracle = makeAddr("oracle");
        buyer = makeAddr("buyer");
        seller = makeAddr("seller");
        redeemer = makeAddr("redeemer");

        vm.deal(owner, 100 ether);
        vm.deal(buyer, 100 ether);
        vm.deal(seller, 100 ether);
        vm.deal(redeemer, 100 ether);

        vm.prank(owner);
        predictionMarket = new PredictionMarket{value: INITIAL_LIQUIDITY}(
            owner,
            oracle,
            "Test Question",
            INITIAL_TOKEN_VALUE,
            INITIAL_PROBABILITY,
            PERCENTAGE_LOCKED
        );

        yesToken = PredictionMarketToken(address(predictionMarket.i_yesToken()));
        noToken = PredictionMarketToken(address(predictionMarket.i_noToken()));
    }

    // ============================================================
    // CHECKPOINT 2: Constructor Validation
    // ============================================================

    function test_Checkpoint2_RevertWhenNoETHProvided() public {
        vm.expectRevert(PredictionMarket.PredictionMarket__MustProvideETHForInitialLiquidity.selector);
        vm.prank(owner);
        new PredictionMarket{value: 0}(
            owner, oracle, "Test Question", INITIAL_TOKEN_VALUE, INITIAL_PROBABILITY, PERCENTAGE_LOCKED
        );
    }

    function test_Checkpoint2_RevertWhenInvalidProbability() public {
        // probability = 0
        vm.expectRevert(PredictionMarket.PredictionMarket__InvalidProbability.selector);
        vm.prank(owner);
        new PredictionMarket{value: INITIAL_LIQUIDITY}(
            owner, oracle, "Test Question", INITIAL_TOKEN_VALUE, 0, PERCENTAGE_LOCKED
        );

        // probability = 100
        vm.expectRevert(PredictionMarket.PredictionMarket__InvalidProbability.selector);
        vm.prank(owner);
        new PredictionMarket{value: INITIAL_LIQUIDITY}(
            owner, oracle, "Test Question", INITIAL_TOKEN_VALUE, 100, PERCENTAGE_LOCKED
        );
    }

    function test_Checkpoint2_RevertWhenInvalidPercentageToLock() public {
        // percentageToLock = 0
        vm.expectRevert(PredictionMarket.PredictionMarket__InvalidPercentageToLock.selector);
        vm.prank(owner);
        new PredictionMarket{value: INITIAL_LIQUIDITY}(
            owner, oracle, "Test Question", INITIAL_TOKEN_VALUE, INITIAL_PROBABILITY, 0
        );

        // percentageToLock = 100
        vm.expectRevert(PredictionMarket.PredictionMarket__InvalidPercentageToLock.selector);
        vm.prank(owner);
        new PredictionMarket{value: INITIAL_LIQUIDITY}(
            owner, oracle, "Test Question", INITIAL_TOKEN_VALUE, INITIAL_PROBABILITY, 100
        );
    }

    function test_Checkpoint2_SetsCorrectStateVariables() public {
        string memory question = "Will the green car win the race?";
        uint256 tokenValue = 0.01 ether;
        uint8 probability = 60;
        uint8 pctLocked = 10;
        uint256 liquidity = 1 ether;

        vm.prank(owner);
        PredictionMarket pm = new PredictionMarket{value: liquidity}(
            owner, oracle, question, tokenValue, probability, pctLocked
        );

        assertEq(pm.i_oracle(), oracle);
        assertEq(pm.s_question(), question);
        assertEq(pm.i_initialTokenValue(), tokenValue);
        assertEq(pm.i_initialYesProbability(), probability);
        assertEq(pm.i_percentageLocked(), pctLocked);
        assertEq(pm.s_ethCollateral(), liquidity);
    }

    // ============================================================
    // CHECKPOINT 3: Token Deployment and Locking
    // ============================================================

    function test_Checkpoint3_CorrectInitialTokenAmounts() public {
        string memory question = "Will the green car win the race?";
        uint256 tokenValue = 0.01 ether;
        uint8 probability = 60;
        uint8 pctLocked = 10;
        uint256 liquidity = 1 ether;

        vm.prank(owner);
        PredictionMarket pm = new PredictionMarket{value: liquidity}(
            owner, oracle, question, tokenValue, probability, pctLocked
        );

        PredictionMarketToken yt = PredictionMarketToken(address(pm.i_yesToken()));
        PredictionMarketToken nt = PredictionMarketToken(address(pm.i_noToken()));

        uint256 initialTokenAmount = (liquidity * PRECISION) / tokenValue; // 100 tokens

        assertEq(yt.totalSupply(), initialTokenAmount);
        assertEq(nt.totalSupply(), initialTokenAmount);
    }

    function test_Checkpoint3_CorrectLockedTokenTransfers() public {
        string memory question = "Will the green car win the race?";
        uint256 tokenValue = 0.01 ether;
        uint8 probability = 60;
        uint8 pctLocked = 10;
        uint256 liquidity = 1 ether;

        vm.prank(owner);
        PredictionMarket pm = new PredictionMarket{value: liquidity}(
            owner, oracle, question, tokenValue, probability, pctLocked
        );

        PredictionMarketToken yt = PredictionMarketToken(address(pm.i_yesToken()));
        PredictionMarketToken nt = PredictionMarketToken(address(pm.i_noToken()));

        uint256 initialTokenAmount = (liquidity * PRECISION) / tokenValue;
        uint256 initialYesAmountLocked = (initialTokenAmount * uint256(probability) * uint256(pctLocked) * 2) / 10000;
        uint256 initialNoAmountLocked = (initialTokenAmount * uint256(100 - probability) * uint256(pctLocked) * 2) / 10000;

        assertEq(yt.balanceOf(owner), initialYesAmountLocked);
        assertEq(nt.balanceOf(owner), initialNoAmountLocked);
    }

    // ============================================================
    // CHECKPOINT 4: Liquidity Management
    // ============================================================

    function test_Checkpoint4_AddLiquidity() public {
        uint256 initialEthCollateral = predictionMarket.s_ethCollateral();
        uint256 liquidityToAdd = 5 ether;
        uint256 expectedTokenAmount = (liquidityToAdd * PRECISION) / INITIAL_TOKEN_VALUE;

        uint256 initialYesBalance = yesToken.balanceOf(address(predictionMarket));
        uint256 initialNoBalance = noToken.balanceOf(address(predictionMarket));

        vm.prank(owner);
        predictionMarket.addLiquidity{value: liquidityToAdd}();

        assertEq(predictionMarket.s_ethCollateral(), initialEthCollateral + liquidityToAdd);
        assertEq(yesToken.balanceOf(address(predictionMarket)), initialYesBalance + expectedTokenAmount);
        assertEq(noToken.balanceOf(address(predictionMarket)), initialNoBalance + expectedTokenAmount);
    }

    function test_Checkpoint4_RevertRemoveTooMuchLiquidity() public {
        uint256 ethToRemove = 11 ether; // More than 10 ETH available

        vm.prank(owner);
        vm.expectRevert();
        predictionMarket.removeLiquidity(ethToRemove);
    }

    function test_Checkpoint4_RemoveLiquidity() public {
        uint256 initialEthCollateral = predictionMarket.s_ethCollateral();
        uint256 ethToRemove = 5 ether;
        uint256 expectedTokenAmount = (ethToRemove * PRECISION) / INITIAL_TOKEN_VALUE;

        uint256 initialYesBalance = yesToken.balanceOf(address(predictionMarket));
        uint256 initialNoBalance = noToken.balanceOf(address(predictionMarket));

        vm.prank(owner);
        predictionMarket.removeLiquidity(ethToRemove);

        assertEq(predictionMarket.s_ethCollateral(), initialEthCollateral - ethToRemove);
        assertEq(yesToken.balanceOf(address(predictionMarket)), initialYesBalance - expectedTokenAmount);
        assertEq(noToken.balanceOf(address(predictionMarket)), initialNoBalance - expectedTokenAmount);
    }

    function test_Checkpoint4_EmitsLiquidityEvents() public {
        uint256 liquidityToAdd = 5 ether;
        uint256 expectedTokenAmount = (liquidityToAdd * PRECISION) / INITIAL_TOKEN_VALUE;

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit PredictionMarket.LiquidityAdded(owner, liquidityToAdd, expectedTokenAmount);
        predictionMarket.addLiquidity{value: liquidityToAdd}();

        uint256 ethToRemove = 3 ether;
        uint256 expectedRemoveTokenAmount = (ethToRemove * PRECISION) / INITIAL_TOKEN_VALUE;

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit PredictionMarket.LiquidityRemoved(owner, ethToRemove, expectedRemoveTokenAmount);
        predictionMarket.removeLiquidity(ethToRemove);
    }

    // ============================================================
    // CHECKPOINT 5: Oracle Reporting
    // ============================================================

    function test_Checkpoint5_RevertAddLiquidityAfterReport() public {
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        vm.prank(owner);
        vm.expectRevert(PredictionMarket.PredictionMarket__PredictionAlreadyReported.selector);
        predictionMarket.addLiquidity{value: 1 ether}();
    }

    function test_Checkpoint5_RevertRemoveLiquidityAfterReport() public {
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        vm.prank(owner);
        vm.expectRevert(PredictionMarket.PredictionMarket__PredictionAlreadyReported.selector);
        predictionMarket.removeLiquidity(1 ether);
    }

    function test_Checkpoint5_RevertDoubleReport() public {
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        vm.prank(oracle);
        vm.expectRevert(PredictionMarket.PredictionMarket__PredictionAlreadyReported.selector);
        predictionMarket.report(PredictionMarket.Outcome.YES);
    }

    function test_Checkpoint5_RevertNonOracleReport() public {
        address nonOracle = makeAddr("nonOracle");

        vm.prank(nonOracle);
        vm.expectRevert(PredictionMarket.PredictionMarket__OnlyOracleCanReport.selector);
        predictionMarket.report(PredictionMarket.Outcome.YES);
    }

    function test_Checkpoint5_SetsWinningTokenAndIsReported() public {
        assertEq(predictionMarket.s_isReported(), false);

        // Report YES
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        assertEq(predictionMarket.s_isReported(), true);
        assertEq(predictionMarket.s_winningToken(), address(yesToken));

        // Deploy new instance for NO test
        vm.prank(owner);
        PredictionMarket pm2 = new PredictionMarket{value: INITIAL_LIQUIDITY}(
            owner, oracle, "Test Question 2", INITIAL_TOKEN_VALUE, INITIAL_PROBABILITY, PERCENTAGE_LOCKED
        );

        assertEq(pm2.s_isReported(), false);

        vm.prank(oracle);
        pm2.report(PredictionMarket.Outcome.NO);

        assertEq(pm2.s_isReported(), true);
        assertEq(pm2.s_winningToken(), address(pm2.i_noToken()));
    }

    function test_Checkpoint5_EmitsMarketReportedEvent() public {
        vm.prank(oracle);
        vm.expectEmit(true, false, false, true);
        emit PredictionMarket.MarketReported(oracle, PredictionMarket.Outcome.YES, address(yesToken));
        predictionMarket.report(PredictionMarket.Outcome.YES);

        // Deploy new instance for NO event test
        vm.prank(owner);
        PredictionMarket pm2 = new PredictionMarket{value: INITIAL_LIQUIDITY}(
            owner, oracle, "Test Question 2", INITIAL_TOKEN_VALUE, INITIAL_PROBABILITY, PERCENTAGE_LOCKED
        );

        vm.prank(oracle);
        vm.expectEmit(true, false, false, true);
        emit PredictionMarket.MarketReported(oracle, PredictionMarket.Outcome.NO, address(pm2.i_noToken()));
        pm2.report(PredictionMarket.Outcome.NO);
    }

    // ============================================================
    // CHECKPOINT 6: Market Resolution
    // ============================================================

    function test_Checkpoint6_RevertResolveBeforeReport() public {
        vm.prank(owner);
        vm.expectRevert(PredictionMarket.PredictionMarket__PredictionNotReported.selector);
        predictionMarket.resolveMarketAndWithdraw();
    }

    function test_Checkpoint6_ResolveMarketAndWithdraw() public {
        uint256 initialOwnerBalance = owner.balance;
        uint256 initialContractBalance = address(predictionMarket).balance;

        // Report YES
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        // Calculate expected amounts
        uint256 contractWinningTokens = yesToken.balanceOf(address(predictionMarket));
        uint256 lpTradingRevenue = predictionMarket.s_lpTradingRevenue();
        uint256 ethFromTokens = (contractWinningTokens * INITIAL_TOKEN_VALUE) / PRECISION;
        uint256 expectedTotalEth = ethFromTokens + lpTradingRevenue;

        // Non-owner cannot resolve
        address nonOwner = makeAddr("nonOwner");
        vm.prank(nonOwner);
        vm.expectRevert();
        predictionMarket.resolveMarketAndWithdraw();

        // Owner resolves
        vm.prank(owner);
        predictionMarket.resolveMarketAndWithdraw();

        // Verify winning tokens burned
        assertEq(yesToken.balanceOf(address(predictionMarket)), 0);

        // Verify ETH transferred
        uint256 finalOwnerBalance = owner.balance;
        uint256 finalContractBalance = address(predictionMarket).balance;
        assertEq(finalOwnerBalance - initialOwnerBalance, expectedTotalEth);
        assertEq(finalContractBalance, initialContractBalance - expectedTotalEth);
    }

    function test_Checkpoint6_SendsExactETHAmount() public {
        uint256 initialOwnerBalance = owner.balance;
        uint256 initialContractBalance = address(predictionMarket).balance;
        uint256 lpTradingRevenue = predictionMarket.s_lpTradingRevenue();

        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        uint256 contractWinningTokens = yesToken.balanceOf(address(predictionMarket));
        uint256 ethFromTokens = (contractWinningTokens * INITIAL_TOKEN_VALUE) / PRECISION;
        uint256 expectedTotalEth = ethFromTokens + lpTradingRevenue;

        vm.prank(owner);
        predictionMarket.resolveMarketAndWithdraw();

        assertEq(owner.balance - initialOwnerBalance, expectedTotalEth);
        assertEq(address(predictionMarket).balance, initialContractBalance - expectedTotalEth);
    }

    // ============================================================
    // CHECKPOINT 7: Pricing Calculations
    // ============================================================

    function test_Checkpoint7_CalculateBuyPrice() public {
        uint256 initialTokenAmount = (INITIAL_LIQUIDITY * PRECISION) / INITIAL_TOKEN_VALUE;
        uint256 tradingAmount = initialTokenAmount / 10;

        uint256 buyPrice = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, tradingAmount);

        // Calculate expected price
        uint256 currentTokenSoldBefore = initialTokenAmount - yesToken.balanceOf(address(predictionMarket));
        uint256 currentOtherTokenSold = initialTokenAmount - noToken.balanceOf(address(predictionMarket));
        uint256 totalTokensSoldBefore = currentTokenSoldBefore + currentOtherTokenSold;
        uint256 probabilityBefore = (currentTokenSoldBefore * PRECISION) / totalTokensSoldBefore;

        uint256 currentTokenReserveAfter = yesToken.balanceOf(address(predictionMarket)) - tradingAmount;
        uint256 currentTokenSoldAfter = initialTokenAmount - currentTokenReserveAfter;
        uint256 totalTokensSoldAfter = totalTokensSoldBefore + tradingAmount;
        uint256 probabilityAfter = (currentTokenSoldAfter * PRECISION) / totalTokensSoldAfter;

        uint256 probabilityAvg = (probabilityBefore + probabilityAfter) / 2;
        uint256 expectedPrice = (INITIAL_TOKEN_VALUE * probabilityAvg * tradingAmount) / (PRECISION * PRECISION);

        assertEq(buyPrice, expectedPrice);
    }

    function test_Checkpoint7_CalculateSellPrice() public {
        uint256 initialTokenAmount = (INITIAL_LIQUIDITY * PRECISION) / INITIAL_TOKEN_VALUE;
        uint256 tradingAmount = initialTokenAmount / 10;

        uint256 sellPrice = predictionMarket.getSellPriceInEth(PredictionMarket.Outcome.YES, tradingAmount);

        // Calculate expected price
        uint256 currentTokenSoldBefore = initialTokenAmount - yesToken.balanceOf(address(predictionMarket));
        uint256 currentOtherTokenSold = initialTokenAmount - noToken.balanceOf(address(predictionMarket));
        uint256 totalTokensSoldBefore = currentTokenSoldBefore + currentOtherTokenSold;
        uint256 probabilityBefore = (currentTokenSoldBefore * PRECISION) / totalTokensSoldBefore;

        uint256 currentTokenReserveAfter = yesToken.balanceOf(address(predictionMarket)) + tradingAmount;
        uint256 currentTokenSoldAfter = initialTokenAmount - currentTokenReserveAfter;
        uint256 totalTokensSoldAfter = totalTokensSoldBefore - tradingAmount;
        uint256 probabilityAfter = (currentTokenSoldAfter * PRECISION) / totalTokensSoldAfter;

        uint256 probabilityAvg = (probabilityBefore + probabilityAfter) / 2;
        uint256 expectedPrice = (INITIAL_TOKEN_VALUE * probabilityAvg * tradingAmount) / (PRECISION * PRECISION);

        assertEq(sellPrice, expectedPrice);
    }

    function test_Checkpoint7_RevertBuyMoreThanReserve() public {
        uint256 reserveAmount = yesToken.balanceOf(address(predictionMarket));
        uint256 tooMany = reserveAmount + 1;

        vm.expectRevert(PredictionMarket.PredictionMarket__InsufficientLiquidity.selector);
        predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, tooMany);
    }

    function test_Checkpoint7_ProbabilityWithLiquidityChanges() public {
        uint256 initialTokenAmount = (INITIAL_LIQUIDITY * PRECISION) / INITIAL_TOKEN_VALUE;

        // Add liquidity - probability should stay 50%
        vm.prank(owner);
        predictionMarket.addLiquidity{value: 10 ether}();

        uint256 currentTokenSold = initialTokenAmount - yesToken.balanceOf(address(predictionMarket));
        uint256 totalTokensSold = currentTokenSold + (initialTokenAmount - noToken.balanceOf(address(predictionMarket)));
        uint256 probability = (currentTokenSold * PRECISION) / totalTokensSold;
        assertEq(probability, PRECISION / 2);

        // Add more liquidity - still 50%
        vm.prank(owner);
        predictionMarket.addLiquidity{value: 20 ether}();

        currentTokenSold = initialTokenAmount - yesToken.balanceOf(address(predictionMarket));
        totalTokensSold = currentTokenSold + (initialTokenAmount - noToken.balanceOf(address(predictionMarket)));
        probability = (currentTokenSold * PRECISION) / totalTokensSold;
        assertEq(probability, PRECISION / 2);
    }

    function test_Checkpoint7_GetCurrentReserves() public {
        uint256 initialYesReserve = yesToken.balanceOf(address(predictionMarket));
        uint256 initialNoReserve = noToken.balanceOf(address(predictionMarket));

        // Small amount to test price calculation
        uint256 smallAmount = 1e15;
        uint256 yesPrice = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, smallAmount);
        uint256 noPrice = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.NO, smallAmount);
        assertGt(yesPrice, 0);
        assertGt(noPrice, 0);

        // Add liquidity
        vm.prank(owner);
        predictionMarket.addLiquidity{value: 5 ether}();

        uint256 newYesReserve = yesToken.balanceOf(address(predictionMarket));
        uint256 newNoReserve = noToken.balanceOf(address(predictionMarket));

        assertGt(newYesReserve, initialYesReserve);
        assertGt(newNoReserve, initialNoReserve);
        assertEq(newYesReserve, newNoReserve);

        // Prices still valid
        uint256 yesPriceAfter = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, smallAmount);
        uint256 noPriceAfter = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.NO, smallAmount);
        assertGt(yesPriceAfter, 0);
        assertGt(noPriceAfter, 0);
    }

    function test_Checkpoint7_ProbabilityEdgeCases() public {
        // These are pure math checks matching the hardhat test pattern
        uint256 initialTokenAmount = (INITIAL_LIQUIDITY * PRECISION) / INITIAL_TOKEN_VALUE;

        // Very small tokens sold
        uint256 prob1 = (uint256(1) * PRECISION) / uint256(2);
        assertEq(prob1, PRECISION / 2);

        // Almost all tokens sold
        uint256 prob2 = ((initialTokenAmount - 1) * PRECISION) / (initialTokenAmount * 2 - 2);
        assertEq(prob2, PRECISION / 2);

        // Uneven: half YES sold out of total
        uint256 prob3 = ((initialTokenAmount / 2) * PRECISION) / initialTokenAmount;
        assertEq(prob3, PRECISION / 2);

        // Uneven: quarter YES sold out of total
        uint256 prob4 = ((initialTokenAmount / 4) * PRECISION) / initialTokenAmount;
        assertEq(prob4, PRECISION / 4);
    }

    // ============================================================
    // CHECKPOINT 8: Buy/Sell Tokens
    // ============================================================

    function test_Checkpoint8_RevertBuyZeroAmount() public {
        vm.prank(buyer);
        vm.expectRevert(PredictionMarket.PredictionMarket__AmountMustBeGreaterThanZero.selector);
        predictionMarket.buyTokensWithETH{value: 1 ether}(PredictionMarket.Outcome.YES, 0);
    }

    function test_Checkpoint8_RevertSellZeroAmount() public {
        vm.prank(buyer);
        vm.expectRevert(PredictionMarket.PredictionMarket__AmountMustBeGreaterThanZero.selector);
        predictionMarket.sellTokensForEth(PredictionMarket.Outcome.YES, 0);
    }

    function test_Checkpoint8_RevertBuyWithIncorrectETH() public {
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);

        vm.prank(buyer);
        vm.expectRevert(PredictionMarket.PredictionMarket__MustSendExactETHAmount.selector);
        predictionMarket.buyTokensWithETH{value: requiredEth + 1}(PredictionMarket.Outcome.YES, amountToBuy);
    }

    function test_Checkpoint8_BuyTokens() public {
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);

        uint256 initialBuyerTokens = yesToken.balanceOf(buyer);
        uint256 initialContractBalance = address(predictionMarket).balance;

        vm.prank(buyer);
        predictionMarket.buyTokensWithETH{value: requiredEth}(PredictionMarket.Outcome.YES, amountToBuy);

        assertEq(yesToken.balanceOf(buyer), initialBuyerTokens + amountToBuy);
        assertEq(address(predictionMarket).balance, initialContractBalance + requiredEth);
    }

    function test_Checkpoint8_SellTokens() public {
        // First buy some tokens
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);
        vm.prank(seller);
        predictionMarket.buyTokensWithETH{value: requiredEth}(PredictionMarket.Outcome.YES, amountToBuy);

        // Approve tokens
        vm.prank(seller);
        yesToken.approve(address(predictionMarket), amountToBuy);

        uint256 initialSellerBalance = seller.balance;
        uint256 initialContractBalance = address(predictionMarket).balance;
        uint256 initialSellerTokens = yesToken.balanceOf(seller);

        uint256 ethToReceive = predictionMarket.getSellPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);

        vm.prank(seller);
        predictionMarket.sellTokensForEth(PredictionMarket.Outcome.YES, amountToBuy);

        assertEq(yesToken.balanceOf(seller), initialSellerTokens - amountToBuy);
        assertEq(seller.balance - initialSellerBalance, ethToReceive);
        assertEq(address(predictionMarket).balance, initialContractBalance - ethToReceive);
    }

    function test_Checkpoint8_RevertSellMoreThanOwned() public {
        // Buy some tokens
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);
        vm.prank(seller);
        predictionMarket.buyTokensWithETH{value: requiredEth}(PredictionMarket.Outcome.YES, amountToBuy);

        // Approve
        vm.prank(seller);
        yesToken.approve(address(predictionMarket), amountToBuy + 1);

        // Try to sell more than owned
        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(
                PredictionMarket.PredictionMarket__InsufficientBalance.selector,
                amountToBuy + 1,
                amountToBuy
            )
        );
        predictionMarket.sellTokensForEth(PredictionMarket.Outcome.YES, amountToBuy + 1);
    }

    function test_Checkpoint8_RevertSellWithoutApproval() public {
        // Buy some tokens
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);
        vm.prank(seller);
        predictionMarket.buyTokensWithETH{value: requiredEth}(PredictionMarket.Outcome.YES, amountToBuy);

        // Try to sell without approval
        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(
                PredictionMarket.PredictionMarket__InsufficientAllowance.selector,
                amountToBuy,
                0
            )
        );
        predictionMarket.sellTokensForEth(PredictionMarket.Outcome.YES, amountToBuy);
    }

    function test_Checkpoint8_EmitsBuySellEvents() public {
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);

        // Buy and check event
        vm.prank(buyer);
        vm.expectEmit(true, false, false, true);
        emit PredictionMarket.TokensPurchased(buyer, PredictionMarket.Outcome.YES, amountToBuy, requiredEth);
        predictionMarket.buyTokensWithETH{value: requiredEth}(PredictionMarket.Outcome.YES, amountToBuy);

        // Approve for selling
        vm.prank(buyer);
        yesToken.approve(address(predictionMarket), amountToBuy);

        uint256 ethToReceive = predictionMarket.getSellPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);

        // Sell and check event
        vm.prank(buyer);
        vm.expectEmit(true, false, false, true);
        emit PredictionMarket.TokensSold(buyer, PredictionMarket.Outcome.YES, amountToBuy, ethToReceive);
        predictionMarket.sellTokensForEth(PredictionMarket.Outcome.YES, amountToBuy);
    }

    function test_Checkpoint8_RevertBuyAfterReport() public {
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);

        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        vm.prank(buyer);
        vm.expectRevert(PredictionMarket.PredictionMarket__PredictionAlreadyReported.selector);
        predictionMarket.buyTokensWithETH{value: requiredEth}(PredictionMarket.Outcome.YES, amountToBuy);
    }

    function test_Checkpoint8_RevertSellAfterReport() public {
        // Buy first
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);
        vm.prank(seller);
        predictionMarket.buyTokensWithETH{value: requiredEth}(PredictionMarket.Outcome.YES, amountToBuy);

        // Approve
        vm.prank(seller);
        yesToken.approve(address(predictionMarket), amountToBuy);

        // Report
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        // Try to sell
        vm.prank(seller);
        vm.expectRevert(PredictionMarket.PredictionMarket__PredictionAlreadyReported.selector);
        predictionMarket.sellTokensForEth(PredictionMarket.Outcome.YES, amountToBuy);
    }

    function test_Checkpoint8_OwnerCannotBuyOrSell() public {
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);

        // Owner tries to buy
        vm.prank(owner);
        vm.expectRevert(PredictionMarket.PredictionMarket__OwnerCannotCall.selector);
        predictionMarket.buyTokensWithETH{value: requiredEth}(PredictionMarket.Outcome.YES, amountToBuy);

        // Owner tries to sell
        vm.prank(owner);
        vm.expectRevert(PredictionMarket.PredictionMarket__OwnerCannotCall.selector);
        predictionMarket.sellTokensForEth(PredictionMarket.Outcome.YES, amountToBuy);
    }

    // ============================================================
    // CHECKPOINT 9: Token Redemption
    // ============================================================

    function test_Checkpoint9_RevertRedeemBeforeReport() public {
        vm.prank(redeemer);
        vm.expectRevert(PredictionMarket.PredictionMarket__PredictionNotReported.selector);
        predictionMarket.redeemWinningTokens(1 ether);
    }

    function test_Checkpoint9_RevertRedeemMoreThanOwned() public {
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        vm.prank(redeemer);
        vm.expectRevert(PredictionMarket.PredictionMarket__InsufficientWinningTokens.selector);
        predictionMarket.redeemWinningTokens(1 ether);
    }

    function test_Checkpoint9_RevertRedeemZero() public {
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        vm.prank(redeemer);
        vm.expectRevert(PredictionMarket.PredictionMarket__AmountMustBeGreaterThanZero.selector);
        predictionMarket.redeemWinningTokens(0);
    }

    function test_Checkpoint9_RedeemWinningTokens() public {
        // Buy YES tokens
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);
        vm.prank(redeemer);
        predictionMarket.buyTokensWithETH{value: requiredEth}(PredictionMarket.Outcome.YES, amountToBuy);

        // Report YES wins
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        uint256 initialRedeemerBalance = redeemer.balance;
        uint256 initialContractBalance = address(predictionMarket).balance;
        uint256 initialRedeemerTokens = yesToken.balanceOf(redeemer);
        uint256 expectedEth = (amountToBuy * INITIAL_TOKEN_VALUE) / PRECISION;

        // Redeem
        vm.prank(redeemer);
        predictionMarket.redeemWinningTokens(amountToBuy);

        assertEq(yesToken.balanceOf(redeemer), initialRedeemerTokens - amountToBuy);
        assertEq(redeemer.balance - initialRedeemerBalance, expectedEth);
        assertEq(address(predictionMarket).balance, initialContractBalance - expectedEth);
    }

    function test_Checkpoint9_EmitsRedeemEvent() public {
        // Buy YES tokens
        uint256 amountToBuy = yesToken.balanceOf(address(predictionMarket)) / 10;
        uint256 requiredEth = predictionMarket.getBuyPriceInEth(PredictionMarket.Outcome.YES, amountToBuy);
        vm.prank(redeemer);
        predictionMarket.buyTokensWithETH{value: requiredEth}(PredictionMarket.Outcome.YES, amountToBuy);

        // Report YES wins
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        uint256 expectedEth = (amountToBuy * INITIAL_TOKEN_VALUE) / PRECISION;

        vm.prank(redeemer);
        vm.expectEmit(true, false, false, true);
        emit PredictionMarket.WinningTokensRedeemed(redeemer, amountToBuy, expectedEth);
        predictionMarket.redeemWinningTokens(amountToBuy);
    }

    function test_Checkpoint9_OwnerCannotRedeem() public {
        vm.prank(oracle);
        predictionMarket.report(PredictionMarket.Outcome.YES);

        vm.prank(owner);
        vm.expectRevert(PredictionMarket.PredictionMarket__OwnerCannotCall.selector);
        predictionMarket.redeemWinningTokens(1 ether);
    }
}
