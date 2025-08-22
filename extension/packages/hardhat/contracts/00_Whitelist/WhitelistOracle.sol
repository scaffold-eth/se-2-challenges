//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./SimpleOracle.sol";

contract WhitelistOracle {
    address public owner;
    SimpleOracle[] public oracles;

    event OracleAdded(address oracleAddress);
    event OracleRemoved(address oracleAddress);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        // Intentionally removing the owner requirement to make it easy for you to impersonate the owner
        // require(msg.sender == owner, "Not the owner");
        _;
    }

    function addOracle(address oracle) public onlyOwner {
        require(oracle != address(0), "Invalid oracle address");
        for (uint256 i = 0; i < oracles.length; i++) {
            require(address(oracles[i]) != oracle, "Oracle already exists");
        }
        oracles.push(SimpleOracle(oracle));
        emit OracleAdded(oracle);
    }

    function removeOracle(uint256 index) public onlyOwner {
        require(index < oracles.length, "Index out of bounds");

        address oracleAddress = address(oracles[index]);

        if (index != oracles.length - 1) {
            oracles[index] = oracles[oracles.length - 1];
        }

        oracles.pop();

        emit OracleRemoved(oracleAddress);
    }

    function getPrice() public view returns (uint256) {
        require(oracles.length > 0, "No oracles available");

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

        require(validCount > 0, "No valid prices available");

        uint256[] memory validPrices = new uint256[](validCount);
        for (uint256 i = 0; i < validCount; i++) {
            validPrices[i] = prices[i];
        }

        // NOTE: It is not efficient to sort onchain, but since we only have 10 oracles
        // and this is mimicking the early MakerDAO Medianizer exactly, it's fine
        sort(validPrices);

        uint256 median;
        if (validCount % 2 == 0) {
            uint256 midIndex = validCount / 2;
            median = (validPrices[midIndex - 1] + validPrices[midIndex]) / 2;
        } else {
            median = validPrices[validCount / 2];
        }

        return median;
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

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        require(newOwner != owner, "New owner cannot be the same as current owner");
        owner = newOwner;
    }

    function sort(uint256[] memory arr) internal pure {
        uint256 n = arr.length;
        for (uint256 i = 0; i < n; i++) {
            uint256 minIndex = i;
            for (uint256 j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIndex]) {
                    minIndex = j;
                }
            }
            if (minIndex != i) {
                (arr[i], arr[minIndex]) = (arr[minIndex], arr[i]);
            }
        }
    }
}
