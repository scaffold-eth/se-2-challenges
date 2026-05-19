// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { ORA } from "./OracleToken.sol";

interface IStakingOracle {
    // Errors
    error NodeNotRegistered();
    error InsufficientStake();
    error NodeAlreadyRegistered();
    error NoRewardsAvailable();
    error OnlyPastBucketsAllowed();
    error NodeAlreadySlashed();
    error AlreadyReportedInCurrentBucket();
    error NotDeviated();
    error WaitingPeriodNotOver();
    error InvalidPrice();
    error IndexOutOfBounds();
    error NodeNotAtGivenIndex();
    error TransferFailed();
    error MedianNotRecorded();
    error BucketMedianAlreadyRecorded();
    error NodeDidNotReport();

    // Events
    event NodeRegistered(address indexed node, uint256 stakedAmount);
    event PriceReported(address indexed node, uint256 price, uint256 bucketNumber);
    event BucketMedianRecorded(uint256 indexed bucketNumber, uint256 medianPrice);
    event NodeSlashed(address indexed node, uint256 amount);
    event NodeRewarded(address indexed node, uint256 amount);
    event StakeAdded(address indexed node, uint256 amount);
    event NodeExited(address indexed node, uint256 amount);

    // Functions
    function oracleToken() external view returns (ORA);
    function nodes(address) external view returns (uint256 stakedAmount, uint256 lastReportedBucket, uint256 reportCount, uint256 claimedReportCount, uint256 firstBucket, bool active);
    function nodeAddresses(uint256 index) external view returns (address);
    function MINIMUM_STAKE() external view returns (uint256);
    function BUCKET_WINDOW() external view returns (uint256);
    function SLASHER_REWARD_PERCENTAGE() external view returns (uint256);
    function REWARD_PER_REPORT() external view returns (uint256);
    function INACTIVITY_PENALTY() external view returns (uint256);
    function MISREPORT_PENALTY() external view returns (uint256);
    function MAX_DEVIATION_BPS() external view returns (uint256);
    function WAITING_PERIOD() external view returns (uint256);
    function registerNode(uint256 amount) external;
    function reportPrice(uint256 price) external;
    function claimReward() external;
    function addStake(uint256 amount) external;
    function recordBucketMedian(uint256 bucketNumber) external;
    function slashNode(address nodeToSlash, uint256 bucketNumber, uint256 reportIndex, uint256 nodeAddressesIndex) external;
    function exitNode(uint256 index) external;
    function getCurrentBucketNumber() external view returns (uint256);
    function getNodeAddresses() external view returns (address[] memory);
    function getLatestPrice() external view returns (uint256);
    function getPastPrice(uint256 bucketNumber) external view returns (uint256);
    function getSlashedStatus(address nodeAddress, uint256 bucketNumber) external view returns (uint256 price, bool slashed);
    function getEffectiveStake(address nodeAddress) external view returns (uint256);
    function getOutlierNodes(uint256 bucketNumber) external view returns (address[] memory);
}
