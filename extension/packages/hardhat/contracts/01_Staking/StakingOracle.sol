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
    function registerNode(uint256 initialPrice) public payable {
        if (msg.value < MINIMUM_STAKE) revert InsufficientStake();
        if (nodes[msg.sender].active) revert NodeAlreadyRegistered();
        nodes[msg.sender] = OracleNode({
            stakedAmount: msg.value,
            lastReportedBucket: 0, // updated in reportPrice
            reportCount: 0,
            claimedReportCount: 0,
            firstBucket: getCurrentBucketNumber(),
            active: true
        });
        nodeAddresses.push(msg.sender);
        reportPrice(initialPrice);
        emit NodeRegistered(msg.sender, msg.value);
    }

    /**
     * @notice Updates the price reported by an oracle node (only registered nodes)
     * @dev Updates the node's lastReportedBucket and price in that bucket. Requires sufficient stake.
     * @param price The new price value to report
     */
    function reportPrice(uint256 price) public onlyNode {
        if (price == 0) revert InvalidPrice();
        OracleNode storage node = nodes[msg.sender];
        if (getEffectiveStake(msg.sender) < MINIMUM_STAKE) revert InsufficientStake();
        if (node.lastReportedBucket == getCurrentBucketNumber()) revert AlreadyReportedInCurrentBucket();
        TimeBucket storage bucket = timeBuckets[getCurrentBucketNumber()];
        bucket.prices[msg.sender] = price;
        bucket.countReports++;
        bucket.sumPrices += price;
        
        node.lastReportedBucket = getCurrentBucketNumber();
        node.reportCount++;
        emit PriceReported(msg.sender, price, getCurrentBucketNumber());
    }

    /**
     * @notice Allows active and inactive nodes to claim accumulated ORA token rewards
     * @dev Calculates rewards based on time elapsed since last claim.
     */
    function claimReward() public {
        OracleNode storage node = nodes[msg.sender];

        uint256 delta = node.reportCount - node.claimedReportCount;
        if (delta == 0) revert NoRewardsAvailable();

        node.claimedReportCount = node.reportCount;
        oracleToken.mint(msg.sender, delta * REWARD_PER_REPORT);
        emit NodeRewarded(msg.sender, delta * REWARD_PER_REPORT);
    }

    /**
     * @notice Allows a registered node to increase its stake
     * @dev Increases the sender's stakedAmount by msg.value
     */
    function addStake() public payable onlyNode {
        if (msg.value == 0) revert InsufficientStake();
        nodes[msg.sender].stakedAmount += msg.value;
        emit StakeAdded(msg.sender, msg.value);
    }

    /**
     * @notice Slashes a node for giving a price that is deviated too far from the average excluding it's own reported price
     */
    function slashNode(address nodeToSlash, uint256 bucketNumber, uint256 index) public {
        if (!nodes[nodeToSlash].active) revert NodeNotRegistered();
        if (getCurrentBucketNumber() == bucketNumber) revert OnlyPastBucketsAllowed();
        TimeBucket storage bucket = timeBuckets[bucketNumber];
        if (bucket.slashedOffenses[nodeToSlash]) revert NodeAlreadySlashed();
        uint256 reportedPrice = bucket.prices[nodeToSlash];
        if (reportedPrice == 0) revert NodeDidNotReport();
        bucket.slashedOffenses[nodeToSlash] = true;
        // Remove the price from the sum and count
        bucket.sumPrices -= reportedPrice;
        bucket.countReports--;
        uint256 averagePrice = bucket.sumPrices / bucket.countReports;
        // Check if the price deviation is greater than the threshold
        if (!_checkPriceDeviated(reportedPrice, averagePrice)) {
            revert NotDeviated();
        }
        OracleNode storage node = nodes[nodeToSlash];
        // Slash the node
        uint256 actualPenalty = MISREPORT_PENALTY > node.stakedAmount ? node.stakedAmount : MISREPORT_PENALTY;
        node.stakedAmount -= actualPenalty;

        uint256 reward = (actualPenalty * SLASHER_REWARD_PERCENTAGE) / 100;

        (bool sent, ) = msg.sender.call{ value: reward }("");
        if (!sent) revert FailedToSend();

        if (node.stakedAmount == 0) {
            _removeNode(nodeToSlash, index);
            emit NodeExited(nodeToSlash, 0);
        }

        emit NodeSlashed(nodeToSlash, actualPenalty);
    }

    function exitNode(uint256 index) public onlyNode {
        OracleNode storage node = nodes[msg.sender];
        if (node.lastReportedBucket + WAITING_PERIOD > getCurrentBucketNumber()) revert WaitingPeriodNotOver();
        // Get effective stake before removing node (since getEffectiveStake returns 0 for inactive nodes)
        uint256 stake = getEffectiveStake(msg.sender);
        _removeNode(msg.sender, index);
        // Withdraw the stake
        delete nodes[msg.sender];
        (bool sent, ) = msg.sender.call{ value: stake }("");
        if (!sent) revert FailedToSend();
    
        emit NodeExited(msg.sender, stake);
    }

    ////////////////////////
    /// View Functions /////
    ////////////////////////

    /**
     * @notice Returns the list of registered oracle node addresses
     * @return Array of registered oracle node addresses
     */
    function getNodeAddresses() public view returns (address[] memory) {
        return nodeAddresses;
    }

    /**
     * @notice Returns the aggregated price from all active oracle nodes using median calculation
     * @dev Filters out stale nodes, extracts their prices, sorts them, and calculates median.
     *      Uses StatisticsUtils for sorting and median calculation.
     * @return The median price from all nodes with fresh data
     */
    function getLatestPrice() public view returns (uint256) {
        TimeBucket storage bucket = timeBuckets[getCurrentBucketNumber() - 1];
        if (bucket.countReports == 0) revert NoValidPricesAvailable();
        return bucket.sumPrices / bucket.countReports;
    }

    /**
     * @notice Returns the average price from a past bucket
     * @param bucketNumber The bucket number to get the average price from
     * @return The average price from the bucket
     */
    function getPastPrice(uint256 bucketNumber) public view returns (uint256) {
        TimeBucket storage bucket = timeBuckets[bucketNumber];
        if (bucket.countReports == 0) revert NoValidPricesAvailable();
        return bucket.sumPrices / bucket.countReports;
    }

    function getAddressDataAtBucket(address nodeAddress, uint256 bucketNumber) public view returns (uint256, bool) {
        TimeBucket storage bucket = timeBuckets[bucketNumber];
        return (bucket.prices[nodeAddress], bucket.slashedOffenses[nodeAddress]);
    }

    /**
     * @notice Returns the current bucket number
     * @dev Returns the current bucket number based on the block number
     * @return The current bucket number
     */
    function getCurrentBucketNumber() public view returns (uint256) {
        return (block.number / BUCKET_WINDOW) + 1;
    }

    /**
     * @notice Returns the effective stake accounting for inactivity penalties via missed buckets
     * @dev Effective stake = stakedAmount - (missedBuckets * INACTIVITY_PENALTY), floored at 0
     */
    function getEffectiveStake(address nodeAddress) public view returns (uint256) {
        OracleNode memory n = nodes[nodeAddress];
        if (!n.active) return 0;
        uint256 currentBucket = getCurrentBucketNumber();
        if (currentBucket == n.firstBucket) return n.stakedAmount;
        // Expected reports are only for fully completed buckets since registration (exclude current bucket)
        uint256 expectedReports = currentBucket - n.firstBucket;
        // Do not assume future reports; penalize only after a bucket has passed
        uint256 actualReportsCompleted = n.reportCount;
        // Exclude a report made in the current bucket from completed reports to avoid reducing past penalties
        if (n.lastReportedBucket == currentBucket && actualReportsCompleted > 0) {
            actualReportsCompleted -= 1;
        }
        if (actualReportsCompleted >= expectedReports) return n.stakedAmount; // no penalty if on target
        uint256 missed = expectedReports - actualReportsCompleted;
        uint256 penalty = missed * INACTIVITY_PENALTY;
        if (penalty > n.stakedAmount) return 0;
        return n.stakedAmount - penalty;
    }

    /**
     * @notice Returns the addresses of nodes in a bucket whose reported price deviates beyond the threshold
     * @param bucketNumber The bucket number to get the outliers from
     * @return Array of node addresses considered outliers
     */
    function getOutlierNodes(uint256 bucketNumber) public view returns (address[] memory) {
        TimeBucket storage bucket = timeBuckets[bucketNumber];
        address[] memory outliers = new address[](bucket.countReports);
        uint256 outlierCount = 0;
        for (uint256 i = 0; i < nodeAddresses.length; i++) {
            address nodeAddress = nodeAddresses[i];
            uint256 reportedPrice = bucket.prices[nodeAddress];
            if (reportedPrice == 0) continue;
            uint256 averagePrice = (bucket.sumPrices - reportedPrice) / (bucket.countReports - 1);
            // Check if the price deviation is greater than the threshold
            if (_checkPriceDeviated(reportedPrice, averagePrice)) {
                outliers[outlierCount] = nodeAddress;
                outlierCount++;
            }
        }
        address[] memory trimmed = new address[](outlierCount);
        for (uint256 i = 0; i < outlierCount; i++) {
            trimmed[i] = outliers[i];
        }
        return trimmed;
    }

    //////////////////////////
    /// Internal Functions ///
    //////////////////////////

    /**
     * @notice Removes a node from the nodeAddresses array
     * @param nodeAddress The address of the node to remove
     * @param index The index of the node to remove
     */
    function _removeNode(address nodeAddress, uint256 index) internal {
        if (nodeAddresses.length <= index) revert IndexOutOfBounds();
        if (nodeAddresses[index] != nodeAddress) revert NodeNotAtGivenIndex();
        // Pop and swap pattern
        nodeAddresses[index] = nodeAddresses[nodeAddresses.length - 1];
        nodeAddresses.pop();
        // Set the node to inactive
        nodes[nodeAddress].active = false;
    }

    /**
     * @notice Checks if the price deviation is greater than the threshold
     * @param reportedPrice The price reported by the node
     * @param averagePrice The average price of the bucket
     * @return True if the price deviation is greater than the threshold, false otherwise
     */
    function _checkPriceDeviated(uint256 reportedPrice, uint256 averagePrice) internal pure returns (bool) {
        uint256 deviation = reportedPrice > averagePrice ? reportedPrice - averagePrice : averagePrice - reportedPrice;
        uint256 deviationBps = (deviation * 10_000) / averagePrice;
        if (deviationBps > MAX_DEVIATION_BPS) {
            return true;
        }
        return false;
    }
}
