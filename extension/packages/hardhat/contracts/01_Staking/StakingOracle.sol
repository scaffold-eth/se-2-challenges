// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./OracleToken.sol";
import { StatisticsUtils } from "../utils/StatisticsUtils.sol";

contract StakingOracle {
    using StatisticsUtils for uint256[];

    error NodeNotRegistered();
    error InsufficientStake();
    error NodeAlreadyRegistered();
    error NotEnoughStake();
    error NoRewardsAvailable();
    error FailedToSendReward();
    error NoValidPricesAvailable();

    ORA public oracleToken;

    struct OracleNode {
        address nodeAddress;
        uint256 stakedAmount;
        uint256 lastReportedPrice;
        uint256 lastReportedTimestamp;
        uint256 lastClaimedTimestamp;
        uint256 lastSlashedTimestamp;
    }

    mapping(address => OracleNode) public nodes;
    address[] public nodeAddresses;

    uint256 public constant MINIMUM_STAKE = 1 ether;
    uint256 public constant STALE_DATA_WINDOW = 5 seconds;
    uint256 public constant SLASHER_REWARD_PERCENTAGE = 10;

    event NodeRegistered(address indexed node, uint256 stakedAmount);
    event PriceReported(address indexed node, uint256 price);

    event NodeSlashed(address indexed node, uint256 amount);
    event NodeRewarded(address indexed node, uint256 amount);

    event NodesValidated();

    address public oracleTokenAddress;

    modifier onlyNode() {
        if (nodes[msg.sender].nodeAddress == address(0)) revert NodeNotRegistered();
        _;
    }

    constructor() {
        oracleToken = new ORA();
    }

    /* ========== Oracle Node Operation Functions ========== */
    function registerNode(uint256 initialPrice) public payable {
        if (msg.value < MINIMUM_STAKE) revert InsufficientStake();
        if (nodes[msg.sender].nodeAddress != address(0)) revert NodeAlreadyRegistered();

        nodes[msg.sender] = OracleNode({
            nodeAddress: msg.sender,
            stakedAmount: msg.value,
            lastReportedPrice: initialPrice,
            lastReportedTimestamp: block.timestamp,
            lastClaimedTimestamp: block.timestamp,
            lastSlashedTimestamp: 0
        });

        nodeAddresses.push(msg.sender);

        emit NodeRegistered(msg.sender, msg.value);
        emit PriceReported(msg.sender, initialPrice);
    }

    function reportPrice(uint256 price) public onlyNode {
        OracleNode storage node = nodes[msg.sender];
        if (node.stakedAmount < MINIMUM_STAKE) revert NotEnoughStake();
        node.lastReportedPrice = price;
        node.lastReportedTimestamp = block.timestamp;

        emit PriceReported(msg.sender, price);
    }

    function rewardNode(address nodeAddress, uint256 reward) internal {
        oracleToken.mint(nodeAddress, reward);
        emit NodeRewarded(nodeAddress, reward);
    }

    function slashNode(address nodeToSlash, uint256 penalty) internal returns (uint256) {
        OracleNode storage node = nodes[nodeToSlash];
        uint256 actualPenalty = penalty > node.stakedAmount ? node.stakedAmount : penalty;
        node.stakedAmount -= actualPenalty;

        uint256 reward = (actualPenalty * SLASHER_REWARD_PERCENTAGE) / 100;

        emit NodeSlashed(nodeToSlash, actualPenalty);

        return reward;
    }

    function claimReward() public onlyNode {
        OracleNode memory node = nodes[msg.sender];
        uint256 rewardAmount = 0;

        if (node.stakedAmount < MINIMUM_STAKE) {
            if (node.lastClaimedTimestamp < node.lastSlashedTimestamp) {
                rewardAmount = node.lastSlashedTimestamp - node.lastClaimedTimestamp;
            }
        } else {
            rewardAmount = block.timestamp - node.lastClaimedTimestamp;
        }

        if (rewardAmount == 0) revert NoRewardsAvailable();

        nodes[msg.sender].lastClaimedTimestamp = block.timestamp;
        rewardNode(msg.sender, rewardAmount * 10 ** 18);
    }

    function slashNodes() public {
        (, address[] memory addressesToSlash) = separateStaleNodes(nodeAddresses);
        uint256 slasherReward;
        for (uint i = 0; i < addressesToSlash.length; i++) {
            slasherReward += slashNode(addressesToSlash[i], 1 ether);
        }

        (bool sent, ) = msg.sender.call{ value: slasherReward }("");
        if (!sent) revert FailedToSendReward();
    }

    function separateStaleNodes(
        address[] memory nodesToSeparate
    ) public view returns (address[] memory fresh, address[] memory stale) {
        address[] memory freshNodeAddresses = new address[](nodesToSeparate.length);
        address[] memory staleNodeAddresses = new address[](nodesToSeparate.length);
        uint256 freshCount = 0;
        uint256 staleCount = 0;

        for (uint i = 0; i < nodesToSeparate.length; i++) {
            address nodeAddress = nodesToSeparate[i];
            OracleNode memory node = nodes[nodeAddress];
            uint256 timeElapsed = block.timestamp - node.lastReportedTimestamp;
            bool dataIsStale = timeElapsed > STALE_DATA_WINDOW;

            if (dataIsStale) {
                staleNodeAddresses[staleCount] = nodeAddress;
                staleCount++;
            } else {
                freshNodeAddresses[freshCount] = nodeAddress;
                freshCount++;
            }
        }

        address[] memory trimmedFreshNodes = new address[](freshCount);
        address[] memory trimmedStaleNodes = new address[](staleCount);

        for (uint i = 0; i < freshCount; i++) {
            trimmedFreshNodes[i] = freshNodeAddresses[i];
        }
        for (uint i = 0; i < staleCount; i++) {
            trimmedStaleNodes[i] = staleNodeAddresses[i];
        }

        return (trimmedFreshNodes, trimmedStaleNodes);
    }

    function getPricesFromAddresses(address[] memory addresses) internal view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](addresses.length);

        for (uint256 i = 0; i < addresses.length; i++) {
            OracleNode memory node = nodes[addresses[i]];
            prices[i] = node.lastReportedPrice;
        }

        return prices;
    }

    function getPrice() public view returns (uint256) {
        (address[] memory validAddresses, ) = separateStaleNodes(nodeAddresses);
        uint256[] memory validPrices = getPricesFromAddresses(validAddresses);
        if (validPrices.length == 0) revert NoValidPricesAvailable();
        
        validPrices.sort();
        return validPrices.getMedian();
    }

    function getNodeAddresses() public view returns (address[] memory) {
        return nodeAddresses;
    }

    // Notably missing a way to unstake and exit your node but not needed for the challenge
}
