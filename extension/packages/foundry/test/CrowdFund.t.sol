// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { Test } from "forge-std/Test.sol";
import { ICrowdFund } from "../contracts/ICrowdFund.sol";
import { CrowdFund } from "../contracts/CrowdFund.sol";
import { FundingRecipient } from "../contracts/FundingRecipient.sol";

contract CrowdFundTest is Test {
    FundingRecipient public fundingRecipient;
    ICrowdFund public crowdFund;
    address public user1;
    address public user2;

    function setUp() public {
        fundingRecipient = new FundingRecipient();
        crowdFund = ICrowdFund(address(new CrowdFund(address(fundingRecipient))));
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    // ============================================================
    // Checkpoint 1: Contributing
    // ============================================================

    function test_Checkpoint1_BalancesGoUpOnContribute() public {
        uint256 startingBalance = crowdFund.balances(user1);

        uint256 amount = 0.001 ether;
        vm.prank(user1);
        crowdFund.contribute{ value: amount }();

        uint256 newBalance = crowdFund.balances(user1);
        assertEq(newBalance, startingBalance + amount);
    }

    function test_Checkpoint1_EmitsContributionEvent() public {
        uint256 amount = 0.001 ether;
        vm.prank(user1);
        vm.expectEmit(false, false, false, true);
        emit Contribution(user1, amount);
        crowdFund.contribute{ value: amount }();
    }

    // Declare the event to match against
    event Contribution(address, uint256);

    function test_Checkpoint1_AccumulatesMultipleContributions() public {
        uint256 starting = crowdFund.balances(user1);

        uint256 a1 = 0.001 ether;
        uint256 a2 = 0.002 ether;
        vm.startPrank(user1);
        crowdFund.contribute{ value: a1 }();
        crowdFund.contribute{ value: a2 }();
        vm.stopPrank();

        uint256 ending = crowdFund.balances(user1);
        assertEq(ending, starting + a1 + a2);
    }

    function test_Checkpoint1_TracksBalancesPerContributor() public {
        uint256 a1 = 0.001 ether;
        uint256 a2 = 0.002 ether;

        vm.prank(user1);
        crowdFund.contribute{ value: a1 }();

        vm.prank(user2);
        crowdFund.contribute{ value: a2 }();

        assertEq(crowdFund.balances(user1), a1);
        assertEq(crowdFund.balances(user2), a2);
    }

    function test_Checkpoint1_ContractBalanceIncreasesOnContribute() public {
        uint256 startContractBal = address(crowdFund).balance;

        uint256 amount = 0.001 ether;
        vm.prank(user1);
        crowdFund.contribute{ value: amount }();

        uint256 endContractBal = address(crowdFund).balance;
        assertEq(endContractBal, startContractBal + amount);
    }

    // ============================================================
    // Checkpoint 2: Withdrawing Funds
    // ============================================================

    /// @dev Toggle openToWithdraw via storage since no setter exists at Checkpoint 2.
    /// Probes slots 0-20 byte-by-byte (like the Hardhat tests) to find the bool.
    function _setOpenToWithdrawTrue() internal {
        // If already open, nothing to do.
        try crowdFund.openToWithdraw() returns (bool isOpen) {
            if (isOpen) return;
        } catch {
            return; // function doesn't exist yet
        }

        for (uint256 s = 0; s <= 20; s++) {
            bytes32 original = vm.load(address(crowdFund), bytes32(s));

            for (uint256 byteIdx = 0; byteIdx < 32; byteIdx++) {
                bytes32 mutated = original;
                // Set the byte at byteIdx to 0x01
                mutated = bytes32(
                    (uint256(original) & ~(uint256(0xFF) << (8 * (31 - byteIdx))))
                        | (uint256(0x01) << (8 * (31 - byteIdx)))
                );
                vm.store(address(crowdFund), bytes32(s), mutated);

                try crowdFund.openToWithdraw() returns (bool isOpen) {
                    if (isOpen) return; // Found it, leave the mutation
                } catch { }

                // Restore original before trying next byte
                vm.store(address(crowdFund), bytes32(s), original);
            }
        }

        revert("Could not locate openToWithdraw storage slot");
    }

    function test_Checkpoint2_WithdrawRevertsWhenNotOpen() public {
        vm.prank(user1);
        vm.expectRevert();
        crowdFund.withdraw();
    }

    function test_Checkpoint2_WithdrawSendsBalanceAndZerosOut() public {
        uint256 amount = 0.001 ether;
        vm.prank(user1);
        crowdFund.contribute{ value: amount }();
        assertEq(crowdFund.balances(user1), amount);

        _setOpenToWithdrawTrue();

        uint256 startingBalance = user1.balance;
        vm.prank(user1);
        crowdFund.withdraw();

        assertEq(user1.balance, startingBalance + amount);
        assertEq(crowdFund.balances(user1), 0);
    }

    function test_Checkpoint2_DoubleWithdrawDoesNotDrainExtra() public {
        uint256 amount = 0.001 ether;
        vm.prank(user1);
        crowdFund.contribute{ value: amount }();

        _setOpenToWithdrawTrue();

        vm.prank(user1);
        crowdFund.withdraw();
        uint256 balanceAfterFirst = user1.balance;

        // Second withdraw should send 0
        vm.prank(user1);
        crowdFund.withdraw();
        uint256 balanceAfterSecond = user1.balance;

        assertEq(balanceAfterSecond, balanceAfterFirst);
        assertEq(crowdFund.balances(user1), 0);
    }

    // ============================================================
    // Checkpoint 3: State Machine / Timing
    // ============================================================

    function test_Checkpoint3_ExecuteRevertsBeforeDeadline() public {
        vm.expectRevert();
        crowdFund.execute();
    }

    function test_Checkpoint3_TimeLeftDecreases() public {
        uint256 t1 = crowdFund.timeLeft();
        assertGt(t1, 0);

        vm.warp(block.timestamp + 5);

        uint256 t2 = crowdFund.timeLeft();
        assertLt(t2, t1);
        assertGe(t2, 0);
    }

    function test_Checkpoint3_ExecuteCompletesWhenThresholdMet() public {
        uint256 timeLeft1 = crowdFund.timeLeft();
        assertGt(timeLeft1, 0, "timeLeft not greater than 0. Did you implement timeLeft() correctly?");

        vm.prank(user1);
        crowdFund.contribute{ value: 1 ether }();

        vm.warp(block.timestamp + 72 hours);

        uint256 timeLeft2 = crowdFund.timeLeft();
        assertEq(timeLeft2, 0, "timeLeft not equal to 0. Did you implement timeLeft() correctly?");

        uint256 startRecipientBal = address(fundingRecipient).balance;
        uint256 startContractBal = address(crowdFund).balance;

        crowdFund.execute();

        assertTrue(fundingRecipient.completed());
        assertEq(address(fundingRecipient).balance, startRecipientBal + startContractBal);
        assertEq(address(crowdFund).balance, 0);
    }

    function test_Checkpoint3_ExecuteEnablesWithdrawWhenThresholdNotMet() public {
        vm.prank(user2);
        crowdFund.contribute{ value: 0.001 ether }();

        vm.warp(block.timestamp + 72 hours);

        crowdFund.execute();

        assertFalse(fundingRecipient.completed());

        // openToWithdraw should now be true
        assertTrue(crowdFund.openToWithdraw());

        uint256 startingBalance = user2.balance;
        vm.prank(user2);
        crowdFund.withdraw();

        assertEq(user2.balance, startingBalance + 0.001 ether);
    }

    // ============================================================
    // Checkpoint 4: Receive Function / UX
    // ============================================================

    function test_Checkpoint4_DirectETHTransferBehavesLikeContribute() public {
        uint256 startingBalance = crowdFund.balances(user1);

        uint256 amount = 0.001 ether;
        vm.prank(user1);
        (bool success,) = address(crowdFund).call{ value: amount }("");
        assertTrue(success);

        uint256 newBalance = crowdFund.balances(user1);
        assertEq(newBalance, startingBalance + amount);
    }
}
