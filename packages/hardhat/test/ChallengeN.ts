//
// This script executes when you run 'yarn test'
//

import { ethers } from "hardhat";
import { YourContract } from "../typechain-types/contracts/YourContract";
import { expect } from "chai";

describe("🚩 Challenge N: Description", function () {
  // Change to name and type of your contract
  let yourContract: YourContract;

  describe("Deployment", function () {
    const contractAddress = process.env.CONTRACT_ADDRESS;

    // Don't change contractArtifact creation
    let contractArtifact: string;
    if (contractAddress) {
      // For the autograder.
      contractArtifact = `contracts/download-${contractAddress}.sol:YourContract`;
    } else {
      contractArtifact = "contracts/YourContract.sol:YourContract";
    }

    it("Should deploy the contract", async function () {
      const [owner] = await ethers.getSigners();
      const yourContractFactory = await ethers.getContractFactory(contractArtifact);
      yourContract = (await yourContractFactory.deploy(owner.address)) as YourContract;
      console.log("\t", " 🛰  Contract deployed on", await yourContract.getAddress());
    });
  });

  // Test group example
  describe("Initialization and change of greeting", function () {
    it("Should have the right message on deploy", async function () {
      expect(await yourContract.greeting()).to.equal("Building Unstoppable Apps!!!");
    });

    it("Should allow setting a new message", async function () {
      const newGreeting = "Learn Scaffold-ETH 2! :)";

      await yourContract.setGreeting(newGreeting);
      expect(await yourContract.greeting()).to.equal(newGreeting);
    });
  });
});
