// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { Test } from "forge-std/Test.sol";
import { ORA } from "../contracts/01_Staking/OracleToken.sol";
import { StakingOracle } from "../contracts/01_Staking/StakingOracle.sol";
import { IStakingOracle } from "../contracts/01_Staking/IStakingOracle.sol";

contract StakingOracleTest is Test {
    ORA public oraToken;
    IStakingOracle public oracle;

    address public node1;
    address public node2;
    address public node3;
    address public node4;
    address public node5;
    address public node6;
    address public slasher;

    uint256 constant MINIMUM_STAKE = 100 ether;
    uint256 constant BUCKET_WINDOW = 24;
    uint256 constant INACTIVITY_PENALTY = 1 ether;
    uint256 constant MISREPORT_PENALTY = 100 ether;
    uint256 constant REWARD_PER_REPORT = 1 ether;
    uint256 constant SLASHER_REWARD_PERCENTAGE = 10;

    function setUp() public {
        node1 = makeAddr("node1");
        node2 = makeAddr("node2");
        node3 = makeAddr("node3");
        node4 = makeAddr("node4");
        node5 = makeAddr("node5");
        node6 = makeAddr("node6");
        slasher = makeAddr("slasher");

        vm.startPrank(node1);
        oraToken = new ORA();
        oracle = IStakingOracle(address(new StakingOracle(address(oraToken))));
        oraToken.transferOwnership(address(oracle));
        vm.stopPrank();
    }

    function _mineBuckets(uint256 count) internal {
        vm.roll(block.number + BUCKET_WINDOW * count);
    }

    function _moveToFreshBucket() internal {
        uint256 blockNum = block.number;
        uint256 toNext = (BUCKET_WINDOW - (blockNum % BUCKET_WINDOW)) % BUCKET_WINDOW;
        vm.roll(block.number + toNext + 1);
    }

    function _stakeForDelayedFirstReport() internal pure returns (uint256) {
        return MINIMUM_STAKE + 10 * INACTIVITY_PENALTY;
    }

    function _fundApproveAndRegister(address node, uint256 amount) internal {
        if (node != node1) {
            vm.prank(node1);
            oraToken.transfer(node, amount);
        }
        vm.startPrank(node);
        oraToken.approve(address(oracle), amount);
        oracle.registerNode(amount);
        vm.stopPrank();
    }

    function _indexOfNodeAddress(address addr) internal view returns (uint256) {
        address[] memory arr = oracle.getNodeAddresses();
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == addr) return i;
        }
        revert("Node not found");
    }

    // ============================================================
    // Checkpoint 2: StakingOracle
    // ============================================================

    function test_Checkpoint2_ConstructorWiresORAToken() public view {
        assertEq(address(oracle.oracleToken()), address(oraToken));
    }

    function test_Checkpoint2_ConstructorMintsORAToDeployer() public view {
        assertTrue(oraToken.balanceOf(node1) > 0);
    }

    function test_Checkpoint2_GetNodeAddressesReturnsAll() public {
        _fundApproveAndRegister(node1, MINIMUM_STAKE);
        _fundApproveAndRegister(node2, MINIMUM_STAKE);
        _fundApproveAndRegister(node3, MINIMUM_STAKE);

        address[] memory nodeAddresses = oracle.getNodeAddresses();
        assertEq(nodeAddresses.length, 3);
        assertEq(nodeAddresses[0], node1);
        assertEq(nodeAddresses[1], node2);
        assertEq(nodeAddresses[2], node3);
    }

    function test_Checkpoint2_RegisterWithMinStakeAndEmitEvent() public {
        vm.startPrank(node1);
        oraToken.approve(address(oracle), MINIMUM_STAKE);

        vm.recordLogs();
        oracle.registerNode(MINIMUM_STAKE);
        vm.stopPrank();

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("NodeRegistered(address,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "NodeRegistered event should be emitted");

        (uint256 stakedAmount,,,,, bool active) = oracle.nodes(node1);
        assertEq(stakedAmount, MINIMUM_STAKE);
        assertTrue(active);
    }

    function test_Checkpoint2_RejectInsufficientAndDuplicateRegistration() public {
        vm.startPrank(node1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InsufficientStake()"))));
        oracle.registerNode(MINIMUM_STAKE - 1);

        oraToken.approve(address(oracle), MINIMUM_STAKE);
        oracle.registerNode(MINIMUM_STAKE);

        oraToken.approve(address(oracle), MINIMUM_STAKE);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NodeAlreadyRegistered()"))));
        oracle.registerNode(MINIMUM_STAKE);
        vm.stopPrank();
    }

    function test_Checkpoint2_PriceReportingEmitsAndPreventsDouble() public {
        _fundApproveAndRegister(node1, _stakeForDelayedFirstReport());
        _mineBuckets(1);

        vm.startPrank(node1);
        vm.recordLogs();
        oracle.reportPrice(1600);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("PriceReported(address,uint256,uint256)")) {
                found = true;
            }
        }
        assertTrue(found, "PriceReported event should be emitted");

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AlreadyReportedInCurrentBucket()"))));
        oracle.reportPrice(1700);
        vm.stopPrank();
    }

    function test_Checkpoint2_RejectZeroPriceAndUnregisteredNode() public {
        _fundApproveAndRegister(node1, _stakeForDelayedFirstReport());

        vm.prank(node1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidPrice()"))));
        oracle.reportPrice(0);

        vm.prank(node2);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NodeNotRegistered()"))));
        oracle.reportPrice(1000);
    }

    function test_Checkpoint2_RejectWhenEffectiveStakeBelowMinimum() public {
        _fundApproveAndRegister(node2, MINIMUM_STAKE);
        _mineBuckets(1);

        vm.prank(node2);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InsufficientStake()"))));
        oracle.reportPrice(1600);
    }

    function test_Checkpoint2_ClaimRewardRevertsWhenNone() public {
        _fundApproveAndRegister(node1, _stakeForDelayedFirstReport());

        vm.prank(node1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NoRewardsAvailable()"))));
        oracle.claimReward();
    }

    function test_Checkpoint2_ClaimRewardMintsORAPerReport() public {
        _fundApproveAndRegister(node1, _stakeForDelayedFirstReport());
        _mineBuckets(1);

        vm.prank(node1);
        oracle.reportPrice(1600);

        uint256 beforeBal = oraToken.balanceOf(node1);
        vm.prank(node1);
        oracle.claimReward();
        uint256 afterBal = oraToken.balanceOf(node1);

        assertEq(afterBal - beforeBal, REWARD_PER_REPORT);

        vm.prank(node1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NoRewardsAvailable()"))));
        oracle.claimReward();
    }

    function test_Checkpoint2_AccumulateRewardsAcrossBuckets() public {
        _fundApproveAndRegister(node1, _stakeForDelayedFirstReport());
        _mineBuckets(1);

        vm.prank(node1);
        oracle.reportPrice(1600);
        _mineBuckets(1);

        vm.prank(node1);
        oracle.reportPrice(1700);

        uint256 beforeBal = oraToken.balanceOf(node1);
        vm.prank(node1);
        oracle.claimReward();
        uint256 afterBal = oraToken.balanceOf(node1);

        assertEq(afterBal - beforeBal, REWARD_PER_REPORT * 2);
    }

    function test_Checkpoint2_GetLatestPriceRevertsUntilRecorded() public {
        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _moveToFreshBucket();

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("MedianNotRecorded()"))));
        oracle.getLatestPrice();
    }

    function test_Checkpoint2_GetLatestPriceAfterRecordBucketMedian() public {
        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _moveToFreshBucket();

        _mineBuckets(1);
        uint256 bucketA = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1100);

        _mineBuckets(1);

        vm.prank(node6);
        oracle.recordBucketMedian(bucketA);

        uint256 latest = oracle.getLatestPrice();
        assertEq(latest, 1050);
    }

    function test_Checkpoint2_GetPastPriceReturnsMedian() public {
        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _moveToFreshBucket();

        _mineBuckets(1);
        uint256 bucketA = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1100);

        _mineBuckets(1);

        vm.prank(node6);
        oracle.recordBucketMedian(bucketA);

        uint256 pastMedian = oracle.getPastPrice(bucketA);
        assertEq(pastMedian, 1050);

        (uint256 p1,) = oracle.getSlashedStatus(node1, bucketA);
        (uint256 p2,) = oracle.getSlashedStatus(node2, bucketA);
        assertEq(p1, 1000);
        assertEq(p2, 1100);
    }

    function test_Checkpoint2_GetPastPriceRevertsForUnrecordedBucket() public {
        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _moveToFreshBucket();

        _mineBuckets(1);
        uint256 futureBucket = oracle.getCurrentBucketNumber();

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("MedianNotRecorded()"))));
        oracle.getPastPrice(futureBucket);
    }

    function test_Checkpoint2_EffectiveStakePenalizesAndAddStakeIncreases() public {
        _moveToFreshBucket();

        vm.startPrank(node1);
        oraToken.approve(address(oracle), MINIMUM_STAKE + 10);
        oracle.registerNode(MINIMUM_STAKE + 10);
        vm.stopPrank();

        _mineBuckets(2);

        uint256 eff1 = oracle.getEffectiveStake(node1);
        (uint256 stakedAmount,,,,,) = oracle.nodes(node1);
        assertEq(eff1, stakedAmount - 2 * INACTIVITY_PENALTY);

        uint256 addAmount = 500;
        vm.startPrank(node1);
        oraToken.approve(address(oracle), addAmount);
        oracle.addStake(addAmount);
        vm.stopPrank();

        uint256 eff2 = oracle.getEffectiveStake(node1);
        assertEq(eff2, stakedAmount + addAmount - 2 * INACTIVITY_PENALTY);
    }

    function test_Checkpoint2_RejectZeroStakeAddition() public {
        _moveToFreshBucket();

        vm.startPrank(node1);
        oraToken.approve(address(oracle), MINIMUM_STAKE + 10);
        oracle.registerNode(MINIMUM_STAKE + 10);
        vm.stopPrank();

        vm.prank(node1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InsufficientStake()"))));
        oracle.addStake(0);
    }

    function test_Checkpoint2_SlashRevertsCurrentBucketAndNonDeviated() public {
        _moveToFreshBucket();

        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, MINIMUM_STAKE);
        vm.prank(node3);
        oracle.reportPrice(1000);

        uint256 current = oracle.getCurrentBucketNumber();
        uint256 node3AddressesIndex = _indexOfNodeAddress(node3);

        vm.prank(slasher);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("OnlyPastBucketsAllowed()"))));
        oracle.slashNode(node3, current, 0, node3AddressesIndex);

        _mineBuckets(1);
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1050);

        _mineBuckets(1);
        vm.prank(node4);
        oracle.recordBucketMedian(bucketB);

        uint256 node3AddressesIndexB = _indexOfNodeAddress(node3);

        vm.prank(slasher);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NotDeviated()"))));
        oracle.slashNode(node3, bucketB, 2, node3AddressesIndexB);
    }

    function test_Checkpoint2_SlashDeviatedNodeRewardsSlasher() public {
        _moveToFreshBucket();

        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, MINIMUM_STAKE);
        vm.prank(node3);
        oracle.reportPrice(1000);

        // Add extra stake so node3 survives the slash
        uint256 extra = MINIMUM_STAKE;
        vm.prank(node1);
        oraToken.transfer(node3, extra);
        vm.startPrank(node3);
        oraToken.approve(address(oracle), extra);
        oracle.addStake(extra);
        vm.stopPrank();

        _mineBuckets(1);
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1200);

        _mineBuckets(1);
        vm.prank(node4);
        oracle.recordBucketMedian(bucketB);

        uint256 node3AddressesIndex = _indexOfNodeAddress(node3);
        uint256 slasherBalBefore = oraToken.balanceOf(slasher);

        vm.prank(slasher);
        oracle.slashNode(node3, bucketB, 2, node3AddressesIndex);

        uint256 expectedReward = (MISREPORT_PENALTY * SLASHER_REWARD_PERCENTAGE) / 100;
        uint256 slasherBalAfter = oraToken.balanceOf(slasher);
        assertEq(slasherBalAfter - slasherBalBefore, expectedReward);

        // Cannot slash again
        vm.prank(slasher);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NodeAlreadySlashed()"))));
        oracle.slashNode(node3, bucketB, 2, node3AddressesIndex);
    }

    function test_Checkpoint2_SlashRemovesNodeWhenStakeHitsZero() public {
        _moveToFreshBucket();

        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, MINIMUM_STAKE);
        vm.prank(node3);
        oracle.reportPrice(1000);

        _mineBuckets(1);
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1200);

        _mineBuckets(1);
        vm.prank(node4);
        oracle.recordBucketMedian(bucketB);

        uint256 node3AddressesIndex = _indexOfNodeAddress(node3);
        vm.prank(slasher);
        oracle.slashNode(node3, bucketB, 2, node3AddressesIndex);

        address[] memory addresses = oracle.getNodeAddresses();
        bool found = false;
        for (uint256 i = 0; i < addresses.length; i++) {
            if (addresses[i] == node3) found = true;
        }
        assertFalse(found, "node3 should be removed");

        (,,,,,bool active) = oracle.nodes(node3);
        assertFalse(active);
    }

    function test_Checkpoint2_SlashedFlagIsSetCorrectly() public {
        _moveToFreshBucket();

        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, MINIMUM_STAKE);
        vm.prank(node3);
        oracle.reportPrice(1000);

        _mineBuckets(1);
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1200);

        _mineBuckets(1);
        vm.prank(node4);
        oracle.recordBucketMedian(bucketB);

        uint256 node3AddressesIndex = _indexOfNodeAddress(node3);
        vm.prank(slasher);
        oracle.slashNode(node3, bucketB, 2, node3AddressesIndex);

        (uint256 price, bool slashedFlag) = oracle.getSlashedStatus(node3, bucketB);
        assertEq(price, 1200);
        assertTrue(slashedFlag);
    }

    function test_Checkpoint2_NoSlashAtExact10PercentThreshold() public {
        _moveToFreshBucket();

        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, MINIMUM_STAKE);
        vm.prank(node3);
        oracle.reportPrice(1000);

        // Top up node3 to handle inactivity penalties
        vm.prank(node1);
        oraToken.transfer(node3, MINIMUM_STAKE);
        vm.startPrank(node3);
        oraToken.approve(address(oracle), MINIMUM_STAKE);
        oracle.addStake(MINIMUM_STAKE);
        vm.stopPrank();

        _mineBuckets(1);
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1100); // Exactly 10% deviation

        _mineBuckets(1);
        vm.prank(node4);
        oracle.recordBucketMedian(bucketB);

        uint256 node3AddressesIndex = _indexOfNodeAddress(node3);
        vm.prank(slasher);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NotDeviated()"))));
        oracle.slashNode(node3, bucketB, 2, node3AddressesIndex);
    }

    function test_Checkpoint2_SlashRevertsIndexOutOfBounds() public {
        _moveToFreshBucket();

        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, MINIMUM_STAKE);
        vm.prank(node3);
        oracle.reportPrice(1000);

        _mineBuckets(1);
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1200);

        _mineBuckets(1);
        vm.prank(node4);
        oracle.recordBucketMedian(bucketB);

        address[] memory addresses = oracle.getNodeAddresses();
        uint256 invalidIndex = addresses.length;

        vm.prank(slasher);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("IndexOutOfBounds()"))));
        oracle.slashNode(node3, bucketB, 2, invalidIndex);
    }

    function test_Checkpoint2_SlashRevertsNodeNotAtGivenIndex() public {
        _moveToFreshBucket();

        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, MINIMUM_STAKE);
        vm.prank(node3);
        oracle.reportPrice(1000);

        _mineBuckets(1);
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1200);

        _mineBuckets(1);
        vm.prank(node4);
        oracle.recordBucketMedian(bucketB);

        uint256 node3AddressesIndex = _indexOfNodeAddress(node3);

        vm.prank(slasher);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NodeNotAtGivenIndex()"))));
        oracle.slashNode(node3, bucketB, 0, node3AddressesIndex);
    }

    function test_Checkpoint2_SlashRevertsMedianNotRecorded() public {
        _moveToFreshBucket();

        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, MINIMUM_STAKE);
        vm.prank(node3);
        oracle.reportPrice(1000);

        _moveToFreshBucket();
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1200);

        _mineBuckets(1);
        uint256 node3AddressesIndex = _indexOfNodeAddress(node3);

        vm.prank(slasher);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("MedianNotRecorded()"))));
        oracle.slashNode(node3, bucketB, 2, node3AddressesIndex);
    }

    function test_Checkpoint2_ExitNodeRevertsBeforeWaitingPeriod() public {
        _fundApproveAndRegister(node1, MINIMUM_STAKE);
        _fundApproveAndRegister(node2, MINIMUM_STAKE);

        uint256 idx = _indexOfNodeAddress(node1);

        vm.prank(node1);
        oracle.reportPrice(1500);

        vm.prank(node1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("WaitingPeriodNotOver()"))));
        oracle.exitNode(idx);
    }

    function test_Checkpoint2_ExitNodeReturnsEffectiveStake() public {
        _fundApproveAndRegister(node1, MINIMUM_STAKE);
        _fundApproveAndRegister(node2, MINIMUM_STAKE);

        vm.prank(node1);
        oracle.reportPrice(1500);

        _mineBuckets(2); // WAITING_PERIOD = 2

        uint256 effectiveStake = oracle.getEffectiveStake(node1);
        uint256 balBefore = oraToken.balanceOf(node1);
        uint256 idx = _indexOfNodeAddress(node1);

        vm.prank(node1);
        oracle.exitNode(idx);

        uint256 balAfter = oraToken.balanceOf(node1);
        assertEq(balAfter - balBefore, effectiveStake);

        // Verify node is removed
        address[] memory addresses = oracle.getNodeAddresses();
        for (uint256 i = 0; i < addresses.length; i++) {
            assertTrue(addresses[i] != node1);
        }

        assertEq(oracle.getEffectiveStake(node1), 0);
    }

    function test_Checkpoint2_ExitNodeRevertsIndexOutOfBounds() public {
        _fundApproveAndRegister(node1, MINIMUM_STAKE);
        _fundApproveAndRegister(node2, MINIMUM_STAKE);

        _mineBuckets(2);
        address[] memory addresses = oracle.getNodeAddresses();
        uint256 invalidIndex = addresses.length;

        vm.prank(node1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("IndexOutOfBounds()"))));
        oracle.exitNode(invalidIndex);
    }

    function test_Checkpoint2_ExitNodeRevertsNodeNotAtGivenIndex() public {
        _fundApproveAndRegister(node1, MINIMUM_STAKE);
        _fundApproveAndRegister(node2, MINIMUM_STAKE);

        _mineBuckets(2);
        uint256 idx2 = _indexOfNodeAddress(node2);

        vm.prank(node1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("NodeNotAtGivenIndex()"))));
        oracle.exitNode(idx2);
    }

    function test_Checkpoint2_GetOutlierNodesReturnsEmptyWhenNoOutliers() public {
        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, stake);
        _fundApproveAndRegister(node4, stake);
        _fundApproveAndRegister(node5, stake);
        _fundApproveAndRegister(node6, stake);

        _moveToFreshBucket();
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1000);
        vm.prank(node4);
        oracle.reportPrice(1000);
        vm.prank(node5);
        oracle.reportPrice(1000);
        vm.prank(node6);
        oracle.reportPrice(1000);

        _mineBuckets(1);
        vm.prank(slasher);
        oracle.recordBucketMedian(bucketB);

        address[] memory outliers = oracle.getOutlierNodes(bucketB);
        assertEq(outliers.length, 0);
    }

    function test_Checkpoint2_GetOutlierNodesReturnsDeviatedNodes() public {
        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, stake);
        _fundApproveAndRegister(node4, stake);
        _fundApproveAndRegister(node5, stake);
        _fundApproveAndRegister(node6, stake);

        _moveToFreshBucket();
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1000);
        vm.prank(node4);
        oracle.reportPrice(1200); // outlier
        vm.prank(node5);
        oracle.reportPrice(1000);
        vm.prank(node6);
        oracle.reportPrice(1000);

        _mineBuckets(1);
        vm.prank(slasher);
        oracle.recordBucketMedian(bucketB);

        address[] memory outliers = oracle.getOutlierNodes(bucketB);
        assertEq(outliers.length, 1);
        assertEq(outliers[0], node4);
    }

    function test_Checkpoint2_GetOutlierNodesExcludesNonReporters() public {
        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, stake);
        _fundApproveAndRegister(node4, stake);
        _fundApproveAndRegister(node5, stake);
        _fundApproveAndRegister(node6, stake);

        _moveToFreshBucket();
        uint256 bucketB = oracle.getCurrentBucketNumber();

        // Only 4 reporters (node3 and node6 don't report)
        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node4);
        oracle.reportPrice(1200); // outlier
        vm.prank(node5);
        oracle.reportPrice(1000);

        _mineBuckets(1);
        vm.prank(slasher);
        oracle.recordBucketMedian(bucketB);

        address[] memory outliers = oracle.getOutlierNodes(bucketB);
        assertEq(outliers.length, 1);
        assertEq(outliers[0], node4);
    }

    function test_Checkpoint2_GetOutlierNodesHandlesMultipleOutliers() public {
        uint256 stake = _stakeForDelayedFirstReport();
        _fundApproveAndRegister(node1, stake);
        _fundApproveAndRegister(node2, stake);
        _fundApproveAndRegister(node3, stake);
        _fundApproveAndRegister(node4, stake);
        _fundApproveAndRegister(node5, stake);
        _fundApproveAndRegister(node6, stake);

        _moveToFreshBucket();
        uint256 bucketB = oracle.getCurrentBucketNumber();

        vm.prank(node1);
        oracle.reportPrice(1000);
        vm.prank(node2);
        oracle.reportPrice(1000);
        vm.prank(node3);
        oracle.reportPrice(1000);
        vm.prank(node4);
        oracle.reportPrice(1400); // outlier
        vm.prank(node5);
        oracle.reportPrice(1400); // outlier
        vm.prank(node6);
        oracle.reportPrice(1000);

        _mineBuckets(1);
        vm.prank(slasher);
        oracle.recordBucketMedian(bucketB);

        address[] memory outliers = oracle.getOutlierNodes(bucketB);
        assertEq(outliers.length, 2);

        // Check both node4 and node5 are in outliers
        bool foundNode4 = false;
        bool foundNode5 = false;
        for (uint256 i = 0; i < outliers.length; i++) {
            if (outliers[i] == node4) foundNode4 = true;
            if (outliers[i] == node5) foundNode5 = true;
        }
        assertTrue(foundNode4);
        assertTrue(foundNode5);
    }
}
