// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./MyUSDStaking.sol";

error Engine__InvalidBorrowRate();

contract RateController {
    IMyUSDEngine private i_myUSD;
    MyUSDStaking private i_staking;

    constructor(address _myUSD, address _staking) {
        i_myUSD = IMyUSDEngine(_myUSD);
        i_staking = MyUSDStaking(_staking);
    }

    /**
     * @notice Set the borrow rate for the MyUSD engine
     * @param newRate The new borrow rate to set
     */
    function setBorrowRate(uint256 newRate) external {
        try i_myUSD.setBorrowRate(newRate) {} catch {
            revert Engine__InvalidBorrowRate();
        }
    }

    /**
     * @notice Set the savings rate for the MyUSD staking contract
     * @param newRate The new savings rate to set
     */
    function setSavingsRate(uint256 newRate) external {
        try i_staking.setSavingsRate(newRate) {} catch {
            revert Staking__InvalidSavingsRate();
        }
    }
}
