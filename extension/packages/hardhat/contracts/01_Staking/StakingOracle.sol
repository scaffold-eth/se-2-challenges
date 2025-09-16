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
    error NotEnoughStake();
    error NoRewardsAvailable();
    error FailedToSendReward();
    error NoValidPricesAvailable();

    //////////////////////
    /// State Variables //
    //////////////////////

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
    uint256 public constant STALE_DATA_WINDOW = 24 seconds;
    uint256 public constant SLASHER_REWARD_PERCENTAGE = 10;

    ////////////////
    /// Events /////
    ////////////////

    event NodeRegistered(address indexed node, uint256 stakedAmount);
    event PriceReported(address indexed node, uint256 price);
    event NodeSlashed(address indexed node, uint256 amount);
    event NodeRewarded(address indexed node, uint256 amount);
    event NodesValidated();

    address public oracleTokenAddress;

    ///////////////////
    /// Modifiers /////
    ///////////////////

    /**
     * @notice Modifier to restrict function access to registered oracle nodes
     * @dev Checks if the sender has a registered node in the mapping
     */
    modifier onlyNode() {
        if (nodes[msg.sender].nodeAddress == address(0)) revert NodeNotRegistered();
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
     * @dev Updates the node's lastReportedPrice and timestamp. Requires sufficient stake.
     * @param price The new price value to report
     */
    function reportPrice(uint256 price) public onlyNode {}

    /**
     * @notice Allows registered nodes to claim accumulated ORA token rewards
     * @dev Calculates rewards based on time elapsed since last claim. Slashed nodes
     *      can only claim rewards up to their last slash timestamp.
     */
    function claimReward() public onlyNode {}

    /**
     * @notice Public function to slash all nodes with stale data and reward the caller
     * @dev Identifies stale nodes, slashes them, and sends accumulated slasher rewards to caller.
     *      Anyone can call this function to maintain oracle data freshness.
     */
    function slashNodes() public {}

    ////////////////////////
    /// View Functions /////
    ////////////////////////

    /**
     * @notice Returns the aggregated price from all active oracle nodes using median calculation
     * @dev Filters out stale nodes, extracts their prices, sorts them, and calculates median.
     *      Uses StatisticsUtils for sorting and median calculation.
     * @return The median price from all nodes with fresh data
     */
    function getPrice() public view returns (uint256) {}

    /**
     * @notice Separates oracle nodes into fresh and stale categories based on data recency
     * @dev Checks each node's last reported timestamp against the STALE_DATA_WINDOW.
     *      Returns two arrays with fresh and stale node addresses respectively.
     * @param nodesToSeparate Array of node addresses to categorize
     * @return fresh Array of addresses with recent data (within STALE_DATA_WINDOW)
     * @return stale Array of addresses with stale data (older than STALE_DATA_WINDOW)
     */
    function separateStaleNodes(
        address[] memory nodesToSeparate
    ) public view returns (address[] memory fresh, address[] memory stale) {}

    /**
     * @notice Returns the array of all registered oracle node addresses
     * @dev Provides access to the complete list of node addresses for external monitoring
     * @return Array of all registered node addresses
     */
    function getNodeAddresses() public view returns (address[] memory) {
        return nodeAddresses;
    }

    ////////////////////////
    /// Internal Helpers ///
    ////////////////////////

    /**
     * @notice Internal function to mint oracle tokens as rewards to a node
     * @dev Mints ORA tokens to the specified node address and emits reward event
     * @param nodeAddress The address of the node to reward
     * @param reward The amount of ORA tokens to mint as reward
     */
    function rewardNode(address nodeAddress, uint256 reward) internal {}

    /**
     * @notice Internal function to slash a node's stake for providing stale data
     * @dev Reduces the node's staked amount and calculates slasher reward as percentage of penalty.
     *      Cannot slash more than the node's current stake.
     * @param nodeToSlash The address of the node to penalize
     * @param penalty The amount of ETH to slash from the node's stake
     * @return The reward amount for the slasher (percentage of actual penalty)
     */
    function slashNode(address nodeToSlash, uint256 penalty) internal returns (uint256) {}

    /**
     * @notice Internal function to extract price values from an array of node addresses
     * @dev Iterates through provided addresses and retrieves their last reported prices
     * @param addresses Array of node addresses to get prices from
     * @return Array of price values corresponding to the input addresses
     */
    function getPricesFromAddresses(address[] memory addresses) internal view returns (uint256[] memory) {}

    // Notably missing a way to unstake and exit your node but not needed for the challenge
}
