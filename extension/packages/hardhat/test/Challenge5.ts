import hre from "hardhat";

import { expect, assert } from "chai";
import { network } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Streamer } from "../typechain-types";

const { ethers } = hre;

describe(" 🕞 Statechannel Challenge: The Guru's Offering 👑", function () {
  this.timeout(120000);
  let streamerContract: Streamer;

  /**
   * asserts that the steamerContract's balance is equal to b,
   * denominated in ether
   *
   * @param {string} b
   */
  async function assertBalance(b: string) {
    const streamerContractAddress = await streamerContract.getAddress();
    const balance = await network.provider.send("eth_getBalance", [streamerContractAddress]);
    console.log("\t", "💵 Balance", ethers.formatEther(balance));
    expect(await network.provider.send("eth_getBalance", [streamerContractAddress])).to.equal(ethers.parseEther(b));
    return;
  }

  /**
   * Creates a redeemable voucher for the given balance
   * in the name of `signer`
   *
   * @param {bigint} updatedBalance
   * @param {HardhatEthersSigner} signer
   * @returns
   */
  async function createVoucher(updatedBalance: bigint, signer: HardhatEthersSigner) {
    const packed = ethers.solidityPacked(["uint256"], [updatedBalance]);
    const hashed = ethers.keccak256(packed);
    const arrayified = ethers.getBytes(hashed);

    const carolSig = await signer.signMessage(arrayified);

    const voucher = {
      updatedBalance,
      // TODO: change when viem will implement splitSignature
      sig: ethers.Signature.from(carolSig),
    };
    return voucher;
  }

  describe("Streamer.sol", function () {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    let contractArtifact: string;
    if (contractAddress) {
      contractArtifact = `contracts/download-${contractAddress}.sol:Streamer`;
    } else {
      contractArtifact = "contracts/Streamer.sol:Streamer";
    }

    it("Should deploy the contract", async function () {
      const streamerFct = await ethers.getContractFactory(contractArtifact);
      streamerContract = (await streamerFct.deploy()) as Streamer;
      const streamerContractAddress = await streamerContract.getAddress();
      console.log("\t", "🛫 Contract deployed", streamerContractAddress);
    });

    it("Should allow channel funding & emit Opened event", async function () {
      console.log("\t", "💸 Funding first channel...");
      const fundingTx = await streamerContract.fundChannel({
        value: ethers.parseEther("1"),
      });
      console.log("\t", "⏫  Checking emit");
      await expect(fundingTx).to.emit(streamerContract, "Opened");
    });

    it("Should refuse multiple funding from single user", async function () {
      console.log("\t", "🔃 Attempting to fund the channel again...");
      await expect(
        streamerContract.fundChannel({
          value: ethers.parseEther("1"), // first funded channel
        }),
      ).to.be.reverted;
    });

    it("Should allow multiple client channels", async function () {
      const [, alice, bob] = await ethers.getSigners();

      console.log("\t", "💸 Funding a second channel...");
      await expect(
        streamerContract.connect(alice).fundChannel({
          value: ethers.parseEther("1"), // second funded channel
        }),
      ).to.emit(streamerContract, "Opened");

      console.log("\t", "💸 Funding a third channel...");
      await expect(
        streamerContract.connect(bob).fundChannel({
          value: ethers.parseEther("1"), // third funded channel
        }),
      ).to.emit(streamerContract, "Opened");

      console.log("\t", "💵 Expecting contract balance to equal 3...");
      await assertBalance("3"); // running total
    });

    it("Should allow legitimate withdrawals", async function () {
      const [deployer, alice] = await ethers.getSigners();

      const deployerBalance = await network.provider.send("eth_getBalance", [deployer.address]);
      const updatedBalance = ethers.parseEther("0.5"); // cut channel balance from 1 -> 0.5
      console.log("\t", "📩 Creating voucher...");
      const voucher = await createVoucher(updatedBalance, alice);

      console.log("\t", "🔼 Expecting to withdraw funds and emit Withdrawn...");
      await expect(streamerContract.withdrawEarnings(voucher)).to.emit(streamerContract, "Withdrawn");
      console.log("\t", "💵 Expecting contract balance to equal 2.5...");
      await assertBalance("2.5"); // 3 - 0.5 = 2.5
      const finalDeployerBalance = await network.provider.send("eth_getBalance", [deployer.address]);
      await expect(finalDeployerBalance).to.be.approximately(
        BigInt(deployerBalance) + updatedBalance,
        // gas for withdrawEarnings
        ethers.parseEther("0.01"),
      );
    });

    it("Should refuse redundant withdrawals", async function () {
      const [, alice] = await ethers.getSigners();

      const updatedBalance = ethers.parseEther("0.5"); // equal to the current balance, should fail
      console.log("\t", "📩 Creating voucher...");
      const voucher = await createVoucher(updatedBalance, alice);

      console.log("\t", "🛑 Attempting a redundant withdraw...");
      await expect(streamerContract.withdrawEarnings(voucher)).to.be.reverted;
      console.log("\t", "💵 Expecting contract balance to equal 2.5...");
      await assertBalance("2.5"); // contract total unchanged because withdrawal fails
    });

    it("Should refuse illegitimate withdrawals", async function () {
      const [, , , carol] = await ethers.getSigners(); // carol has no open channel

      const updatedBalance = ethers.parseEther("0.5");
      console.log("\t", "📩 Creating voucher...");
      const voucher = await createVoucher(updatedBalance, carol);

      console.log("\t", "🛑 Attempting an illegitimate withdraw...");
      await expect(streamerContract.withdrawEarnings(voucher)).to.be.reverted;
      console.log("\t", "💵 Expecting contract balance to equal 2.5...");
      await assertBalance("2.5"); // contract total unchanged because carol has no channel
    });

    it("Should refuse defunding when no challenge has been registered", async function () {
      const [, , bob] = await ethers.getSigners();

      console.log("\t", "🛑 Attempting illegitimate defundChannel...");
      await expect(streamerContract.connect(bob).defundChannel()).to.be.reverted;
      console.log("\t", "💵 Expecting contract balance to equal 2.5...");
      await assertBalance("2.5"); // contract total unchanged because defund fails
    });

    it("Should emit a Challenged event", async function () {
      const [, , bob] = await ethers.getSigners();
      await expect(streamerContract.connect(bob).challengeChannel()).to.emit(streamerContract, "Challenged");
      console.log("\t", "💵 Expecting contract balance to equal 2.5...");
      await assertBalance("2.5"); // contract total unchanged because challenge does not move funds
    });

    it("Should refuse defunding during the challenge period", async function () {
      const [, , bob] = await ethers.getSigners();

      console.log("\t", "🛑 Attempting illegitimate defundChannel...");
      await expect(streamerContract.connect(bob).defundChannel()).to.be.reverted;
      console.log("\t", "💵 Expecting contract balance to equal 2.5...");
      await assertBalance("2.5"); // contract total unchanged becaues defund fails
    });

    it("Should allow defunding after the challenge period", async function () {
      const [, , bob] = await ethers.getSigners();

      const initBobBalance = await network.provider.send("eth_getBalance", [bob.address]);
      console.log("\t", "💰 Initial user balance:", ethers.formatEther(initBobBalance));
      console.log("\t", "🕐 Increasing time...");
      network.provider.send("evm_increaseTime", [3600]); // fast-forward one hour
      network.provider.send("evm_mine");

      console.log("\t", "💲 Attempting a legitimate defundChannel...");
      await expect(streamerContract.connect(bob).defundChannel()).to.emit(streamerContract, "Closed");
      console.log("\t", "💵 Expecting contract balance to equal 1.5...");
      await assertBalance("1.5"); // 2.5-1 = 1.5 (bob defunded his unused channel)

      const finalBobBalance = await network.provider.send("eth_getBalance", [bob.address]);

      console.log("\t", "💰 User's final balance:", ethers.formatEther(finalBobBalance));
      // check that bob's channel balance returned to bob's address
      const difference = BigInt(finalBobBalance) - BigInt(initBobBalance);
      console.log("\t", "💵 Checking that final balance went up by ~1 eth. Increase", ethers.formatEther(difference));
      assert(difference > ethers.parseEther("0.99"));
    });
  });
});
