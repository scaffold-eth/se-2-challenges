//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/Voting.sol";
import "./DeployHelpers.s.sol";

contract DeployVoting is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        address ownerAddress = address(0x1);

        /// Checkpoint 6 //////
        address verifierAddress = address(0x2); // placeholder
        // HonkVerifier verifier = new HonkVerifier();
        // address verifierAddress = address(verifier);
        // console.logString(
        //     string.concat("HonkVerifier deployed at: ", vm.toString(verifierAddress))
        // );

        /// Checkpoint 2 //////
        // NOTE: In Foundry, library linking is handled automatically.
        // PoseidonT3 and LeanIMT are linked at compile time when Voting.sol imports them.
        // No manual library deployment needed for the Voting contract.

        Voting voting = new Voting(ownerAddress, verifierAddress, "Should we build zk apps?");

        console.logString(
            string.concat("Voting deployed at: ", vm.toString(address(voting)))
        );
    }
}
