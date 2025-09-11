//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract SimpleOracle {
    /////////////////
    /// Errors //////
    /////////////////

    error OnlyOwner();

    //////////////////////
    /// State Variables //
    //////////////////////

    uint256 public price;
    uint256 public timestamp;
    address public owner;

    ////////////////
    /// Events /////
    ////////////////

    event PriceUpdated(uint256 newPrice);

    ///////////////////
    /// Constructor ///
    ///////////////////

    constructor(address _owner) {
        owner = _owner;
    }

    ///////////////////
    /// Modifiers /////
    ///////////////////

    /**
     * @notice Modifier to restrict function access to the contract owner
     * @dev Currently disabled to make it easy for you to impersonate the owner
     */
    modifier onlyOwner() {
        // Intentionally removing the owner requirement to make it easy for you to impersonate the owner
        // if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    ///////////////////
    /// Functions /////
    ///////////////////

    /**
     * @notice Updates the oracle price with a new value (only contract owner)
     * @dev Sets the price and records the current block timestamp for freshness tracking.
     *      Emits PriceUpdated event upon successful update.
     * @param _newPrice The new price value to set for this oracle
     */
    function setPrice(uint256 _newPrice) public onlyOwner {
        price = _newPrice;
        timestamp = block.timestamp;
        emit PriceUpdated(_newPrice);
    }

    /**
     * @notice Returns the current price and its timestamp
     * @dev Provides both the stored price value and when it was last updated.
     *      Used by aggregators to determine price freshness.
     * @return price The current price stored in this oracle
     * @return timestamp The block timestamp when the price was last updated
     */
    function getPrice() public view returns (uint256, uint256) {
        return (price, timestamp);
    }
}
