//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./SimpleOracle.sol";
import { StatisticsUtils } from "../utils/StatisticsUtils.sol";

contract WhitelistOracle {
    using StatisticsUtils for uint256[];

    /////////////////
    /// Errors //////
    /////////////////

    error OnlyOwner();
    error IndexOutOfBounds();
    error NoOraclesAvailable();

    //////////////////////
    /// State Variables //
    //////////////////////

    address public owner;
    SimpleOracle[] public oracles;
    uint256 public constant STALE_DATA_WINDOW = 24 seconds;

    ////////////////
    /// Events /////
    ////////////////

    event OracleAdded(address oracleAddress, address oracleOwner);
    event OracleRemoved(address oracleAddress);

    ///////////////////
    /// Modifiers /////
    ///////////////////

    /**
     * @notice Modifier to restrict function access to the contract owner
     * @dev Currently disabled to make it easy for you to impersonate the owner
     */
    modifier onlyOwner() {
        // if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    ///////////////////
    /// Constructor ///
    ///////////////////

    constructor() {
        owner = msg.sender;
    }

    ///////////////////
    /// Functions /////
    ///////////////////

    /**
     * @notice Adds a new oracle to the whitelist by deploying a SimpleOracle contract (only contract owner)
     * @dev Creates a new SimpleOracle instance and adds it to the oracles array.
     * @param _owner The address that will own the newly created oracle and can update its price
     */
    function addOracle(address _owner) public onlyOwner {
        SimpleOracle newOracle = new SimpleOracle(_owner);
        address oracleAddress = address(newOracle);

        oracles.push(newOracle);
        emit OracleAdded(oracleAddress, _owner);
    }

    /**
     * @notice Removes an oracle from the whitelist by its array index (only contract owner)
     * @dev Uses swap-and-pop pattern for gas-efficient removal. Order is not preserved.
     *      Reverts with IndexOutOfBounds, if the provided index is >= oracles.length.
     * @param index The index of the oracle to remove from the oracles array
     */
    function removeOracle(uint256 index) public onlyOwner {
        if (index >= oracles.length) revert IndexOutOfBounds();

        address oracleAddress = address(oracles[index]);

        if (index != oracles.length - 1) {
            oracles[index] = oracles[oracles.length - 1];
        }

        oracles.pop();

        emit OracleRemoved(oracleAddress);
    }

    /**
     * @notice Returns the aggregated price from all active oracles using median calculation
     * @dev Filters oracles with timestamps older than STALE_DATA_WINDOW, then calculates median
     *      of remaining valid prices. Uses StatisticsUtils for sorting and median calculation.
     * @return The median price from all active oracles
     */
    function getPrice() public view returns (uint256) {
        if (oracles.length == 0) revert NoOraclesAvailable();

        // Collect prices and timestamps from all oracles
        uint256[] memory prices = new uint256[](oracles.length);
        uint256 validCount = 0; // Count of valid prices
        uint256 currentTime = block.timestamp;

        for (uint256 i = 0; i < oracles.length; i++) {
            (uint256 price, uint256 timestamp) = oracles[i].getPrice();
            // Check if the timestamp is within the last STALE_DATA_WINDOW
            if (currentTime - timestamp < STALE_DATA_WINDOW) {
                prices[validCount] = price;
                validCount++;
            }
        }

        uint256[] memory validPrices = new uint256[](validCount);
        for (uint256 i = 0; i < validCount; i++) {
            validPrices[i] = prices[i];
        }

        validPrices.sort();
        return validPrices.getMedian();
    }

    /**
     * @notice Returns the addresses of all oracles that have updated their price within the last STALE_DATA_WINDOW
     * @dev Iterates through all oracles and filters those with recent timestamps (within STALE_DATA_WINDOW).
     *      Uses a temporary array to collect active nodes, then creates a right-sized return array
     *      for gas optimization.
     * @return An array of addresses representing the currently active oracle contracts
     */
    function getActiveOracleNodes() public view returns (address[] memory) {
        address[] memory tempNodes = new address[](oracles.length);
        uint256 count = 0;

        for (uint256 i = 0; i < oracles.length; i++) {
            (, uint256 timestamp) = oracles[i].getPrice();
            if (timestamp > block.timestamp - STALE_DATA_WINDOW) {
                tempNodes[count] = address(oracles[i]);
                count++;
            }
        }

        address[] memory activeNodes = new address[](count);
        for (uint256 j = 0; j < count; j++) {
            activeNodes[j] = tempNodes[j];
        }

        return activeNodes;
    }
}
