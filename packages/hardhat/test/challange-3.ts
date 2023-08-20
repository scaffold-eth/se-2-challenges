import { expect } from "chai";
import { ethers } from "hardhat";
import { DiceGame, RiggedRoll } from "../typechain-types";

describe("🚩 Challenge 3: 🎲 Dice Game", function () {
  let deployer;
  let diceGame: DiceGame;
  let riggedRoll: RiggedRoll;
  let provider;

  before(async () => {
    const [owner] = await ethers.getSigners();
    const diceGameFactory = await ethers.getContractFactory("DiceGame");
    diceGame = (await diceGameFactory.deploy(owner.address)) as DiceGame;
    await diceGame.deployed();
  });

  describe("⚙  Setup contracts", function () {
    it("Should deploy contracts DiceGame contract ", async function () {
      //xpect(await diceGame).to.equal("Building Unstoppable Apps!!!");
    });

    it("Should allow setting a new message", async function () {
      // const newGreeting = "Learn Scaffold-ETH 2! :)";
      // await yourContract.setGreeting(newGreeting);
      // expect(await yourContract.greeting()).to.equal(newGreeting);
    });
  });
});
