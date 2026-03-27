//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "forge-std/Test.sol";
import "../contracts/Voting.sol";
import "../contracts/Verifier.sol";
import "../contracts/mocks/VerifierMock.sol";

contract VotingCheckpoint2Test is Test {
    Voting public voting;
    address public owner;
    address public alice;
    address public bob;

    function setUp() public {
        owner = makeAddr("owner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        vm.prank(owner);
        voting = new Voting(owner, address(0), "Should we build zk apps?");
    }

    function test_Checkpoint2_AllowsOnlyAllowlistedVotersToRegister() public {
        address[] memory voters = new address[](1);
        voters[0] = alice;
        bool[] memory statuses = new bool[](1);
        statuses[0] = true;

        vm.prank(owner);
        voting.addVoters(voters, statuses);

        uint256 commitment = 111;
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Voting.Voting__NotAllowedToVote.selector));
        voting.register(commitment);
    }

    function test_Checkpoint2_PreventsDuplicateCommitments() public {
        address[] memory voters = new address[](2);
        voters[0] = alice;
        voters[1] = bob;
        bool[] memory statuses = new bool[](2);
        statuses[0] = true;
        statuses[1] = true;

        vm.prank(owner);
        voting.addVoters(voters, statuses);

        uint256 duplicateCommitment = 222;

        vm.prank(alice);
        voting.register(duplicateCommitment);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Voting.Voting__CommitmentAlreadyAdded.selector, duplicateCommitment));
        voting.register(duplicateCommitment);
    }

    function test_Checkpoint2_AllowsOnlyOneTimeRegistrationPerVoter() public {
        address[] memory voters = new address[](1);
        voters[0] = alice;
        bool[] memory statuses = new bool[](1);
        statuses[0] = true;

        vm.prank(owner);
        voting.addVoters(voters, statuses);

        vm.prank(alice);
        voting.register(333);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Voting.Voting__NotAllowedToVote.selector));
        voting.register(444);
    }

    function test_Checkpoint2_LeafWithCommitmentGetsAddedToTree() public {
        address[] memory voters = new address[](1);
        voters[0] = alice;
        bool[] memory statuses = new bool[](1);
        statuses[0] = true;

        vm.prank(owner);
        voting.addVoters(voters, statuses);

        (,,,, uint256 sizeBefore,,) = voting.getVotingData();
        assertEq(sizeBefore, 0);

        uint256 commitment = 555;
        vm.prank(alice);
        voting.register(commitment);

        (,,,, uint256 sizeAfter,, uint256 rootAfter) = voting.getVotingData();
        assertEq(sizeAfter, 1);
        assertEq(rootAfter, commitment);
    }

    function test_Checkpoint2_EmitsCorrectNewLeafEvent() public {
        address[] memory voters = new address[](1);
        voters[0] = alice;
        bool[] memory statuses = new bool[](1);
        statuses[0] = true;

        vm.prank(owner);
        voting.addVoters(voters, statuses);

        uint256 commitment = 666;

        vm.expectEmit(false, false, false, true);
        emit Voting.NewLeaf(0, commitment);

        vm.prank(alice);
        voting.register(commitment);
    }
}

contract VotingCheckpoint6Test is Test {
    Voting public voting;
    VerifierMock public verifier;
    address public owner;
    address public alice;
    address public bob;
    bytes32 public rootAfter;
    bytes32 public depthAfter;

    function setUp() public {
        owner = makeAddr("owner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        verifier = new VerifierMock();

        vm.prank(owner);
        voting = new Voting(owner, address(verifier), "Question?");

        // Allowlist and register alice to set a non-zero root
        address[] memory voters = new address[](1);
        voters[0] = alice;
        bool[] memory statuses = new bool[](1);
        statuses[0] = true;

        vm.prank(owner);
        voting.addVoters(voters, statuses);

        uint256 commitment = 123;
        vm.prank(alice);
        voting.register(commitment);

        (,,,, , uint256 depthNum, uint256 rootNum) = voting.getVotingData();
        rootAfter = bytes32(rootNum);
        depthAfter = bytes32(depthNum);
    }

    function test_Checkpoint6_PreventsDoubleVotingViaNullifierReuse() public {
        bytes32 nullifier = bytes32(0);
        bytes32 yesVote = bytes32(uint256(1));
        bytes memory dummyProof = new bytes(32 * 440);

        verifier.setExpectedInputs(nullifier, rootAfter, yesVote, depthAfter);
        verifier.setShouldVerify(true);

        vm.prank(alice);
        voting.vote(dummyProof, nullifier, rootAfter, yesVote, depthAfter);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Voting.Voting__NullifierHashAlreadyUsed.selector, nullifier));
        voting.vote(dummyProof, nullifier, rootAfter, yesVote, depthAfter);
    }

    function test_Checkpoint6_RevertsOnInvalidProof() public {
        bytes32 nullifier = keccak256("random-nullifier");
        bytes32 yesVote = bytes32(uint256(1));
        bytes memory dummyProof = new bytes(32 * 440);

        verifier.setShouldVerify(false);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Voting.Voting__InvalidProof.selector));
        voting.vote(dummyProof, nullifier, rootAfter, yesVote, depthAfter);
    }

    function test_Checkpoint6_IncrementsYesNoVoteCountsCorrectly() public {
        // Register bob too
        address[] memory voters = new address[](1);
        voters[0] = bob;
        bool[] memory statuses = new bool[](1);
        statuses[0] = true;

        vm.prank(owner);
        voting.addVoters(voters, statuses);

        vm.prank(bob);
        voting.register(456);

        // Get updated root after both registrations
        (,,,, , uint256 depthNum2, uint256 rootNum2) = voting.getVotingData();
        bytes32 root2 = bytes32(rootNum2);
        bytes32 depth2 = bytes32(depthNum2);

        bytes memory proof = new bytes(32 * 440);
        bytes32 yes = bytes32(uint256(1));
        bytes32 no = bytes32(uint256(0));

        // Alice votes yes
        bytes32 n1 = keccak256("nullifier1");
        verifier.setExpectedInputs(n1, root2, yes, depth2);
        verifier.setShouldVerify(true);

        vm.prank(alice);
        voting.vote(proof, n1, root2, yes, depth2);

        // Bob votes no
        bytes32 n2 = keccak256("nullifier2");
        verifier.setExpectedInputs(n2, root2, no, depth2);

        vm.prank(bob);
        voting.vote(proof, n2, root2, no, depth2);

        (,, uint256 yesVotes, uint256 noVotes,,,) = voting.getVotingData();
        assertEq(yesVotes, 1);
        assertEq(noVotes, 1);
    }

    function test_Checkpoint6_EmitsVoteCastWithCorrectFields() public {
        bytes memory proof = new bytes(32 * 440);
        bytes32 yes = bytes32(uint256(1));
        bytes32 nullifier = keccak256("vote-nullifier");

        verifier.setExpectedInputs(nullifier, rootAfter, yes, depthAfter);
        verifier.setShouldVerify(true);

        vm.expectEmit(true, true, false, false);
        emit Voting.VoteCast(nullifier, alice, true, block.timestamp, 1, 0);

        vm.prank(alice);
        voting.vote(proof, nullifier, rootAfter, yes, depthAfter);
    }

    function test_Checkpoint6_RevertsWhenRootIsEmpty() public {
        bytes memory proof = new bytes(32 * 440);
        bytes32 yes = bytes32(uint256(1));
        bytes32 nullifier = keccak256("empty-root-nullifier");
        bytes32 emptyRoot = bytes32(0);

        verifier.setExpectedInputs(nullifier, emptyRoot, yes, depthAfter);
        verifier.setShouldVerify(true);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Voting.Voting__EmptyTree.selector));
        voting.vote(proof, nullifier, emptyRoot, yes, depthAfter);
    }

    function test_Checkpoint6_RevertsWhenRootDoesntMatchTreeRoot() public {
        bytes memory proof = new bytes(32 * 440);
        bytes32 yes = bytes32(uint256(1));
        bytes32 nullifier = keccak256("invalid-root-nullifier");
        bytes32 invalidRoot = keccak256("not-real-root");

        verifier.setExpectedInputs(nullifier, invalidRoot, yes, depthAfter);
        verifier.setShouldVerify(true);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Voting.Voting__InvalidRoot.selector));
        voting.vote(proof, nullifier, invalidRoot, yes, depthAfter);
    }
}
