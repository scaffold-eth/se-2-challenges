pragma solidity >=0.8.0 <0.9.0;  //Do not change the solidity version as it negatively impacts submission grading

//SPDX-License-Identifier: MIT

import "hardhat/console.sol";
import "./DiceGame.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// The simple roll contract illustrate how  you can do a simple roll of the dice using the DiceGame contract 

contract SimpleRoll is Ownable {

    DiceGame public diceGame;

    constructor(address payable diceGameAddress) {
        diceGame = DiceGame(diceGameAddress);
    }

    // Implement a withdraw function in the SimpleRoll Contract that allows transferring a specified amount of Ether to a given address

    // Create the `simpleRoll()` function in the contract, which interacts with the DiceGame Contract to perform a basic dice roll, aiming to achieve a straightforward roll mechanism with the DiceRoll Contracts.

    // Include a `receive()` function in the contract to enable it to accept incoming Ether  
}
