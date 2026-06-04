// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { Test, Vm } from "forge-std/Test.sol";
import { Balloons } from "../contracts/Balloons.sol";
import { DEX } from "../contracts/DEX.sol";
import { IDEX } from "../contracts/IDEX.sol";

contract DEXTest is Test {
    Balloons public balloons;
    IDEX public dex;
    address public deployer;
    address public user2;
    address public user3;

    function setUp() public {
        deployer = makeAddr("deployer");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");

        vm.deal(deployer, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(user3, 100 ether);

        vm.startPrank(deployer);
        balloons = new Balloons();
        dex = IDEX(address(new DEX(address(balloons))));
        vm.stopPrank();
    }

    function _initDex() internal {
        vm.startPrank(deployer);
        balloons.transfer(user2, 10 ether);
        balloons.transfer(user3, 10 ether);
        balloons.approve(address(dex), 100 ether);
        dex.init{ value: 5 ether }(5 ether);
        vm.stopPrank();
    }

    // ============================================================
    // Checkpoint 2: Reserves + init() + getLiquidity()
    // ============================================================

    function test_Checkpoint2_TotalLiquidityStartsAtZeroAndInitSetsIt() public {
        assertEq(dex.totalLiquidity(), 0);

        vm.startPrank(deployer);
        balloons.approve(address(dex), 100 ether);
        dex.init{ value: 5 ether }(5 ether);
        vm.stopPrank();

        assertEq(dex.totalLiquidity(), 5 ether);
    }

    function test_Checkpoint2_InitRevertsOnSecondCall() public {
        vm.startPrank(deployer);
        balloons.approve(address(dex), 100 ether);
        dex.init{ value: 5 ether }(5 ether);

        vm.expectRevert(abi.encodeWithSelector(IDEX.DexAlreadyInitialized.selector));
        dex.init{ value: 1 ether }(1 ether);
        vm.stopPrank();
    }

    function test_Checkpoint2_GetLiquidityReturnsLPBalance() public {
        _initDex();
        assertEq(dex.getLiquidity(deployer), 5 ether);
    }

    // ============================================================
    // Checkpoint 3: price()
    // ============================================================

    function test_Checkpoint3_PriceCalculationWithFee() public view {
        uint256 xInput = 1 ether;
        uint256 xReserves = 5 ether;
        uint256 yReserves = 5 ether;
        uint256 yOutput = dex.price(xInput, xReserves, yReserves);
        assertEq(yOutput, 831248957812239453, "Price with 0.3% fee should match expected output");

        xReserves = 10 ether;
        yReserves = 15 ether;
        yOutput = dex.price(xInput, xReserves, yReserves);
        assertEq(yOutput, 1359916340820223697);
    }

    // ============================================================
    // Checkpoint 4: Trading (ethToToken + tokenToEth)
    // ============================================================

    function test_Checkpoint4_EthToTokenRevertsOnZeroEth() public {
        _initDex();
        vm.expectRevert(abi.encodeWithSelector(IDEX.InvalidEthAmount.selector));
        dex.ethToToken{ value: 0 }();
    }

    function test_Checkpoint4_EthToTokenEmitsAndTransfers() public {
        _initDex();

        uint256 xInput = 1 ether;
        uint256 xReserves = address(dex).balance;
        uint256 yReserves = balloons.balanceOf(address(dex));
        uint256 expectedYOutput = dex.price(xInput, xReserves, yReserves);

        uint256 userBalBefore = balloons.balanceOf(user2);

        vm.prank(user2);
        vm.recordLogs();
        dex.ethToToken{ value: xInput }();

        uint256 userBalAfter = balloons.balanceOf(user2);
        assertEq(userBalAfter, userBalBefore + expectedYOutput, "ethToToken should match expected output");

        assertEq(address(dex).balance, xReserves + xInput, "DEX ETH should increase by swap input");

        // Check EthToTokenSwap event was emitted
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("EthToTokenSwap(address,uint256,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "EthToTokenSwap event should be emitted");
    }

    function test_Checkpoint4_TokenToEthRevertsOnZeroTokens() public {
        _initDex();
        vm.expectRevert(abi.encodeWithSelector(IDEX.InvalidTokenAmount.selector));
        dex.tokenToEth(0);
    }

    function test_Checkpoint4_TokenToEthEmitsAndTransfers() public {
        _initDex();

        uint256 dexEthBefore = address(dex).balance;

        vm.startPrank(deployer);
        balloons.approve(address(dex), 1 ether);

        vm.recordLogs();
        dex.tokenToEth(1 ether);
        vm.stopPrank();

        uint256 dexEthAfter = address(dex).balance;
        assertLt(dexEthAfter, dexEthBefore, "DEX should have less ETH after token-to-eth swap");

        // Check TokenToEthSwap event was emitted
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("TokenToEthSwap(address,uint256,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "TokenToEthSwap event should be emitted");
    }

    // ============================================================
    // Checkpoint 5: Liquidity (deposit + withdraw)
    // ============================================================

    function test_Checkpoint5_DepositRevertsOnZeroEth() public {
        _initDex();
        vm.expectRevert(abi.encodeWithSelector(IDEX.InvalidEthAmount.selector));
        dex.deposit{ value: 0 }();
    }

    function test_Checkpoint5_DepositIncreasesLiquidityAndEmits() public {
        _initDex();

        uint256 liquidityStart = dex.totalLiquidity();
        uint256 userLpStart = dex.getLiquidity(user2);
        assertEq(userLpStart, 0);

        vm.startPrank(user2);
        balloons.approve(address(dex), 100 ether);

        vm.recordLogs();
        dex.deposit{ value: 5 ether }();
        vm.stopPrank();

        uint256 liquidityEnd = dex.totalLiquidity();
        assertEq(liquidityEnd, liquidityStart + 5 ether);

        uint256 userLpEnd = dex.getLiquidity(user2);
        assertEq(userLpEnd, 5 ether);

        // Check LiquidityProvided event
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("LiquidityProvided(address,uint256,uint256,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "LiquidityProvided event should be emitted");
    }

    function test_Checkpoint5_WithdrawRevertsIfNoLiquidity() public {
        _initDex();

        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(IDEX.InsufficientLiquidity.selector, uint256(0), uint256(1 ether)));
        dex.withdraw(1 ether);
    }

    function test_Checkpoint5_WithdrawEmitsAndDecreasesLiquidity() public {
        _initDex();

        uint256 totalLpBefore = dex.totalLiquidity();

        vm.prank(deployer);
        vm.recordLogs();
        dex.withdraw(1.5 ether);

        uint256 totalLpAfter = dex.totalLiquidity();
        assertEq(totalLpAfter, totalLpBefore - 1.5 ether);

        // Check LiquidityRemoved event
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("LiquidityRemoved(address,uint256,uint256,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "LiquidityRemoved event should be emitted");
    }

    receive() external payable { }
}
