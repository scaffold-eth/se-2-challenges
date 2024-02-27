import hre from "hardhat";
import { expect } from "chai";
// import { parseEther } from "ethers";
import { DiceGame, RiggedRoll, RiggedRoll__factory } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("🚩 Challenge 3: 🎲 Dice Game", function () {
  let diceGame: DiceGame;
  let riggedRoll: RiggedRoll;
  let deployer: HardhatEthersSigner;
  const { provider } = ethers;

  const rollAmountString = "0.002";
  const rollAmount = ethers.parseEther(rollAmountString);

  async function deployContracts() {
    [deployer] = await ethers.getSigners();
    const DiceGame = await ethers.getContractFactory("DiceGame");
    diceGame = await DiceGame.deploy();

    const contractAddress = process.env.CONTRACT_ADDRESS;
    let contractArtifact;
    if (process.env.CONTRACT_ADDRESS) {
      contractArtifact = `contracts/download-${contractAddress}.sol:RiggedRoll`;
    } else {
      contractArtifact = "contracts/RiggedRoll.sol:RiggedRoll";
    }

    const diceGameAddress = await diceGame.getAddress();
    const RiggedRoll = (await ethers.getContractFactory(contractArtifact)) as RiggedRoll__factory;
    riggedRoll = await RiggedRoll.deploy(diceGameAddress);
  }

  async function fundRiggedContract() {
    const riggedRollAddress = await riggedRoll.getAddress();
    return deployer.sendTransaction({
      to: riggedRollAddress,
      value: rollAmount,
    });
  }

  async function getRoll(getRollLessThanFive: boolean) {
    let expectedRoll;
    while (true) {
      const latestBlockNumber = await provider.getBlockNumber();
      const block = await provider.getBlock(latestBlockNumber);
      if (!block) {
        return;
      }
      const prevHash = block.hash;
      const nonce = await diceGame.nonce();

      const diceGameAddress = await diceGame.getAddress();
      const hash = ethers.solidityPackedKeccak256(
        ["bytes32", "address", "uint256"],
        [prevHash, diceGameAddress, nonce],
      );

      const bigInt = BigInt(hash);
      expectedRoll = bigInt % 16n;
      if (expectedRoll < 5n == getRollLessThanFive) {
        break;
      }

      const options = { value: rollAmount };
      await diceGame.rollTheDice(options);
    }
    return expectedRoll;
  }

  describe("⚙  Setup contracts", function () {
    console.log("asdf");

    it("Should deploy contracts", async function () {
      console.log("1");
      await deployContracts();
      console.log("2");

      const diceGameAddress = await diceGame.getAddress();
      console.log("3");

      expect(await riggedRoll.diceGame()).to.equal(diceGameAddress);
    });

    it(`Should revert if balance is less than ${rollAmountString} ethers`, async function () {
      console.log("dsssa");
      await expect(riggedRoll.riggedRoll()).to.be.reverted;
    });

    it("Should transfer sufficient eth to RiggedRoll", async function () {
      console.log("\t", "💸 Funding RiggedRoll contract");
      await fundRiggedContract();
      const riggedRollAddress = await riggedRoll.getAddress();
      const balance = await provider.getBalance(riggedRollAddress);
      console.log("\t", "💲 RiggedRoll balance: ", ethers.formatEther(balance));
      expect(balance).to.gte(rollAmount, `Error when expecting DiceGame contract to have >= ${rollAmount} eth`);
    });
  });

  describe("🔑 Rigged Rolls", function () {
    it("Should call diceGame.rollTheDice for a roll <= 5", async () => {
      const getRollLessThanFive = true;
      const expectedRoll = await getRoll(getRollLessThanFive);
      console.log("\t", "🎲 Expect roll to be less than or equal to 5. Dice Game Roll:", Number(expectedRoll));

      const tx = await riggedRoll.riggedRoll();
      const riggedRollAddress = await riggedRoll.getAddress();

      await expect(tx).to.emit(diceGame, "Roll").withArgs(riggedRollAddress, rollAmount, expectedRoll);
      await expect(tx).to.emit(diceGame, "Winner");
    });

    it("Should not call diceGame.rollTheDice for a roll > 5", async () => {
      const getRollLessThanFive = false;
      const expectedRoll = await getRoll(getRollLessThanFive);
      console.log("\t", "🎲 Expect roll to be greater than 5. Dice Game Roll:", Number(expectedRoll));
      console.log("\t", "◀  Expect riggedRoll to be reverted");

      await expect(riggedRoll.riggedRoll()).to.be.reverted;
    });

    it("Should withdraw funds", async () => {
      console.log("\t", "💸 Funding RiggedRoll contract");
      await fundRiggedContract();

      const deployerPrevBalance = await provider.getBalance(deployer.address);
      console.log("\t", "💲 Current RiggedRoll balance: ", ethers.formatEther(deployerPrevBalance));
      const riggedRollAddress = await riggedRoll.getAddress();
      const riggedRollBalance = await provider.getBalance(riggedRollAddress);
      await riggedRoll.withdraw(deployer.address, riggedRollBalance);

      const deployerCurrentBalance = await provider.getBalance(deployer.address);
      console.log("\t", "💲 New RiggedRoll balance: ", ethers.formatEther(deployerCurrentBalance));

      expect(
        deployerPrevBalance < deployerCurrentBalance,
        "Error when expecting RiggedRoll balance to increase when calling withdraw",
      ).to.true;
    });
  });
});
