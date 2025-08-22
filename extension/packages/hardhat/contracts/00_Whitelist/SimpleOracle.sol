//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract SimpleOracle {
    uint256 public price;
    uint256 public timestamp;

    event PriceUpdated(uint256 newPrice);

    constructor() {}

    modifier onlyOwner() {
        // Intentionally removing the owner requirement to make it easy for you to impersonate the owner
        // require(msg.sender == owner, "Not the owner");
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
