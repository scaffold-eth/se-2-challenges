// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./SimpleOracle.sol";

interface IWhitelistOracle {
    // Errors
    error OnlyOwner();
    error IndexOutOfBounds();
    error NoOraclesAvailable();

    // Events
    event OracleAdded(address oracleAddress, address oracleOwner);
    event OracleRemoved(address oracleAddress);

    // Functions
    function owner() external view returns (address);
    function oracles(uint256 index) external view returns (SimpleOracle);
    function STALE_DATA_WINDOW() external view returns (uint256);
    function addOracle(address _owner) external;
    function removeOracle(uint256 index) external;
    function getPrice() external view returns (uint256);
    function getActiveOracleNodes() external view returns (address[] memory);
}
