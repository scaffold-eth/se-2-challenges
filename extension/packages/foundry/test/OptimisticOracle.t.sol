// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { Test, Vm } from "forge-std/Test.sol";
import { OptimisticOracle } from "../contracts/02_Optimistic/OptimisticOracle.sol";
import { IOptimisticOracle } from "../contracts/02_Optimistic/IOptimisticOracle.sol";
import { Decider } from "../contracts/02_Optimistic/Decider.sol";

contract OptimisticOracleTest is Test {
    IOptimisticOracle public optimisticOracle;
    Decider public deciderContract;

    address public owner;
    address public asserter;
    address public proposer;
    address public disputer;
    address public otherUser;

    function setUp() public {
        owner = address(this);
        asserter = makeAddr("asserter");
        proposer = makeAddr("proposer");
        disputer = makeAddr("disputer");
        otherUser = makeAddr("otherUser");

        vm.deal(asserter, 100 ether);
        vm.deal(proposer, 100 ether);
        vm.deal(disputer, 100 ether);
        vm.deal(otherUser, 100 ether);

        // Deploy OptimisticOracle with owner as temporary decider
        optimisticOracle = IOptimisticOracle(address(new OptimisticOracle(owner)));

        // Deploy Decider
        deciderContract = new Decider(address(optimisticOracle));

        // Set the decider in the oracle
        optimisticOracle.setDecider(address(deciderContract));
    }

    function _assertEvent(string memory description, uint256 reward) internal returns (uint256) {
        vm.prank(asserter);
        uint256 assertionId = optimisticOracle.assertEvent{ value: reward }(description, 0, 0);
        return assertionId;
    }

    function _assertEventWithTimes(
        string memory description,
        uint256 reward,
        uint256 startTime,
        uint256 endTime
    ) internal returns (uint256) {
        vm.prank(asserter);
        uint256 assertionId = optimisticOracle.assertEvent{ value: reward }(description, startTime, endTime);
        return assertionId;
    }

    // ============================================================
    // Checkpoint 4: Deployment, Event Assertion, Proposal, Dispute
    // ============================================================

    function test_Checkpoint4_DeploySuccessfully() public view {
        assertTrue(address(optimisticOracle) != address(0));
    }

    function test_Checkpoint4_CorrectOwner() public view {
        assertEq(optimisticOracle.owner(), owner);
    }

    function test_Checkpoint4_CorrectConstants() public view {
        assertEq(optimisticOracle.MINIMUM_ASSERTION_WINDOW(), 180); // 3 minutes
        assertEq(optimisticOracle.DISPUTE_WINDOW(), 180); // 3 minutes
    }

    function test_Checkpoint4_StartsWithNextAssertionId1() public view {
        assertEq(optimisticOracle.nextAssertionId(), 1);
    }

    function test_Checkpoint4_FirstAssertionReturnsId1() public {
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m by end of 2026?", 1 ether);
        assertEq(assertionId, 1);
    }

    function test_Checkpoint4_AssertEventEmitsEvent() public {
        vm.recordLogs();
        _assertEvent("Will Bitcoin reach $1m by end of 2026?", 1 ether);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("EventAsserted(uint256,address,string,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "EventAsserted event should be emitted");
    }

    function test_Checkpoint4_RejectZeroRewardAssertion() public {
        vm.prank(asserter);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidValue()"))));
        optimisticOracle.assertEvent{ value: 0 }("Will Bitcoin reach $1m?", 0, 0);
    }

    function test_Checkpoint4_ProposeOutcomeWithCorrectBond() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        vm.recordLogs();
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("OutcomeProposed(uint256,address,bool)")) {
                found = true;
            }
        }
        assertTrue(found, "OutcomeProposed event should be emitted");
    }

    function test_Checkpoint4_RejectProposalWithWrongBond() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidValue()"))));
        optimisticOracle.proposeOutcome{ value: 0.05 ether }(assertionId, true);
    }

    function test_Checkpoint4_RejectDuplicateProposal() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(otherUser);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AssertionProposed()"))));
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, false);
    }

    function test_Checkpoint4_DisputeOutcomeWithCorrectBond() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(disputer);
        vm.recordLogs();
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("OutcomeDisputed(uint256,address)")) {
                found = true;
            }
        }
        assertTrue(found, "OutcomeDisputed event should be emitted");
    }

    function test_Checkpoint4_RejectDisputeWithWrongBond() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(disputer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidValue()"))));
        optimisticOracle.disputeOutcome{ value: 0.05 ether }(assertionId);
    }

    function test_Checkpoint4_RejectDisputeAfterDeadline() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        // Fast forward past dispute window
        vm.warp(block.timestamp + 181);

        vm.prank(disputer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidTime()"))));
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);
    }

    function test_Checkpoint4_RejectDuplicateDispute() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(disputer);
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);

        vm.prank(otherUser);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("ProposalDisputed()"))));
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);
    }

    function test_Checkpoint4_RejectProposalBeforeStartTime() public {
        uint256 reward = 1 ether;
        uint256 start = block.timestamp + 1000;
        uint256 end = start + 1000;

        uint256 assertionId = _assertEventWithTimes("future event", reward, start, end);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidTime()"))));
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);
    }

    function test_Checkpoint4_RejectProposalAfterEndTime() public {
        uint256 reward = 1 ether;
        uint256 start = block.timestamp + 1;
        uint256 end = block.timestamp + 200;

        uint256 assertionId = _assertEventWithTimes("short event", reward, start, end);

        // Fast forward past endTime
        vm.warp(block.timestamp + 201);

        uint256 bond = reward * 2;
        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidTime()"))));
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);
    }

    function test_Checkpoint4_ProposalOnlyWithinWindow() public {
        uint256 reward = 1 ether;
        uint256 start = block.timestamp + 10;
        uint256 end = start + 200;

        uint256 assertionId = _assertEventWithTimes("window event", reward, start, end);
        uint256 bond = reward * 2;

        // Before startTime - should fail
        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidTime()"))));
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        // Move to startTime
        vm.warp(block.timestamp + 10);

        // Now it should work
        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);
    }

    // ============================================================
    // Checkpoint 5: Rewards and Refunds
    // ============================================================

    function test_Checkpoint5_ClaimUndisputedRewardAfterDeadline() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        // Fast forward past dispute window
        vm.warp(block.timestamp + 181);

        uint256 initialBalance = proposer.balance;
        vm.prank(proposer);
        optimisticOracle.claimUndisputedReward(assertionId);
        uint256 finalBalance = proposer.balance;

        // Proposer should receive reward + bond = 3 ether
        assertEq(finalBalance - initialBalance, reward + bond);
    }

    function test_Checkpoint5_RejectClaimBeforeDeadline() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidTime()"))));
        optimisticOracle.claimUndisputedReward(assertionId);
    }

    function test_Checkpoint5_RejectClaimWhenDisputed() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(disputer);
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("ProposalDisputed()"))));
        optimisticOracle.claimUndisputedReward(assertionId);
    }

    function test_Checkpoint5_RejectDoubleClaimUndisputed() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.warp(block.timestamp + 181);

        vm.prank(proposer);
        optimisticOracle.claimUndisputedReward(assertionId);

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AlreadyClaimed()"))));
        optimisticOracle.claimUndisputedReward(assertionId);
    }

    function test_Checkpoint5_ClaimDisputedRewardProposerWins() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(disputer);
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);

        // Settle with proposer winning
        deciderContract.settleDispute(assertionId, true);

        uint256 initialBalance = proposer.balance;
        vm.prank(proposer);
        optimisticOracle.claimDisputedReward(assertionId);
        uint256 finalBalance = proposer.balance;

        // Proposer wins: reward * 3 (reward + proposer bond + part of disputer bond)
        assertEq(finalBalance - initialBalance, reward * 3);
    }

    function test_Checkpoint5_ClaimDisputedRewardDisputerWins() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(disputer);
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);

        // Settle with disputer winning
        deciderContract.settleDispute(assertionId, false);

        uint256 initialBalance = disputer.balance;
        vm.prank(disputer);
        optimisticOracle.claimDisputedReward(assertionId);
        uint256 finalBalance = disputer.balance;

        // Disputer wins: reward * 3
        assertEq(finalBalance - initialBalance, reward * 3);
    }

    function test_Checkpoint5_RejectClaimDisputedBeforeSettlement() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(disputer);
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AwaitingDecider()"))));
        optimisticOracle.claimDisputedReward(assertionId);
    }

    function test_Checkpoint5_RejectDoubleClaimDisputed() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(disputer);
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);

        deciderContract.settleDispute(assertionId, true);

        vm.prank(proposer);
        optimisticOracle.claimDisputedReward(assertionId);

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AlreadyClaimed()"))));
        optimisticOracle.claimDisputedReward(assertionId);
    }

    function test_Checkpoint5_ClaimRefundNoProposals() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);

        vm.warp(block.timestamp + 181);

        uint256 initialBalance = asserter.balance;
        vm.prank(asserter);
        optimisticOracle.claimRefund(assertionId);
        uint256 finalBalance = asserter.balance;

        assertEq(finalBalance - initialBalance, reward);
    }

    function test_Checkpoint5_RejectRefundWhenProposed() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(asserter);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AssertionProposed()"))));
        optimisticOracle.claimRefund(assertionId);
    }

    function test_Checkpoint5_RejectDoubleRefund() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);

        vm.warp(block.timestamp + 181);

        vm.prank(asserter);
        optimisticOracle.claimRefund(assertionId);

        vm.prank(asserter);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AlreadyClaimed()"))));
        optimisticOracle.claimRefund(assertionId);
    }

    // ============================================================
    // Checkpoint 6: Settlement and State Management
    // ============================================================

    function test_Checkpoint6_DeciderSettlesDispute() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(disputer);
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);

        vm.recordLogs();
        deciderContract.settleDispute(assertionId, true);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("AssertionSettled(uint256,bool,address)")) {
                found = true;
            }
        }
        assertTrue(found, "AssertionSettled event should be emitted");

        // State should be Settled (4)
        IOptimisticOracle.State state = optimisticOracle.getState(assertionId);
        assertEq(uint256(state), 4);
    }

    function test_Checkpoint6_RejectSettlementByNonDecider() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.prank(disputer);
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);

        vm.prank(otherUser);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("OnlyDecider()"))));
        optimisticOracle.settleAssertion(assertionId, true);
    }

    function test_Checkpoint6_RejectSettlingUndisputedAssertion() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NotDisputedAssertion()"))));
        deciderContract.settleDispute(assertionId, true);
    }

    function test_Checkpoint6_StateTransitions() public {
        // Invalid state for non-existent assertion
        IOptimisticOracle.State state = optimisticOracle.getState(999);
        assertEq(uint256(state), 0); // Invalid

        // Asserted state
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Bitcoin reach $1m?", reward);
        state = optimisticOracle.getState(assertionId);
        assertEq(uint256(state), 1); // Asserted

        // Proposed state
        uint256 bond = reward * 2;
        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);
        state = optimisticOracle.getState(assertionId);
        assertEq(uint256(state), 2); // Proposed

        // Disputed state
        vm.prank(disputer);
        optimisticOracle.disputeOutcome{ value: bond }(assertionId);
        state = optimisticOracle.getState(assertionId);
        assertEq(uint256(state), 3); // Disputed

        // Settled state
        deciderContract.settleDispute(assertionId, true);
        state = optimisticOracle.getState(assertionId);
        assertEq(uint256(state), 4); // Settled
    }

    function test_Checkpoint6_SettledStateForUndisputedAfterWindow() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Ethereum reach $10k?", reward);
        uint256 bond = reward * 2;

        vm.prank(proposer);
        optimisticOracle.proposeOutcome{ value: bond }(assertionId, true);

        vm.warp(block.timestamp + 181);

        IOptimisticOracle.State state = optimisticOracle.getState(assertionId);
        assertEq(uint256(state), 4); // Settled
    }

    function test_Checkpoint6_ExpiredStateNoProposals() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Ethereum reach $10k?", reward);

        vm.warp(block.timestamp + 181);

        IOptimisticOracle.State state = optimisticOracle.getState(assertionId);
        assertEq(uint256(state), 5); // Expired
    }

    function test_Checkpoint6_GetResolutionRevertsForExpired() public {
        uint256 reward = 1 ether;
        uint256 assertionId = _assertEvent("Will Ethereum reach $10k?", reward);

        vm.warp(block.timestamp + 181);

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NotProposedAssertion()"))));
        optimisticOracle.getResolution(assertionId);
    }

    receive() external payable {}
}
