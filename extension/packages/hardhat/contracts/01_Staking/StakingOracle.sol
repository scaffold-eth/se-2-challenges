// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./OracleToken.sol";
import { StatisticsUtils } from "../utils/StatisticsUtils.sol";

contract StakingOracle {
    using StatisticsUtils for uint256[];

    /////////////////
    /// Errors //////
    /////////////////

    error NodeNotRegistered();
    error InsufficientStake();
    error NodeAlreadyRegistered();
    error NoRewardsAvailable();
    error FailedToSend();
    error NoValidPricesAvailable();
    error OnlyPastBucketsAllowed();
    error NodeAlreadySlashed();
    error AlreadyReportedInCurrentBucket();
    error NotDeviated();
    error WaitingPeriodNotOver();
    error NodeDidNotReport();
    error InvalidPrice();
    error IndexOutOfBounds();
    error NodeNotAtGivenIndex();

    //////////////////////
    /// State Variables //
    //////////////////////

    ORA public oracleToken;

    struct OracleNode {
        uint256 stakedAmount;
        uint256 lastReportedBucket;
        uint256 reportCount;
        uint256 claimedReportCount;
        uint256 firstBucket; // block when node registered
        bool active;
    }

    struct TimeBucket {
        mapping(address => uint256) prices;
        mapping(address => bool) slashedOffenses;
        uint256 countReports;
        uint256 sumPrices;
    }

    mapping(address => OracleNode) public nodes;
    mapping(uint256 => TimeBucket) public timeBuckets; // one bucket per 24 blocks
    address[] public nodeAddresses;

    uint256 public constant MINIMUM_STAKE = 1 ether;
    uint256 public constant BUCKET_WINDOW = 24 seconds;
    uint256 public constant SLASHER_REWARD_PERCENTAGE = 10;
    uint256 public constant REWARD_PER_REPORT = 1 ether; // ORA Token reward per report
    uint256 public constant INACTIVITY_PENALTY = 0.01 ether;
    uint256 public constant MISREPORT_PENALTY = 1 ether;
    uint256 public constant MAX_DEVIATION_BPS = 1000; // 10% default threshold
    uint256 public constant WAITING_PERIOD = 2; // 2 buckets

    ////////////////
    /// Events /////
    ////////////////

    event NodeRegistered(address indexed node, uint256 stakedAmount);
    event PriceReported(address indexed node, uint256 price, uint256 bucketNumber);
    event NodeSlashed(address indexed node, uint256 amount);
    event NodeRewarded(address indexed node, uint256 amount);
    event StakeAdded(address indexed node, uint256 amount);
    event NodeExited(address indexed node, uint256 amount);

    address public oracleTokenAddress;

    ///////////////////
    /// Modifiers /////
    ///////////////////

    /**
     * @notice Modifier to restrict function access to registered oracle nodes
     * @dev Checks if the sender has a registered node in the mapping
     */
    modifier onlyNode() {
        if (nodes[msg.sender].active == false) revert NodeNotRegistered();
        _;
    }

    ///////////////////
    /// Constructor ///
    ///////////////////

    constructor() {
        oracleToken = new ORA();
    }

    ///////////////////
    /// Functions /////
    ///////////////////

    /**
     * @notice Registers a new oracle node with initial ETH stake and price
     * @dev Creates a new OracleNode struct and adds the sender to the nodeAddresses array.
     *      Requires minimum stake amount and prevents duplicate registrations.
     * @param initialPrice The initial price value this oracle node will report
     */
    function registerNode(uint256 initialPrice) public payable {}

    /**
     * @notice Updates the price reported by an oracle node (only registered nodes)
     * @dev Updates the node's lastReportedBucket and price in that bucket. Requires sufficient stake.
     * @param price The new price value to report
     */
    function reportPrice(uint256 price) public onlyNode {}

    /**
     * @notice Allows active and inactive nodes to claim accumulated ORA token rewards
     * @dev Calculates rewards based on time elapsed since last claim.
     */
    function claimReward() public {}

    /**
     * @notice Allows a registered node to increase its stake
     * @dev Increases the sender's stakedAmount by msg.value
     */
    function addStake() public payable onlyNode {}

    /**
     * @notice Slashes a node for giving a price that is deviated too far from the average excluding it's own reported price
     */
    function slashNode(address nodeToSlash, uint256 bucketNumber, uint256 index) public {}

    function exitNode(uint256 index) public onlyNode {}

    ////////////////////////
    /// View Functions /////
    ////////////////////////

    /**
     * @notice Returns the list of registered oracle node addresses
     * @return Array of registered oracle node addresses
     */
    function getNodeAddresses() public view returns (address[] memory) {}

    /**
     * @notice Returns the aggregated price from all active oracle nodes using median calculation
     * @dev Filters out stale nodes, extracts their prices, sorts them, and calculates median.
     *      Uses StatisticsUtils for sorting and median calculation.
     * @return The median price from all nodes with fresh data
     */
    function getLatestPrice() public view returns (uint256) {}

    /**
     * @notice Returns the average price from a past bucket
     * @param bucketNumber The bucket number to get the average price from
     * @return The average price from the bucket
     */
    function getPastPrice(uint256 bucketNumber) public view returns (uint256) {}

    /**
     * @notice Returns the price and slashed status of a node at a given bucket
     * @param nodeAddress The address of the node to get the data for
     * @param bucketNumber The bucket number to get the data from
     * @return The price and slashed status of the node at the bucket
     */
    function getAddressDataAtBucket(address nodeAddress, uint256 bucketNumber) public view returns (uint256, bool) {}

    /**
     * @notice Returns the current bucket number
     * @dev Returns the current bucket number based on the block number
     * @return The current bucket number
     */
    function getCurrentBucketNumber() public view returns (uint256) {}

    /**
     * @notice Returns the effective stake accounting for inactivity penalties via missed buckets
     * @dev Effective stake = stakedAmount - (missedBuckets * INACTIVITY_PENALTY), floored at 0
     */
    function getEffectiveStake(address nodeAddress) public view returns (uint256) {}

    /**
     * @notice Returns the addresses of nodes in a bucket whose reported price deviates beyond the threshold
     * @param bucketNumber The bucket number to get the outliers from
     * @return Array of node addresses considered outliers
     */
    function getOutlierNodes(uint256 bucketNumber) public view returns (address[] memory) {}

    //////////////////////////
    /// Internal Functions ///
    //////////////////////////

    /**
     * @notice Removes a node from the nodeAddresses array
     * @param nodeAddress The address of the node to remove
     * @param index The index of the node to remove
     */
    function _removeNode(address nodeAddress, uint256 index) internal {}

    /**
     * @notice Checks if the price deviation is greater than the threshold
     * @param reportedPrice The price reported by the node
     * @param averagePrice The average price of the bucket
     * @return True if the price deviation is greater than the threshold, false otherwise
     */
    function _checkPriceDeviated(uint256 reportedPrice, uint256 averagePrice) internal pure returns (bool) {}
}
