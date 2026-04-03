//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/Corn.sol";
import "../contracts/CornDEX.sol";
import "../contracts/Lending.sol";
import "../contracts/MovePrice.sol";
import "./DeployHelpers.s.sol";

contract DeployLending is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        Corn corn = new Corn();
        console.logString(string.concat("Corn deployed at: ", vm.toString(address(corn))));

        CornDEX cornDEX = new CornDEX(address(corn));
        console.logString(string.concat("CornDEX deployed at: ", vm.toString(address(cornDEX))));

        Lending lending = new Lending(address(cornDEX), address(corn));
        console.logString(string.concat("Lending deployed at: ", vm.toString(address(lending))));

        MovePrice movePrice = new MovePrice(address(cornDEX), address(corn));
        console.logString(string.concat("MovePrice deployed at: ", vm.toString(address(movePrice))));

        // Only seed liquidity and set up state on localhost
        if (block.chainid == 31337) {
            // Give deployer and MovePrice huge ETH balances
            // vm.deal for forge simulation, anvil_setBalance for actual chain
            vm.deal(deployer, 100_000_000_000 ether);
            vm.deal(address(movePrice), 10_000_000_000_000_000_000_000 ether);
            vm.rpc("anvil_setBalance", string.concat("[\"", vm.toString(deployer), "\", \"0x1431e0fae6d7217caa0000000\"]"));
            vm.rpc("anvil_setBalance", string.concat("[\"", vm.toString(address(movePrice)), "\", \"0x1d6329f1c35ca4bfabb9f5610000000000\"]"));

            corn.mintTo(deployer, 1_000_000_000_000 ether);

            // Give CORN to MovePrice contract for price manipulation testing
            corn.mintTo(address(movePrice), 10_000_000_000_000_000_000_000 ether);

            // Mint CORN to lending contract for borrowers
            corn.mintTo(address(lending), 10_000_000_000_000_000_000_000 ether);

            // Seed DEX liquidity: 1M ETH + 1B CORN
            corn.approve(address(cornDEX), 1_000_000_000 ether);
            cornDEX.init{ value: 1_000_000 ether }(1_000_000_000 ether);
        }
    }
}
