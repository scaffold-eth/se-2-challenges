//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./SimpleOracle.sol";
import { StatisticsUtils } from "../utils/StatisticsUtils.sol";

contract WhitelistOracle {
    using StatisticsUtils for uint256[];

    error OnlyOwner();
    error IndexOutOfBounds();
    error NoOraclesAvailable();

    address public owner;
    SimpleOracle[] public oracles;

    event OracleAdded(address oracleAddress, address oracleOwner);
    event OracleRemoved(address oracleAddress);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        // Intentionally removing the owner requirement to make it easy for you to impersonate the owner
        // if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    function addOracle(address _owner) public onlyOwner {
        SimpleOracle newOracle = new SimpleOracle(_owner);
        address oracleAddress = address(newOracle);

        oracles.push(newOracle);
        emit OracleAdded(oracleAddress, _owner);
    }

    function removeOracle(uint256 index) public onlyOwner {
        if (index >= oracles.length) revert IndexOutOfBounds();

        address oracleAddress = address(oracles[index]);

        if (index != oracles.length - 1) {
            oracles[index] = oracles[oracles.length - 1];
        }

        oracles.pop();

        emit OracleRemoved(oracleAddress);
    }

    function getPrice() public view returns (uint256) {
        if (oracles.length == 0) revert NoOraclesAvailable();

        // Collect prices and timestamps from all oracles
        uint256[] memory prices = new uint256[](oracles.length);
        uint256 validCount = 0; // Count of valid prices
        uint256 currentTime = block.timestamp;

        for (uint256 i = 0; i < oracles.length; i++) {
            (uint256 price, uint256 timestamp) = oracles[i].getPrice();
            // Check if the timestamp is within the last 10 seconds
            if (currentTime - timestamp < 10) {
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

    function getActiveOracleNodes() public view returns (address[] memory) {
        address[] memory tempNodes = new address[](oracles.length);
        uint256 count = 0;

        for (uint256 i = 0; i < oracles.length; i++) {
            (, uint256 timestamp) = oracles[i].getPrice();
            if (timestamp > block.timestamp - 10) {
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
