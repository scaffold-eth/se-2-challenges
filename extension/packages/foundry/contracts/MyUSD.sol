// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

import "./MyUSDStaking.sol";

error MyUSD__InvalidAmount();
error MyUSD__InsufficientBalance();
error MyUSD__InsufficientAllowance();
error MyUSD__InvalidAddress();
error MyUSD__NotAuthorized();

contract MyUSD is ERC20, ERC20Burnable, Ownable {
    address public stakingContract;
    address public engineContract;

    constructor(address _engineContract, address _stakingContract) ERC20("MyUSD", "MyUSD") Ownable(msg.sender) {
        engineContract = _engineContract;
        stakingContract = _stakingContract;
    }

    function burnFrom(address account, uint256 amount) public override {
        if (msg.sender != engineContract) revert MyUSD__NotAuthorized();

        return super.burnFrom(account, amount);
    }

    function mintTo(address to, uint256 amount) external returns (bool) {
        // Only the engine contract can mint because MyUSD must always have collateral backing it
        if (msg.sender != engineContract) revert MyUSD__NotAuthorized();

        if (to == address(0)) {
            revert MyUSD__InvalidAddress();
        }
        if (amount == 0) {
            revert MyUSD__InvalidAmount();
        }
        _mint(to, amount);
        return true;
    }

    /**
     * @dev Overrides the standard balanceOf function to handle virtual balances for staking
     */
    function balanceOf(address account) public view override returns (uint256) {
        // For normal accounts, return standard balance
        if (account != stakingContract) {
            return super.balanceOf(account);
        }

        // For the staking contract, return the value of the shares
        MyUSDStaking staking = MyUSDStaking(stakingContract);
        return staking.getSharesValue(staking.totalShares());
    }

    /**
     * @dev Overrides the standard _update function to handle virtual balances for staking
     */
    function _update(address from, address to, uint256 value) internal override {
        // If staking contract is transferring burn or mint since its balance is virtual
        if (from == stakingContract) {
            super._mint(to, value);
        } else if (to == stakingContract) {
            super._burn(from, value);
        } else {
            super._update(from, to, value);
        }
    }

    /**
     * @dev Overrides the standard totalSupply function to handle virtual balances for staking
     */
    function totalSupply() public view override returns (uint256) {
        MyUSDStaking staking = MyUSDStaking(stakingContract);
        uint256 stakedTotalSupply = staking.getSharesValue(staking.totalShares());
        return super.totalSupply() + stakedTotalSupply;
    }
}
