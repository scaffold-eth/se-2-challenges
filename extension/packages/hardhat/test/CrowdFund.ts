//
// This script executes when you run 'yarn test'
//
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { FundingRecipient, CrowdFund } from "../typechain-types";

describe("🚩 Challenge: 📣 Crowdfunding App", function () {
  let fundingRecipient: FundingRecipient;
  let crowdFundContract: CrowdFund;

  describe("CrowdFund", function () {
    const contractAddress = process.env.CONTRACT_ADDRESS;

    let contractArtifact: string;
    if (contractAddress) {
      // For the autograder.
      contractArtifact = `contracts/download-${contractAddress}.sol:CrowdFund`;
    } else {
      contractArtifact = "contracts/CrowdFund.sol:CrowdFund";
    }

    it("Should deploy FundingRecipient", async function () {
      const FundingRecipientFactory = await ethers.getContractFactory("FundingRecipient");
      fundingRecipient = (await FundingRecipientFactory.deploy()) as FundingRecipient;
    });

    it("Should deploy CrowdFund", async function () {
      const CrowdFundFactory = await ethers.getContractFactory(contractArtifact);
      crowdFundContract = (await CrowdFundFactory.deploy(await fundingRecipient.getAddress())) as CrowdFund;
      console.log("\t", "🛰 CrowdFund contract deployed on", await crowdFundContract.getAddress());
    });

    describe("contribute()", function () {
      it("Balance should go up when you contribute()", async function () {
        const [owner] = await ethers.getSigners();

        console.log("\t", "🧑 🏫 Tester address:", owner.address);

        const startingBalance = await crowdFundContract.balances(owner.address);
        console.log("\t", "⚖️ Starting balance:", Number(startingBalance));

        console.log("\t", "🔨 Contributing...");
        const contributeResult = await crowdFundContract.contribute({
          value: ethers.parseEther("0.001"),
        });

        console.log("\t", "⏳ Waiting for confirmation...");
        const txResult = await contributeResult.wait();
        expect(txResult?.status).to.equal(1);

        const newBalance = await crowdFundContract.balances(owner.address);
        console.log("\t", "🔎 New balance:", ethers.formatEther(newBalance));
        expect(newBalance).to.equal(startingBalance + ethers.parseEther("0.001"));
      });

      if (process.env.CONTRACT_ADDRESS) {
        console.log("Since we will run this test on a live contract, this is as far as the automated tests will go.");
      } else {
        it("If enough is contributed and time has passed, you should be able to complete", async function () {
          const timeLeft1 = await crowdFundContract.timeLeft();
          console.log("\t", "⏱ There should be some time left:", Number(timeLeft1));
          expect(Number(timeLeft1)).to.greaterThan(0);

          console.log("\t", "🚀 Contributing a full ether...");
          await crowdFundContract.contribute({
            value: ethers.parseEther("1"),
          });

          console.log("\t", "⌛️ Fast forward time...");
          await network.provider.send("evm_increaseTime", [72 * 3600]);
          await network.provider.send("evm_mine");

          const timeLeft2 = await crowdFundContract.timeLeft();
          console.log("\t", "⏱ Time should be up now:", Number(timeLeft2));
          expect(Number(timeLeft2)).to.equal(0);

          console.log("\t", "🎉 Calling execute");
          await crowdFundContract.execute();

          const result = await fundingRecipient.completed();
          console.log("\t", "🥁 Complete:", result);
          expect(result).to.equal(true);
        });

        it("Should redeploy CrowdFund, contribute, not get enough, and withdraw", async function () {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [owner, secondAccount] = await ethers.getSigners();

          const FundingRecipientFactory = await ethers.getContractFactory("FundingRecipient");
          fundingRecipient = (await FundingRecipientFactory.deploy()) as FundingRecipient;
          const fundingRecipientAddress = await fundingRecipient.getAddress();

          const CrowdFundFactory = await ethers.getContractFactory("CrowdFund");
          crowdFundContract = (await CrowdFundFactory.deploy(fundingRecipientAddress)) as CrowdFund;

          console.log("\t", "🔨 Contributing...");
          const contributeResult = await crowdFundContract.connect(secondAccount).contribute({
            value: ethers.parseEther("0.001"),
          });

          console.log("\t", "⏳ Waiting for confirmation...");
          const txResult = await contributeResult.wait();
          expect(txResult?.status).to.equal(1);

          console.log("\t", "⌛️ Fast forward time...");
          await network.provider.send("evm_increaseTime", [72 * 3600]);
          await network.provider.send("evm_mine");

          console.log("\t", "🎉 Calling execute");
          await crowdFundContract.execute();

          const result = await fundingRecipient.completed();
          console.log("\t", "🥁 Complete should be false:", result);
          expect(result).to.equal(false);

          const startingBalance = await ethers.provider.getBalance(secondAccount.address);

          console.log("\t", "💵 Calling withdraw");
          const withdrawResult = await crowdFundContract.connect(secondAccount).withdraw();

          const tx = await ethers.provider.getTransaction(withdrawResult.hash);
          if (!tx) {
            throw new Error("Cannot resolve transaction");
          }

          const receipt = await ethers.provider.getTransactionReceipt(withdrawResult.hash);
          if (!receipt) {
            throw new Error("Cannot resolve receipt");
          }

          const gasCost = tx.gasPrice * receipt.gasUsed;

          const endingBalance = await ethers.provider.getBalance(secondAccount.address);
          expect(endingBalance).to.equal(startingBalance + ethers.parseEther("0.001") - gasCost);
        });
      }
    });
  });
});
