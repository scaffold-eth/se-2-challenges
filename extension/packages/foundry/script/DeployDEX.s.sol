//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/Balloons.sol";
import "../contracts/DEX.sol";
import "./DeployHelpers.s.sol";

contract DeployDEX is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        Balloons balloons = new Balloons();
        console.logString(string.concat("Balloons deployed at: ", vm.toString(address(balloons))));

        DEX dex = new DEX(address(balloons));
        console.logString(string.concat("DEX deployed at: ", vm.toString(address(dex))));

        // CHECKPOINT 2: Uncomment and replace YOUR_FRONTEND_ADDRESS to send 10 BAL to your frontend
        // balloons.transfer(YOUR_FRONTEND_ADDRESS, 10 ether);

        // CHECKPOINT 3: Uncomment below to seed initial liquidity after implementing init()
        // balloons.approve(address(dex), 100 ether);
        // dex.init{value: 5 ether}(5 ether);
    }
}
