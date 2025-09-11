//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract SimpleOracle {
    error OnlyOwner();

    uint256 public price;
    uint256 public timestamp;
    address public owner;

    event PriceUpdated(uint256 newPrice);

    constructor(address _owner) {
        owner = _owner;
    }

    modifier onlyOwner() {
        // Intentionally removing the owner requirement to make it easy for you to impersonate the owner
        // if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    function setPrice(uint256 _newPrice) public onlyOwner {
        price = _newPrice;
        timestamp = block.timestamp;
        emit PriceUpdated(_newPrice);
    }

    function getPrice() public view returns (uint256, uint256) {
        return (price, timestamp);
    }
}
