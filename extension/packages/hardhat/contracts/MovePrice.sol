// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CornDEX.sol";

/**
 * @notice This contract acts as a whale account that moves the price of CORN up and down whenever anyone calls it
 */
contract MovePrice {
    CornDEX cornDex;

    constructor(address _cornDex, address _cornToken) {
        cornDex = CornDEX(_cornDex);
        // Approve the cornDEX to use the cornToken
        IERC20(_cornToken).approve(address(cornDex), type(uint256).max);
    }

    function movePrice(int256 size) public {
        if (size > 0) {
            cornDex.swap{ value: uint256(size) }(uint256(size));
        } else {
            cornDex.swap(uint256(-size));
        }
    }

    receive() external payable {}

    fallback() external payable {}
}
