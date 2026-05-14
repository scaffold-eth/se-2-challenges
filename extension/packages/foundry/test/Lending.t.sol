// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, Vm } from "forge-std/Test.sol";
import { Corn } from "../contracts/Corn.sol";
import { CornDEX } from "../contracts/CornDEX.sol";
import { Lending } from "../contracts/Lending.sol";
import { ILending } from "../contracts/ILending.sol";

contract LendingTest is Test {
    Corn public cornToken;
    CornDEX public cornDEX;
    ILending public lending;

    address public owner;
    address public user1;
    address public user2;

    uint256 constant COLLATERAL_AMOUNT = 10 ether;
    uint256 constant BORROW_AMOUNT = 5000 ether;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(owner, 10000 ether);

        cornToken = new Corn();
        cornDEX = new CornDEX(address(cornToken));

        cornToken.mintTo(owner, 1_000_000 ether);
        cornToken.approve(address(cornDEX), 1_000_000 ether);
        cornDEX.init{ value: 1_000 ether }(1_000_000 ether);

        lending = ILending(address(new Lending(address(cornDEX), address(cornToken))));
        cornToken.mintTo(address(lending), 10_000_000_000_000_000_000_000 ether);
    }

    // ============================================================
    // Deployment
    // ============================================================

    function test_DeployWithCorrectInitialState() public view {
        assertEq(cornToken.balanceOf(address(lending)), 10_000_000_000_000_000_000_000 ether);
    }

    // ============================================================
    // Collateral Operations
    // ============================================================

    function test_Collateral_AllowAddingCollateral() public {
        vm.prank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();
        assertEq(lending.s_userCollateral(user1), COLLATERAL_AMOUNT);
    }

    function test_Collateral_RequireNonZeroValue() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("Lending__InvalidAmount()"))));
        lending.addCollateral{ value: 0 }();
    }

    function test_Collateral_EmitCollateralAddedEvent() public {
        vm.prank(user1);
        vm.recordLogs();
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("CollateralAdded(address,uint256,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "CollateralAdded event should be emitted");
    }

    function test_Collateral_AllowWithdrawingWhenNoDebt() public {
        vm.startPrank(user1);
        uint256 balanceInitial = user1.balance;
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();
        uint256 balanceAfterAdd = user1.balance;
        assertTrue(balanceAfterAdd < balanceInitial);

        lending.withdrawCollateral(COLLATERAL_AMOUNT);
        assertEq(lending.s_userCollateral(user1), 0);

        uint256 balanceAfterWithdraw = user1.balance;
        assertTrue(balanceAfterWithdraw > balanceAfterAdd);
        vm.stopPrank();
    }

    function test_Collateral_PreventWithdrawingMoreThanDeposited() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("Lending__InvalidAmount()"))));
        lending.withdrawCollateral(COLLATERAL_AMOUNT * 2);
        vm.stopPrank();
    }

    function test_Collateral_PreventWithdrawingZero() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("Lending__InvalidAmount()"))));
        lending.withdrawCollateral(0);
        vm.stopPrank();
    }

    // ============================================================
    // Withdraw Protection
    // ============================================================

    function test_Withdraw_PreventIfMakesLiquidatable() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();
        lending.borrowCorn(BORROW_AMOUNT);

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("Lending__UnsafePositionRatio()"))));
        lending.withdrawCollateral(COLLATERAL_AMOUNT);
        vm.stopPrank();
    }

    // ============================================================
    // Borrowing Operations
    // ============================================================

    function test_Borrowing_AllowWhenSufficientlyCollateralized() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();

        assertEq(cornToken.balanceOf(user1), 0);
        lending.borrowCorn(BORROW_AMOUNT);
        assertEq(lending.s_userBorrowed(user1), BORROW_AMOUNT);
        assertEq(cornToken.balanceOf(user1), BORROW_AMOUNT);
        vm.stopPrank();
    }

    function test_Borrowing_PreventWhenInsufficientlyCollateralized() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();

        uint256 tooMuchBorrow = 10_000 ether;
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("Lending__UnsafePositionRatio()"))));
        lending.borrowCorn(tooMuchBorrow);
        vm.stopPrank();
    }

    function test_Borrowing_PreventZeroBorrowAmount() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("Lending__InvalidAmount()"))));
        lending.borrowCorn(0);
        vm.stopPrank();
    }

    function test_Borrowing_EmitAssetBorrowedEvent() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();

        vm.recordLogs();
        lending.borrowCorn(BORROW_AMOUNT);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("AssetBorrowed(address,uint256,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "AssetBorrowed event should be emitted");
        vm.stopPrank();
    }

    // ============================================================
    // Repayment Operations
    // ============================================================

    function test_Repayment_AllowRepayingFullAmount() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();
        lending.borrowCorn(BORROW_AMOUNT);

        cornToken.approve(address(lending), BORROW_AMOUNT);
        lending.repayCorn(BORROW_AMOUNT);
        assertEq(lending.s_userBorrowed(user1), 0);
        vm.stopPrank();
    }

    function test_Repayment_AllowPartialRepayment() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();
        lending.borrowCorn(BORROW_AMOUNT);

        cornToken.approve(address(lending), BORROW_AMOUNT / 2);
        lending.repayCorn(BORROW_AMOUNT / 2);
        assertEq(lending.s_userBorrowed(user1), BORROW_AMOUNT / 2);
        vm.stopPrank();
    }

    function test_Repayment_PreventRepayingMoreThanBorrowed() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();
        lending.borrowCorn(BORROW_AMOUNT);

        cornToken.approve(address(lending), BORROW_AMOUNT * 2);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("Lending__InvalidAmount()"))));
        lending.repayCorn(BORROW_AMOUNT * 2);
        vm.stopPrank();
    }

    function test_Repayment_PreventZeroRepayment() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();
        lending.borrowCorn(BORROW_AMOUNT);

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("Lending__InvalidAmount()"))));
        lending.repayCorn(0);
        vm.stopPrank();
    }

    function test_Repayment_EmitAssetRepaidEvent() public {
        vm.startPrank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();
        lending.borrowCorn(BORROW_AMOUNT);

        cornToken.approve(address(lending), BORROW_AMOUNT);
        vm.recordLogs();
        lending.repayCorn(BORROW_AMOUNT);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("AssetRepaid(address,uint256,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "AssetRepaid event should be emitted");
        vm.stopPrank();
    }

    // ============================================================
    // Liquidation
    // ============================================================

    function _setupLiquidation() internal {
        vm.prank(user1);
        lending.addCollateral{ value: COLLATERAL_AMOUNT }();
        vm.prank(user1);
        lending.borrowCorn(BORROW_AMOUNT);

        // Mint CORN to user2 for liquidation
        cornToken.mintTo(user2, BORROW_AMOUNT);
        vm.prank(user2);
        cornToken.approve(address(lending), BORROW_AMOUNT);
    }

    function test_Liquidation_AllowWhenPositionUnsafe() public {
        _setupLiquidation();

        // Drop price of ETH by swapping a large amount
        cornToken.mintTo(owner, 300 ether);
        cornToken.approve(address(cornDEX), 300 ether);
        cornDEX.swap{ value: 300 ether }(300 ether);

        assertTrue(lending.isLiquidatable(user1));

        uint256 beforeBalance = user2.balance;
        vm.prank(user2);
        lending.liquidate(user1);

        uint256 afterBalance = user2.balance;
        assertEq(lending.s_userBorrowed(user1), 0);
        assertTrue(afterBalance > beforeBalance);
    }

    function test_Liquidation_PreventOnSafePositions() public {
        _setupLiquidation();

        assertFalse(lending.isLiquidatable(user1));

        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("Lending__NotLiquidatable()"))));
        lending.liquidate(user1);
    }

    function test_Liquidation_RequireEnoughCorn() public {
        _setupLiquidation();

        // Drop price
        cornToken.mintTo(owner, 300 ether);
        cornToken.approve(address(cornDEX), 300 ether);
        cornDEX.swap{ value: 300 ether }(300 ether);

        assertTrue(lending.isLiquidatable(user1));

        // Transfer half of user2's CORN away
        vm.prank(user2);
        cornToken.transfer(owner, BORROW_AMOUNT / 2);

        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("Lending__InsufficientLiquidatorCorn()"))));
        lending.liquidate(user1);
    }

    function test_Liquidation_EmitEvent() public {
        _setupLiquidation();

        // Drop price
        cornToken.mintTo(owner, 300 ether);
        cornToken.approve(address(cornDEX), 300 ether);
        cornDEX.swap{ value: 300 ether }(300 ether);

        vm.prank(user2);
        vm.recordLogs();
        lending.liquidate(user1);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("Liquidation(address,address,uint256,uint256,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "Liquidation event should be emitted");
    }

    receive() external payable { }
}
