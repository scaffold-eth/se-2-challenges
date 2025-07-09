// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DEX.sol";

contract Oracle {
    /* ========== STATE VARIABLES ========== */

    DEX public dexAddress;
    uint256 public defaultPrice;
    /* ========== CONSTRUCTOR ========== */

    constructor(address _dexAddress, uint256 _defaultPrice) {
        dexAddress = DEX(_dexAddress);
        defaultPrice = _defaultPrice;
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    function getETHMyUSDPrice() public view returns (uint256) {
        // Oracle just returns price from DEX unless no liquidity is available
        uint256 _price = dexAddress.currentPrice();
        if (_price == 0) {
            _price = defaultPrice;
        }
        return _price;
    }

    function getETHUSDPrice() public view returns (uint256) {
        return defaultPrice;
    }
}
