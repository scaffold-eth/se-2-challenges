//
// This script executes when you run 'yarn test'
//

import { ethers } from "hardhat";
import { expect } from "chai";
import { YourCollectible } from "../typechain-types";

describe("🚩 Challenge 0: 🎟 Simple NFT Example 🤓", function () {
  let myContract: YourCollectible;

  describe("YourCollectible", function () {
    const contractAddress = process.env.CONTRACT_ADDRESS;

    let contractArtifact: string;
    if (contractAddress) {
      // For the autograder.
      contractArtifact = `contracts/download-${contractAddress}.sol:YourCollectible`;
    } else {
      contractArtifact = "contracts/YourCollectible.sol:YourCollectible";
    }

    it("Should deploy the contract", async function () {
      const YourCollectible = await ethers.getContractFactory(contractArtifact);
      myContract = await YourCollectible.deploy();
      console.log("\t"," 🛰  Contract deployed on", await myContract.getAddress());
    });

    describe("mintItem()", function () {
      it("Should be able to mint an NFT", async function () {
        const [owner] = await ethers.getSigners();

        console.log("\t", " 🧑‍🏫 Tester Address: ", owner.address);

        const startingBalance = await myContract.balanceOf(owner.address);
        console.log("\t", " ⚖️ Starting balance: ", Number(startingBalance));

        console.log("\t", " 🔨 Minting...");
        const mintResult = await myContract.mintItem(owner.address, "QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr");
        console.log("\t", " 🏷  mint tx: ", mintResult.hash);

        console.log("\t", " ⏳ Waiting for confirmation...");
        const txResult = await mintResult.wait();
        expect(txResult?.status).to.equal(1);

        console.log("\t", " 🔎 Checking new balance: ", Number(startingBalance));
        expect(await myContract.balanceOf(owner.address)).to.equal(startingBalance + 1n);
      });

      it("Should track tokens of owner by index", async function () {
        const [owner] = await ethers.getSigners();
        const startingBalance = await myContract.balanceOf(owner.address);
        const token = await myContract.tokenOfOwnerByIndex(owner.address, startingBalance - 1n);
        expect(token).to.greaterThan(0);
      });
    });
  });
});
