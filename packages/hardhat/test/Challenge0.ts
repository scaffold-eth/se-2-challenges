//
// This script executes when you run 'yarn test'
//

import { ethers } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";

describe("🚩 Challenge 0: 🎟 Simple NFT Example 🤓", function () {
  this.timeout(180000);

  let myContract: Contract;

  describe("YourCollectible", function () {
    const contractAddress = process.env.CONTRACT_ADDRESS;

    let contractArtifact: string;
    if (contractAddress) {
      // For the autograder.
      contractArtifact = `contracts/download-${contractAddress}.sol:YourCollectible`
    } else {
      contractArtifact = "contracts/YourCollectible.sol:YourCollectible";
    }

    it("Should deploy the contract", async function () {
      const YourCollectible = await ethers.getContractFactory(contractArtifact);
      myContract = await YourCollectible.deploy();
      console.log("\t"," 🛰  Contract deployed on", myContract.address);
    });

    describe("mintItem()", function () {
      it("Should be able to mint an NFT", async function () {
        const [owner] = await ethers.getSigners();

        console.log("\t", " 🧑‍🏫 Tester Address: ", owner.address);

        const startingBalance = await myContract.balanceOf(owner.address);
        console.log("\t", " ⚖️ Starting balance: ", startingBalance.toNumber());

        console.log("\t", " 🔨 Minting...");
        const mintResult = await myContract.mintItem(owner.address, "QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr");
        console.log("\t", " 🏷  mint tx: ", mintResult.hash);

        console.log("\t", " ⏳ Waiting for confirmation...");
        const txResult = await mintResult.wait();
        expect(txResult.status).to.equal(1);

        console.log("\t", " 🔎 Checking new balance: ", startingBalance.toNumber());
        expect(await myContract.balanceOf(owner.address)).to.equal(startingBalance.add(1));
      });

      it("Should track tokens of owner by index", async function () {
        const [owner] = await ethers.getSigners();
        const startingBalance = await myContract.balanceOf(owner.address);
        const token = await myContract.tokenOfOwnerByIndex(owner.address, startingBalance.sub(1));
        expect(token.toNumber()).to.greaterThan(0);
      });
    });
  });
});
