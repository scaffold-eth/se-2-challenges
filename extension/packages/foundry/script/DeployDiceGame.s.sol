//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../contracts/DiceGame.sol";
import "../contracts/RiggedRoll.sol";
import "./DeployHelpers.s.sol";

contract DeployDiceGame is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        DiceGame diceGame = new DiceGame{ value: 0.05 ether }();
        console.logString(string.concat("DiceGame deployed at: ", vm.toString(address(diceGame))));

        // Uncomment to deploy RiggedRoll contract
        // RiggedRoll riggedRoll = new RiggedRoll(payable(address(diceGame)));
        // console.logString(string.concat("RiggedRoll deployed at: ", vm.toString(address(riggedRoll))));

        // Please replace the text "Your Address" with your own address.
        // riggedRoll.transferOwnership(Your Address);
    }
}
