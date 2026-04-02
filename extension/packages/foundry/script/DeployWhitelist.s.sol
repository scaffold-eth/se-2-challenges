//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/00_Whitelist/WhitelistOracle.sol";
import "../contracts/00_Whitelist/SimpleOracle.sol";
import "./DeployHelpers.s.sol";

contract DeployWhitelist is ScaffoldETHDeploy {
    // Default ETH price (~2000 USD) in 18-decimal format, matching Uniswap price feed format
    uint256 constant DEFAULT_PRICE = 2000 ether;

    function run() external ScaffoldEthDeployerRunner {
        WhitelistOracle whitelistOracle = new WhitelistOracle();
        console.logString(
            string.concat("WhitelistOracle deployed at: ", vm.toString(address(whitelistOracle)))
        );

        // Create 10 SimpleOracle instances with different owners (matching Hardhat deploy)
        uint256 oracleCount = 10;
        for (uint256 i = 0; i < oracleCount; i++) {
            address owner = vm.addr(i + 1);
            whitelistOracle.addOracle(owner);
            console.logString(
                string.concat("Created SimpleOracle ", vm.toString(i + 1), " with owner: ", vm.toString(owner))
            );
        }

        // Seed initial prices on localhost only (Hardhat fetches from Uniswap, we use a default)
        if (block.chainid == 31337) {
            console.logString("Localhost detected: seeding oracle prices...");
            for (uint256 i = 0; i < oracleCount; i++) {
                SimpleOracle oracle = whitelistOracle.oracles(i);
                oracle.setPrice(DEFAULT_PRICE);
                console.logString(
                    string.concat("Set price for SimpleOracle ", vm.toString(i + 1), " to: ", vm.toString(DEFAULT_PRICE))
                );
            }
        }
    }
}
