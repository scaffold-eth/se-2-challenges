// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {ORA} from "./OracleToken.sol";
import {StatisticsUtils} from "../utils/StatisticsUtils.sol";

contract StakingOracle {
    using StatisticsUtils for uint256[];

    /////////////////
    /// Errors //////
    /////////////////

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

    struct BlockBucket {
        mapping(address => bool) slashedOffenses;
        address[] reporters;
        uint256[] prices;
        uint256 medianPrice;
    }

    mapping(address => OracleNode) public nodes;
    mapping(uint256 => BlockBucket) public blockBuckets; // one bucket per 24 blocks
    address[] public nodeAddresses;

    uint256 public constant MINIMUM_STAKE = 100 ether;
    uint256 public constant BUCKET_WINDOW = 24; // 24 blocks
    uint256 public constant SLASHER_REWARD_PERCENTAGE = 10;
    uint256 public constant REWARD_PER_REPORT = 1 ether; // ORA Token reward per report
    uint256 public constant INACTIVITY_PENALTY = 1 ether;
    uint256 public constant MISREPORT_PENALTY = 100 ether;
    uint256 public constant MAX_DEVIATION_BPS = 1000; // 10% default threshold
    uint256 public constant WAITING_PERIOD = 2; // 2 buckets after last report before exit allowed

    ////////////////
    /// Events /////
    ////////////////

    event NodeRegistered(address indexed node, uint256 stakedAmount);
    event PriceReported(address indexed node, uint256 price, uint256 bucketNumber);
    event BucketMedianRecorded(uint256 indexed bucketNumber, uint256 medianPrice);
    event NodeSlashed(address indexed node, uint256 amount);
    event NodeRewarded(address indexed node, uint256 amount);
    event StakeAdded(address indexed node, uint256 amount);
    event NodeExited(address indexed node, uint256 amount);

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

    constructor(address oraTokenAddress) {
        oracleToken = ORA(payable(oraTokenAddress));
    }

    ///////////////////
    /// Functions /////
    ///////////////////

    /**
     * @notice Registers a new oracle node with initial ORA token stake
     * @dev Creates a new OracleNode struct and adds the sender to the nodeAddresses array.
     *      Requires minimum stake amount and prevents duplicate registrations.
     */
    function registerNode(uint256 amount) public {
        if (amount < MINIMUM_STAKE) revert InsufficientStake();
        if (nodes[msg.sender].active) revert NodeAlreadyRegistered();
        bool success = oracleToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        nodes[msg.sender] = OracleNode({
            stakedAmount: amount,
            lastReportedBucket: 0, // updated in reportPrice
            reportCount: 0,
            claimedReportCount: 0,
            firstBucket: getCurrentBucketNumber(),
            active: true
        });
        nodeAddresses.push(msg.sender);
        emit NodeRegistered(msg.sender, amount);
    }

    /**
     * @notice Updates the price reported by an oracle node (only registered nodes)
     * @dev Updates the node's lastReportedBucket and price in that bucket. Requires sufficient stake.
     *      Enforces that previous report's bucket must have its median recorded before allowing new report.
     *      This creates a chain of finalized buckets, ensuring all past reports are accountable.
     * @param price The new price value to report
     */
    function reportPrice(uint256 price) public onlyNode {
        if (price == 0) revert InvalidPrice();
        OracleNode storage node = nodes[msg.sender];
        if (getEffectiveStake(msg.sender) < MINIMUM_STAKE) revert InsufficientStake();
        uint256 currentBucket = getCurrentBucketNumber();
        if (node.lastReportedBucket == currentBucket) revert AlreadyReportedInCurrentBucket();

        BlockBucket storage bucket = blockBuckets[currentBucket];

        bucket.reporters.push(msg.sender);
        bucket.prices.push(price);

        node.lastReportedBucket = currentBucket;
        node.reportCount++;
        emit PriceReported(msg.sender, price, currentBucket);
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
     * @notice Allows a registered node to increase its ORA token stake
     */
    function addStake(uint256 amount) public onlyNode {
        if (amount == 0) revert InsufficientStake();
        bool success = oracleToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        nodes[msg.sender].stakedAmount += amount;
        emit StakeAdded(msg.sender, amount);
    }

    /**
     * @notice Records the median price for a bucket once sufficient reports are available
     * @dev Anyone who uses the oracle's price feed can call this function to record the median price for a bucket.
     * @param bucketNumber The bucket number to finalize
     */
    function recordBucketMedian(uint256 bucketNumber) public {
        BlockBucket storage bucket = blockBuckets[bucketNumber];
        if (bucket.medianPrice != 0) revert BucketMedianAlreadyRecorded();
        if (bucketNumber >= getCurrentBucketNumber()) revert OnlyPastBucketsAllowed();

        // IMPORTANT: `StatisticsUtils.sort/getMedian` operate on `memory` arrays.
        // We sort a memory copy to compute the median without reordering the stored `prices[]`,
        // since `prices[]` indices must continue to match `reporters[]` indices for slashing.
        uint256[] memory prices = bucket.prices;
        prices.sort();
        bucket.medianPrice = prices.getMedian();

        emit BucketMedianRecorded(bucketNumber, bucket.medianPrice);
    }

    /**
     * @notice Slashes a node for giving a price that is deviated too far from the average
     * @param nodeToSlash The address of the node to slash
     * @param bucketNumber The bucket number to slash the node from
     * @param reportIndex The index of node in the prices and reporters arrays
     * @param nodeAddressesIndex The index of the node to slash in the nodeAddresses array
     */
    function slashNode(address nodeToSlash, uint256 bucketNumber, uint256 reportIndex, uint256 nodeAddressesIndex)
        public
    {
        if (!nodes[nodeToSlash].active) revert NodeNotRegistered();
        if (getCurrentBucketNumber() == bucketNumber) revert OnlyPastBucketsAllowed();
        BlockBucket storage bucket = blockBuckets[bucketNumber];
        if (bucket.medianPrice == 0) revert MedianNotRecorded();
        if (bucket.slashedOffenses[nodeToSlash]) revert NodeAlreadySlashed();
        if (reportIndex >= bucket.reporters.length) revert IndexOutOfBounds();
        if (nodeToSlash != bucket.reporters[reportIndex]) revert NodeNotAtGivenIndex();
        uint256 reportedPrice = bucket.prices[reportIndex];
        if (reportedPrice == 0) revert NodeDidNotReport();
        if (!_checkPriceDeviated(reportedPrice, bucket.medianPrice)) revert NotDeviated();
        bucket.slashedOffenses[nodeToSlash] = true;
        OracleNode storage node = nodes[nodeToSlash];
        // Slash the node
        uint256 actualPenalty = MISREPORT_PENALTY > node.stakedAmount ? node.stakedAmount : MISREPORT_PENALTY;
        node.stakedAmount -= actualPenalty;

        if (node.stakedAmount == 0) {
            _removeNode(nodeToSlash, nodeAddressesIndex);
            emit NodeExited(nodeToSlash, 0);
        }

        uint256 reward = (actualPenalty * SLASHER_REWARD_PERCENTAGE) / 100;

        bool rewardSent = oracleToken.transfer(msg.sender, reward);
        if (!rewardSent) revert TransferFailed();

        emit NodeSlashed(nodeToSlash, actualPenalty);
    }

    /**
     * @notice Allows a registered node to exit the system and withdraw their stake
     * @dev Removes the node from the system and sends the stake to the node.
     *      Requires that the the initial waiting period has passed to ensure the 
     *      node has been slashed if it reported a bad price before allowing it to exit.
     * @param index The index of the node to remove in nodeAddresses
     */
    function exitNode(uint256 index) public onlyNode {
        OracleNode storage node = nodes[msg.sender];
        if (node.lastReportedBucket + WAITING_PERIOD > getCurrentBucketNumber()) revert WaitingPeriodNotOver();
        // Get effective stake before removing node (since getEffectiveStake returns 0 for inactive nodes)
        uint256 stake = getEffectiveStake(msg.sender);
        _removeNode(msg.sender, index);
        // Withdraw the stake
        nodes[msg.sender].stakedAmount = 0;
        bool success = oracleToken.transfer(msg.sender, stake);
        if (!success) revert TransferFailed();

        emit NodeExited(msg.sender, stake);
    }

    ////////////////////////
    /// View Functions /////
    ////////////////////////

    /**
     * @notice Returns the current bucket number
     * @dev Returns the current bucket number based on the block number
     * @return The current bucket number
     */
    function getCurrentBucketNumber() public view returns (uint256) {
        return (block.number / BUCKET_WINDOW) + 1;
    }

    /**
     * @notice Returns the list of registered oracle node addresses
     * @return Array of registered oracle node addresses
     */
    function getNodeAddresses() public view returns (address[] memory) {
        return nodeAddresses;
    }

    /**
     * @notice Returns the stored median price from the most recently completed bucket
     * @dev Requires that the median for the bucket be recorded via recordBucketMedian
     * @return The median price for the last finalized bucket
     */
    function getLatestPrice() public view returns (uint256) {
        BlockBucket storage bucket = blockBuckets[getCurrentBucketNumber() - 1];
        if (bucket.medianPrice == 0) revert MedianNotRecorded();
        return bucket.medianPrice;
    }

    /**
     * @notice Returns the stored median price from a specified bucket
     * @param bucketNumber The bucket number to read the median price from
     * @return The median price stored for the bucket
     */
    function getPastPrice(uint256 bucketNumber) public view returns (uint256) {
        BlockBucket storage bucket = blockBuckets[bucketNumber];
        if (bucket.medianPrice == 0) revert MedianNotRecorded();
        return bucket.medianPrice;
    }

    /**
     * @notice Returns the price and slashed status of a node at a given bucket
     * @param nodeAddress The address of the node to get the data for
     * @param bucketNumber The bucket number to get the data from
     * @return price The price of the node at the specified bucket
     * @return slashed The slashed status of the node at the specified bucket
     */
    function getSlashedStatus(address nodeAddress, uint256 bucketNumber)
        public
        view
        returns (uint256 price, bool slashed)
    {
        BlockBucket storage bucket = blockBuckets[bucketNumber];
        for (uint256 i = 0; i < bucket.reporters.length; i++) {
            if (bucket.reporters[i] == nodeAddress) {
                return (bucket.prices[i], bucket.slashedOffenses[nodeAddress]);
            }
        }
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
        BlockBucket storage bucket = blockBuckets[bucketNumber];
        if (bucket.medianPrice == 0) revert MedianNotRecorded();
        address[] memory outliers = new address[](bucket.reporters.length);
        uint256 outlierCount = 0;
        for (uint256 i = 0; i < bucket.reporters.length; i++) {
            if (bucket.slashedOffenses[bucket.reporters[i]]) continue;
            uint256 reportedPrice = bucket.prices[i];
            if (reportedPrice == 0) continue;

            if (_checkPriceDeviated(reportedPrice, bucket.medianPrice)) {
                outliers[outlierCount] = bucket.reporters[i];
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
     * @param medianPrice The average price of the bucket
     * @return True if the price deviation is greater than the threshold, false otherwise
     */
    function _checkPriceDeviated(uint256 reportedPrice, uint256 medianPrice) internal pure returns (bool) {
        uint256 deviation = reportedPrice > medianPrice ? reportedPrice - medianPrice : medianPrice - reportedPrice;
        uint256 deviationBps = (deviation * 10_000) / medianPrice;
        if (deviationBps > MAX_DEVIATION_BPS) {
            return true;
        }
        return false;
    }
}
