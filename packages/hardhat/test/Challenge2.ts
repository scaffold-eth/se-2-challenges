//
// this script executes when you run 'yarn harhat:test'
//
// you can also test remote submissions like:
// CONTRACT_ADDRESS=0x43Ab1FCd430C1f20270C2470f857f7a006117bbb yarn test --network rinkeby
//
// you can even run mint commands if the tests pass like:
// yarn test && echo "PASSED" || echo "FAILED"
//

import hre from "hardhat";
import { expect } from "chai";
import { Vendor, YourToken } from "../typechain-types";

const { ethers } = hre;

describe("🚩 Challenge 2: 🏵 Token Vendor 🤖", function () {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  let yourToken: YourToken;
  let yourTokenAddress = "";

  let tokenContractArtifact = "";
  if (contractAddress) {
    tokenContractArtifact = `contracts/YourTokenAutograder.sol:YourToken`;
  } else {
    tokenContractArtifact = "contracts/YourToken.sol:YourToken";
  }

  it("Should deploy YourToken", async function () {
    const YourTokenFactory = await ethers.getContractFactory(tokenContractArtifact);

    yourToken = (await YourTokenFactory.deploy()) as YourToken;
    yourTokenAddress = await yourToken.getAddress();
  });

  describe("totalSupply()", function () {
    it("Should have a total supply of at least 1000", async function () {
      const totalSupply = await yourToken.totalSupply();
      const totalSupplyInt = parseInt(ethers.formatEther(totalSupply));
      console.log("\t", " 🧾 Total Supply:", totalSupplyInt);
      expect(totalSupplyInt).to.greaterThan(999);
    });
  });

  let contractArtifact = "";
  if (process.env.CONTRACT_ADDRESS) {
    contractArtifact = `contracts/download-${process.env.CONTRACT_ADDRESS}.sol:Vendor`;
  } else {
    contractArtifact = "contracts/Vendor.sol:Vendor";
  }

  let vendor: Vendor;
  let vendorAddress = "";
  it("Should deploy Vendor", async function () {
    const VendorFactory = await ethers.getContractFactory(contractArtifact);

    vendor = (await VendorFactory.deploy(yourTokenAddress)) as Vendor;

    vendorAddress = await vendor.getAddress();
    console.log("Transferring 1000 tokens to the vendor...");
    await yourToken.transfer(vendorAddress, ethers.parseEther("1000"));
  });

  describe(" 💵 buyTokens()", function () {
    it("Should let us buy tokens and our balance should go up...", async function () {
      const [owner] = await ethers.getSigners();
      console.log("\t", " 🧑 Tester Address: ", owner.address);

      const startingBalance: bigint = await yourToken.balanceOf(owner.address);
      console.log("\t", " ⚖  Starting Token balance: ", ethers.formatEther(startingBalance));

      console.log("\t", " 💸 Buying...");
      const buyTokensResult = await vendor.buyTokens({ value: ethers.parseEther("0.001") });
      console.log("\t", " 🏷  buyTokens Result: ", buyTokensResult.hash);

      console.log("\t", " ⏳ Waiting for confirmation...");
      const txResult = await buyTokensResult.wait();
      expect(txResult?.status).to.equal(1);

      const newBalance = await yourToken.balanceOf(owner.address);
      console.log("\t", " 🔎 New Token balance: ", ethers.formatEther(newBalance));
      expect(newBalance).to.equal(startingBalance + ethers.parseEther("0.1"));
    });
  });

  describe(" 💵 sellTokens()", function () {
    it("Should let us sell tokens and we should get the appropriate amount eth back...", async function () {
      const [owner] = await ethers.getSigners();

      const startingETHBalance = await ethers.provider.getBalance(owner.address);
      console.log("\t", " ⚖  Starting ETH balance: ", ethers.formatEther(startingETHBalance));

      const startingBalance = await yourToken.balanceOf(owner.address);
      console.log("\t", " ⚖  Starting Token balance: ", ethers.formatEther(startingBalance));

      console.log("\t", " 🙄 Approving...");
      const approveTokensResult = await yourToken.approve(vendorAddress, ethers.parseEther("0.1"));
      console.log("\t", " 🏷  approveTokens Result: ", approveTokensResult.hash);

      console.log("\t", " ⏳ Waiting for confirmation...");
      const atxResult = await approveTokensResult.wait();
      expect(atxResult?.status).to.equal(1, "Error when expecting the transaction result to equal 1");

      console.log("\t", " 🍾 Selling...");
      const sellTokensResult = await vendor.sellTokens(ethers.parseEther("0.1"));
      console.log("\t", " 🏷  sellTokens Result: ", sellTokensResult.hash);

      console.log("\t", " ⏳ Waiting for confirmation...");
      const txResult = await sellTokensResult.wait();
      expect(txResult?.status).to.equal(1, "Error when expecting the transaction status to equal 1");

      const newBalance = await yourToken.balanceOf(owner.address);
      console.log("\t", " 🔎 New Token balance: ", ethers.formatEther(newBalance));
      expect(newBalance).to.equal(
        startingBalance - ethers.parseEther("0.1"),
        "Error when expecting the token balance to have increased by 0.1",
      );

      const newETHBalance = await ethers.provider.getBalance(owner.address);
      console.log("\t", " 🔎 New ETH balance: ", ethers.formatEther(newETHBalance));
      const ethChange = newETHBalance - startingETHBalance;
      // check
      expect(ethChange).to.greaterThan(
        100_000_000_000_000,
        "Error when expecting the ether returned to the user by the sellTokens function to be correct",
      );
    });
  });

  describe(" 💵 withdraw()", function () {
    it("Should let the owner (and nobody else) withdraw the eth from the contract...", async function () {
      const [owner, nonOwner] = await ethers.getSigners();

      console.log("\t", " 💸 Buying some tokens...");
      const buyTokensResult = await vendor.connect(nonOwner).buyTokens({
        value: ethers.parseEther("0.1"),
      });
      console.log("\t", " 🏷  buyTokens Result: ", buyTokensResult.hash);

      console.log("\t", " ⏳ Waiting for confirmation...");
      const buyTxResult = await buyTokensResult.wait();
      expect(buyTxResult?.status).to.equal(1, "Error when expecting the transaction result to be 1");

      const vendorETHBalance = await ethers.provider.getBalance(vendorAddress);
      console.log("\t", " ⚖  Starting Vendor contract ETH balance: ", ethers.formatEther(vendorETHBalance));

      console.log("\t", " 🍾 Withdrawing as non-owner (should fail)...");
      const startingNonOwnerETHBalance = await ethers.provider.getBalance(nonOwner.address);
      console.log("\t", " ⚖  Starting non-owner ETH balance: ", ethers.formatEther(startingNonOwnerETHBalance));

      await expect(vendor.connect(nonOwner).withdraw()).to.be.reverted;
      console.log("\t", " 🏷  withdraw reverted as non-owner");

      const newNonOwnerETHBalance = await ethers.provider.getBalance(nonOwner.address);
      console.log("\t", " 🔎 New non-owner ETH balance: ", ethers.formatEther(newNonOwnerETHBalance));
      expect(newNonOwnerETHBalance).to.be.lte(
        startingNonOwnerETHBalance,
        "Error when expecting the new eth balance to be <= to the previous balance after calling withdraw by a non owner",
      );

      console.log("\t", " 🍾 Withdrawing as owner...");
      const startingOwnerETHBalance = await ethers.provider.getBalance(owner.address);
      console.log("\t", " ⚖  Starting owner ETH balance: ", ethers.formatEther(startingOwnerETHBalance));
      const withdrawResult = await vendor.withdraw();
      console.log("\t", " 🏷  withdraw Result: ", withdrawResult.hash);

      console.log("\t", " ⏳ Waiting for confirmation...");
      const withdrawTxResult = await withdrawResult.wait();
      expect(withdrawTxResult?.status).to.equal(1, "Error when expecting the withdraw transaction to equal 1");

      const newOwnerETHBalance = await ethers.provider.getBalance(owner.address);
      console.log("\t", " 🔎 New owner ETH balance: ", ethers.formatEther(newOwnerETHBalance));

      const tx = await ethers.provider.getTransaction(withdrawResult.hash);
      if (!tx) {
        throw new Error("Cannot resolve transaction");
      }
      const receipt = await ethers.provider.getTransactionReceipt(withdrawResult.hash);
      if (!receipt) {
        throw new Error("Cannot resolve receipt");
      }
      const gasCost = tx.gasPrice * receipt.gasUsed;

      expect(newOwnerETHBalance).to.equal(
        startingOwnerETHBalance + vendorETHBalance - gasCost,
        "Error when expecting the owner's ether returned by withdraw to be sufficient",
      );
    });
  });
});
