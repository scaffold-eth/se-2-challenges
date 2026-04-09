// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { Test } from "forge-std/Test.sol";
import { Vm } from "forge-std/Vm.sol";
import { DiceGame } from "../contracts/DiceGame.sol";
import { RiggedRoll } from "../contracts/RiggedRoll.sol";
import { IDiceGame } from "../contracts/IDiceGame.sol";
import { IRiggedRoll } from "../contracts/IRiggedRoll.sol";

contract RiggedRollTest is Test {
    IDiceGame public diceGame;
    IRiggedRoll public riggedRoll;
    address public deployer;

    uint256 constant ROLL_AMOUNT = 0.002 ether;

    function setUp() public {
        deployer = makeAddr("deployer");
        vm.deal(deployer, 100 ether);

        vm.startPrank(deployer);
        diceGame = IDiceGame(address(new DiceGame{ value: 0.05 ether }()));
        riggedRoll = IRiggedRoll(address(new RiggedRoll(payable(address(diceGame)))));
        vm.stopPrank();
    }

    function _fundRiggedRoll() internal {
        vm.deal(address(riggedRoll), ROLL_AMOUNT);
    }

    function _getRoll(bool wantWinning) internal returns (uint256 expectedRoll) {
        while (true) {
            bytes32 prevHash = blockhash(block.number - 1);
            uint256 nonce = diceGame.nonce();
            bytes32 hash = keccak256(abi.encodePacked(prevHash, address(diceGame), nonce));
            expectedRoll = uint256(hash) % 16;

            if ((expectedRoll <= 5) == wantWinning) {
                return expectedRoll;
            }

            // Roll to advance nonce
            vm.deal(address(this), ROLL_AMOUNT);
            diceGame.rollTheDice{ value: ROLL_AMOUNT }();
        }
    }

    // ============================================================
    // Checkpoint 1: Receiving ETH
    // ============================================================

    function test_Checkpoint1_ShouldAcceptETHTransfers() public {
        _fundRiggedRoll();
        uint256 balance = address(riggedRoll).balance;
        assertGe(balance, ROLL_AMOUNT, "RiggedRoll should have received ETH");
    }

    // ============================================================
    // Checkpoint 2: Rigged Contract
    // ============================================================

    function test_Checkpoint2_ShouldDeployContracts() public view {
        assertEq(address(riggedRoll.diceGame()), address(diceGame), "RiggedRoll should reference DiceGame");
    }

    function test_Checkpoint2_ShouldRevertIfBalanceLessThanRollAmount() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IRiggedRoll.NotEnoughETH.selector,
                ROLL_AMOUNT,
                0
            )
        );
        riggedRoll.riggedRoll();
    }

    function test_Checkpoint2_ShouldTransferSufficientETH() public {
        _fundRiggedRoll();
        uint256 balance = address(riggedRoll).balance;
        assertGe(balance, ROLL_AMOUNT, "RiggedRoll should have enough ETH to roll");
    }

    function test_Checkpoint2_ShouldCallRollTheDiceForWinningRoll() public {
        _fundRiggedRoll();

        uint256 expectedRoll = _getRoll(true);

        vm.recordLogs();
        riggedRoll.riggedRoll();

        // Verify Roll event was emitted with winning roll
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool foundRoll = false;
        bool foundWinner = false;
        for (uint256 i = 0; i < entries.length; i++) {
            // Roll event: Roll(address indexed player, uint256 amount, uint256 roll)
            if (entries[i].topics[0] == IDiceGame.Roll.selector) {
                (uint256 amount, uint256 roll) = abi.decode(entries[i].data, (uint256, uint256));
                assertEq(entries[i].topics[1], bytes32(uint256(uint160(address(riggedRoll)))), "Player should be RiggedRoll");
                assertEq(amount, ROLL_AMOUNT, "Amount should be roll amount");
                assertEq(roll, expectedRoll, "Roll should match expected");
                foundRoll = true;
            }
            // Winner event
            if (entries[i].topics[0] == IDiceGame.Winner.selector) {
                foundWinner = true;
            }
        }
        assertTrue(foundRoll, "Roll event should have been emitted");
        assertTrue(foundWinner, "Winner event should have been emitted");
    }

    function test_Checkpoint2_ShouldNotCallRollTheDiceForLosingRoll() public {
        _fundRiggedRoll();

        uint256 expectedRoll = _getRoll(false);

        vm.expectRevert(
            abi.encodeWithSelector(
                IRiggedRoll.NotWinningRoll.selector,
                expectedRoll
            )
        );
        riggedRoll.riggedRoll();
    }

    // ============================================================
    // Checkpoint 3: Where's my money?!?
    // ============================================================

    function test_Checkpoint3_ShouldWithdrawFunds() public {
        _fundRiggedRoll();

        uint256 deployerPrevBalance = deployer.balance;
        uint256 riggedRollBalance = address(riggedRoll).balance;

        vm.prank(deployer);
        riggedRoll.withdraw(deployer, riggedRollBalance);

        uint256 deployerCurrentBalance = deployer.balance;
        assertGt(deployerCurrentBalance, deployerPrevBalance, "Deployer balance should increase after withdraw");
    }

    function test_Checkpoint3_ShouldRevertWithdrawWhenAmountExceedsBalance() public {
        _fundRiggedRoll();

        uint256 riggedRollBalance = address(riggedRoll).balance;
        uint256 tooMuch = riggedRollBalance + ROLL_AMOUNT;

        vm.prank(deployer);
        vm.expectRevert(
            abi.encodeWithSelector(
                IRiggedRoll.InsufficientBalance.selector,
                tooMuch,
                riggedRollBalance
            )
        );
        riggedRoll.withdraw(deployer, tooMuch);
    }

    receive() external payable {}
}
