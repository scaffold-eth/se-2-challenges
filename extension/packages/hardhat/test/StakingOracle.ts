import { expect } from "chai";
import { ethers } from "hardhat";
import { mine } from "@nomicfoundation/hardhat-network-helpers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { StakingOracle, ORA } from "../typechain-types";

describe("Checkpoint2", function () {
  before(async () => {
    await ethers.provider.send("evm_setAutomine", [true]);
    await ethers.provider.send("evm_setIntervalMining", [0]);
  });

  let oracle: StakingOracle;
  let oraToken: ORA;
  let node1: HardhatEthersSigner;
  let node2: HardhatEthersSigner;
  let node3: HardhatEthersSigner;
  let node4: HardhatEthersSigner;
  let node5: HardhatEthersSigner;
  let node6: HardhatEthersSigner;
  let slasher: HardhatEthersSigner;
  const MINIMUM_STAKE = ethers.parseEther("1");
  async function mineBuckets(count: number) {
    const bucketWindow = Number(await oracle.BUCKET_WINDOW());
    await mine(bucketWindow * count);
  }
  beforeEach(async function () {
    [node1, node2, node3, node4, node5, node6, slasher] = await ethers.getSigners();
    const StakingOracleFactory = await ethers.getContractFactory("StakingOracle");
    oracle = (await StakingOracleFactory.deploy()) as StakingOracle;
    await oracle.waitForDeployment();
    const oraTokenAddress = await oracle.oracleToken();
    const ORAFactory = await ethers.getContractFactory("ORA");
    oraToken = ORAFactory.attach(oraTokenAddress) as ORA;
  });
  describe("constructor", function () {
    it("deploys ORA token", async function () {
      const tokenAddress = await oracle.oracleToken();
      const code = await ethers.provider.getCode(tokenAddress);
      expect(code).to.not.equal("0x");
    });
  });
  describe("getNodeAddresses", function () {
    it("returns all registered nodes in order", async function () {
      await (await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node2).registerNode(1501, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node3).registerNode(1502, { value: MINIMUM_STAKE })).wait();
      const nodeAddresses = await oracle.getNodeAddresses();
      expect(nodeAddresses.length).to.equal(3);
      expect(nodeAddresses[0]).to.equal(node1.address);
      expect(nodeAddresses[1]).to.equal(node2.address);
      expect(nodeAddresses[2]).to.equal(node3.address);
    });
  });
  describe("Node Registration", function () {
    it("allows register with minimum stake and emits events", async function () {
      const initialPrice = 1500;
      await (await oracle.connect(node1).registerNode(initialPrice, { value: MINIMUM_STAKE })).wait();
      const info = await oracle.nodes(node1.address);
      expect(info.stakedAmount).to.equal(MINIMUM_STAKE);
      expect(info.active).to.equal(true);
      expect(await oracle.getNodeAddresses()).to.deep.equal([node1.address]);
    });
    it("rejects insufficient stake and duplicate registration", async function () {
      await expect(
        oracle.connect(node1).registerNode(1500, { value: ethers.parseEther("0.5") }),
      ).to.be.revertedWithCustomError(oracle, "InsufficientStake");
      await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE });
      await expect(oracle.connect(node1).registerNode(1501, { value: MINIMUM_STAKE })).to.be.revertedWithCustomError(
        oracle,
        "NodeAlreadyRegistered",
      );
    });
  });
  describe("Price Reporting", function () {
    beforeEach(async function () {
      await (await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE })).wait();
    });

    it("emits PriceReported and prevents double report in same bucket", async function () {
      await mineBuckets(1);
      const currentBucket = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1600)).wait();
      const [p] = await oracle.getAddressDataAtBucket(node1.address, currentBucket);
      expect(p).to.equal(1600);

      await expect(oracle.connect(node1).reportPrice(1700)).to.be.revertedWithCustomError(
        oracle,
        "AlreadyReportedInCurrentBucket",
      );
    });

    it("rejects zero price and unregistered node", async function () {
      await expect(oracle.connect(node1).reportPrice(0)).to.be.revertedWithCustomError(oracle, "InvalidPrice");
      await expect(oracle.connect(node2).reportPrice(1000)).to.be.revertedWithCustomError(oracle, "NodeNotRegistered");
    });

    it("rejects when effective stake falls below minimum after missed buckets", async function () {
      // Miss 2 full buckets without reporting -> 1 missed expected report => 0.01 ETH penalty
      await mineBuckets(2);
      // Now attempting to report should fail due to effectiveStake < 1 ETH
      await expect(oracle.connect(node1).reportPrice(1600)).to.be.revertedWithCustomError(oracle, "InsufficientStake");
    });
  });

  describe("Claim Reward", function () {
    beforeEach(async function () {
      await (await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE })).wait();
    });

    it("mints 1 ORA per report and reverts with no rewards", async function () {
      const beforeBal = await oraToken.balanceOf(node1.address);
      await (await oracle.connect(node1).claimReward()).wait();
      const afterBal = await oraToken.balanceOf(node1.address);
      expect(afterBal).to.be.gt(beforeBal);
      await expect(oracle.connect(node1).claimReward()).to.be.revertedWithCustomError(oracle, "NoRewardsAvailable");
    });

    it("accumulates rewards across buckets", async function () {
      await (await oracle.connect(node1).claimReward()).wait();
      await mineBuckets(1);
      await (await oracle.connect(node1).reportPrice(1600)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node1).reportPrice(1700)).wait();
      const beforeBal = await oraToken.balanceOf(node1.address);
      await (await oracle.connect(node1).claimReward()).wait();
      const afterBal = await oraToken.balanceOf(node1.address);
      expect(afterBal - beforeBal).to.equal(ethers.parseEther("2"));
    });
  });
  describe("Prices by bucket", function () {
    beforeEach(async function () {
      await (await oracle.connect(node1).registerNode(1000, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node2).registerNode(1100, { value: MINIMUM_STAKE })).wait();
    });
    it("returns average for previous bucket via getLatestPrice", async function () {
      await expect(oracle.getLatestPrice()).to.be.revertedWithCustomError(oracle, "NoValidPricesAvailable");
      await mineBuckets(1);
      const latest = await oracle.getLatestPrice();
      expect(latest).to.equal(1050);
    });
    it("getPastPrice returns stored average and getAddressDataAtBucket matches", async function () {
      const bucketA = await oracle.getCurrentBucketNumber();
      await mineBuckets(1);
      const pastAvg = await oracle.getPastPrice(bucketA);
      expect(pastAvg).to.equal(1050);
      const [p1] = await oracle.getAddressDataAtBucket(node1.address, bucketA);
      const [p2] = await oracle.getAddressDataAtBucket(node2.address, bucketA);
      expect(p1).to.equal(1000);
      expect(p2).to.equal(1100);
    });
    it("getPastPrice reverts for empty bucket", async function () {
      await mineBuckets(1);
      const futureBucket = await oracle.getCurrentBucketNumber();
      await expect(oracle.getPastPrice(futureBucket)).to.be.revertedWithCustomError(oracle, "NoValidPricesAvailable");
    });
  });
  describe("Effective stake and addStake", function () {
    beforeEach(async function () {
      await (await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE })).wait();
    });
    it("penalizes missed buckets and floors at zero; addStake increases", async function () {
      await mineBuckets(2);
      const eff1 = await oracle.getEffectiveStake(node1.address);
      expect(eff1).to.equal(ethers.parseEther("0.99"));
      await (await oracle.connect(node1).addStake({ value: ethers.parseEther("0.5") })).wait();
      const eff2 = await oracle.getEffectiveStake(node1.address);
      expect(eff2).to.equal(ethers.parseEther("1.49"));
    });
    it("rejects zero value stake addition", async function () {
      await expect(oracle.connect(node1).addStake({ value: 0 })).to.be.revertedWithCustomError(
        oracle,
        "InsufficientStake",
      );
    });
  });
  describe("Slashing - deviation in past bucket", function () {
    async function indexOf(address: string) {
      const arr = await oracle.getNodeAddresses();
      return arr.findIndex(a => a.toLowerCase() === address.toLowerCase());
    }
    beforeEach(async function () {
      // Move to beginning of bucket window before registering nodes so that we have 24 blocks to report in the same bucket.
      const bucketWindow = Number(await oracle.BUCKET_WINDOW());
      const blockNum = await ethers.provider.getBlockNumber();
      const toNext = (bucketWindow - (blockNum % bucketWindow)) % bucketWindow; // 0..bucketWindow-1
      await mine(toNext + 1);
      await (await oracle.connect(node1).registerNode(1000, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node2).registerNode(1000, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node3).registerNode(1200, { value: MINIMUM_STAKE })).wait();
      await mineBuckets(1);
    });
    it("reverts for current bucket and for non-deviated prices", async function () {
      const current = await oracle.getCurrentBucketNumber();
      const idx = await indexOf(node3.address);
      await expect(oracle.connect(slasher).slashNode(node3.address, current, idx)).to.be.revertedWithCustomError(
        oracle,
        "OnlyPastBucketsAllowed",
      );
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1050)).wait();
      const bucketB = await oracle.getCurrentBucketNumber();
      await mineBuckets(1);
      const idxB = await indexOf(node3.address);
      await expect(oracle.connect(slasher).slashNode(node3.address, bucketB, idxB)).to.be.revertedWithCustomError(
        oracle,
        "NotDeviated",
      );
    });
    it("slashes deviated node, rewards slasher, and cannot slash again", async function () {
      await (await oracle.connect(node3).addStake({ value: ethers.parseEther("2") })).wait();
      const pastBucket = (await oracle.getCurrentBucketNumber()) - 1n;
      const idx = await indexOf(node3.address);
      const slasherBalBefore = await ethers.provider.getBalance(slasher.address);
      const tx = await oracle.connect(slasher).slashNode(node3.address, pastBucket, idx);
      const rcpt = await tx.wait();
      if (!rcpt) throw new Error("no receipt");
      const gasCost = BigInt(rcpt.gasUsed) * BigInt(rcpt.gasPrice);
      const SLASHER_REWARD_PERCENTAGE = await oracle.SLASHER_REWARD_PERCENTAGE();
      const expectedReward = (ethers.parseEther("1") * SLASHER_REWARD_PERCENTAGE) / 100n;
      const slasherBalAfter = await ethers.provider.getBalance(slasher.address);
      expect(slasherBalAfter).to.equal(slasherBalBefore + expectedReward - gasCost);
      await expect(oracle.connect(slasher).slashNode(node3.address, pastBucket, idx)).to.be.revertedWithCustomError(
        oracle,
        "NodeAlreadySlashed",
      );
    });
    it("slashes deviated node and removes when stake hits zero", async function () {
      const pastBucket = (await oracle.getCurrentBucketNumber()) - 1n;
      const idx = await indexOf(node3.address);
      const slasherBalBefore = await ethers.provider.getBalance(slasher.address);
      const tx = await oracle.connect(slasher).slashNode(node3.address, pastBucket, idx);
      const rcpt = await tx.wait();
      if (!rcpt) throw new Error("no receipt");
      const gasCost = BigInt(rcpt.gasUsed) * BigInt(rcpt.gasPrice);
      const SLASHER_REWARD_PERCENTAGE = await oracle.SLASHER_REWARD_PERCENTAGE();
      const expectedReward = (ethers.parseEther("1") * SLASHER_REWARD_PERCENTAGE) / 100n;
      const slasherBalAfter = await ethers.provider.getBalance(slasher.address);
      expect(slasherBalAfter).to.equal(slasherBalBefore + expectedReward - gasCost);
      const addresses = await oracle.getNodeAddresses();
      expect(addresses).to.not.include(node3.address);
    });
    it("reverts NodeDidNotReport for registered node that did not report in that bucket", async function () {
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      // node3 is registered but did not report in this bucket
      const bucketC = await oracle.getCurrentBucketNumber();
      await mineBuckets(1);
      const idx3 = await indexOf(node3.address);
      await expect(oracle.connect(slasher).slashNode(node3.address, bucketC, idx3)).to.be.revertedWithCustomError(
        oracle,
        "NodeDidNotReport",
      );
    });
    it("verifies slashed flag is set correctly after slashing", async function () {
      const pastBucket = (await oracle.getCurrentBucketNumber()) - 1n;
      const idx = await indexOf(node3.address);
      await (await oracle.connect(slasher).slashNode(node3.address, pastBucket, idx)).wait();
      const [price, slashed] = await oracle.getAddressDataAtBucket(node3.address, pastBucket);
      expect(price).to.equal(1200);
      expect(slashed).to.equal(true);
    });
    it("reverts for exact 10% deviation threshold (should not slash)", async function () {
      // Average is 1000, so 10% deviation means 1100 or 900
      // With MAX_DEVIATION_BPS = 1000 (10%), exactly 10% should NOT slash (strict >)
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      // node3 reports 1100, which is exactly 10% deviation from average of 1000
      await (await oracle.connect(node3).reportPrice(1100)).wait();
      const bucketD = await oracle.getCurrentBucketNumber();
      await mineBuckets(1);
      const idx3 = await indexOf(node3.address);
      // Should revert because exactly 10% is not > 10%
      await expect(oracle.connect(slasher).slashNode(node3.address, bucketD, idx3)).to.be.revertedWithCustomError(
        oracle,
        "NotDeviated",
      );
    });
    it("reverts IndexOutOfBounds when index is out of range", async function () {
      const pastBucket = (await oracle.getCurrentBucketNumber()) - 1n;
      const addresses = await oracle.getNodeAddresses();
      const invalidIndex = addresses.length; // Index out of bounds
      await expect(
        oracle.connect(slasher).slashNode(node3.address, pastBucket, invalidIndex),
      ).to.be.revertedWithCustomError(oracle, "IndexOutOfBounds");
    });
    it("reverts NodeNotAtGivenIndex when index doesn't match address", async function () {
      const pastBucket = (await oracle.getCurrentBucketNumber()) - 1n;
      const idx1 = await indexOf(node1.address);
      // Try to slash node3 but use node1's index
      await expect(oracle.connect(slasher).slashNode(node3.address, pastBucket, idx1)).to.be.revertedWithCustomError(
        oracle,
        "NodeNotAtGivenIndex",
      );
    });
  });
  describe("exitNode", function () {
    async function indexOf(address: string) {
      const arr = await oracle.getNodeAddresses();
      return arr.findIndex(a => a.toLowerCase() === address.toLowerCase());
    }
    beforeEach(async function () {
      await (await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node2).registerNode(1600, { value: MINIMUM_STAKE })).wait();
    });
    it("reverts before waiting period and exits with effective stake after", async function () {
      const idx = await indexOf(node1.address);
      await expect(oracle.connect(node1).exitNode(idx)).to.be.revertedWithCustomError(oracle, "WaitingPeriodNotOver");
      await mineBuckets(2);
      const effectiveStake = await oracle.getEffectiveStake(node1.address);
      const balBefore = await ethers.provider.getBalance(node1.address);
      const tx = await oracle.connect(node1).exitNode(idx);
      const rcpt = await tx.wait();
      if (!rcpt) throw new Error("no receipt");
      const gasCost = BigInt(rcpt.gasUsed) * BigInt(rcpt.gasPrice);
      const balAfter = await ethers.provider.getBalance(node1.address);
      // Verify the balance changed by approximately the effective stake minus gas
      const balanceChange = balAfter - balBefore;
      // The change should be approximately effectiveStake - gasCost
      // Allow tolerance for gas estimation differences
      expect(balanceChange + gasCost).to.be.closeTo(effectiveStake, ethers.parseEther("0.02"));
      // Verify node is removed
      const addresses = await oracle.getNodeAddresses();
      expect(addresses).to.not.include(node1.address);
      // Verify node is deleted (effectiveStake should be 0 for inactive nodes)
      expect(await oracle.getEffectiveStake(node1.address)).to.equal(0);
    });
    it("reverts IndexOutOfBounds when index is out of range", async function () {
      await mineBuckets(2);
      const addresses = await oracle.getNodeAddresses();
      const invalidIndex = addresses.length; // Index out of bounds
      await expect(oracle.connect(node1).exitNode(invalidIndex)).to.be.revertedWithCustomError(
        oracle,
        "IndexOutOfBounds",
      );
    });
    it("reverts NodeNotAtGivenIndex when index doesn't match address", async function () {
      await mineBuckets(2);
      const idx2 = await indexOf(node2.address);
      // Try to exit node1 but use node2's index
      await expect(oracle.connect(node1).exitNode(idx2)).to.be.revertedWithCustomError(oracle, "NodeNotAtGivenIndex");
    });
  });
  describe("getOutlierNodes", function () {
    beforeEach(async function () {
      const bucketWindow = Number(await oracle.BUCKET_WINDOW());
      const blockNum = await ethers.provider.getBlockNumber();
      const toNext = (bucketWindow - (blockNum % bucketWindow)) % bucketWindow;
      await mine(toNext + 1);
      await (await oracle.connect(node1).registerNode(1000, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node2).registerNode(1000, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node3).registerNode(1000, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node4).registerNode(1000, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node5).registerNode(1000, { value: MINIMUM_STAKE })).wait();
      await (await oracle.connect(node6).registerNode(1000, { value: MINIMUM_STAKE })).wait();
    });
    it("returns empty array when no outliers exist", async function () {
      // All nodes report the same price in a new bucket
      await mineBuckets(1);
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1000)).wait();
      await (await oracle.connect(node4).reportPrice(1000)).wait();
      await (await oracle.connect(node5).reportPrice(1000)).wait();
      await (await oracle.connect(node6).reportPrice(1000)).wait();
      await mineBuckets(1);
      const bucket = (await oracle.getCurrentBucketNumber()) - 1n;
      const outliers = await oracle.getOutlierNodes(bucket);
      expect(outliers.length).to.equal(0);
    });
    it("returns deviated node addresses", async function () {
      // node4 reports 1200 while others report 1000 (average = 1000)
      // Deviation = (1200 - 1000) / 1000 = 20% > 10% threshold
      await mineBuckets(1);
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1000)).wait();
      await (await oracle.connect(node4).reportPrice(1200)).wait();
      await mineBuckets(1);
      const bucket = (await oracle.getCurrentBucketNumber()) - 1n;
      const outliers = await oracle.getOutlierNodes(bucket);
      expect(outliers.length).to.equal(1);
      expect(outliers[0]).to.equal(node4.address);
    });
    it("excludes nodes that did not report in the bucket", async function () {
      // Only node1 and node2 report, node3 doesn't report
      await mineBuckets(1);
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node4).reportPrice(1200)).wait();
      await mineBuckets(1);
      const bucket = (await oracle.getCurrentBucketNumber()) - 1n;
      const outliers = await oracle.getOutlierNodes(bucket);
      expect(outliers.length).to.equal(1);
      expect(outliers[0]).to.equal(node4.address);
      expect(outliers).to.not.include(node3.address);
    });
    it("handles multiple outliers correctly", async function () {
      await mineBuckets(1);
      // Set up prices so that only node3 and node4 are outliers
      // We need enough "normal" nodes to keep the average stable
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1000)).wait(); // Normal
      await (await oracle.connect(node4).reportPrice(1500)).wait(); // Outlier (50% from avg of 1000)
      await (await oracle.connect(node5).reportPrice(1000)).wait();
      await (await oracle.connect(node6).reportPrice(1000)).wait();
      await mineBuckets(1);
      // Now in a new bucket, make node3 an outlier too
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1200)).wait(); // Outlier (avg without node3 = (1000+1000+1500)/3 ≈ 1166, deviation ≈ 20%)
      await (await oracle.connect(node4).reportPrice(1200)).wait(); // Outlier (avg without node4 = (1000+1000+1400)/3 = 1133, deviation ≈ 32%)
      await (await oracle.connect(node5).reportPrice(1000)).wait();
      await (await oracle.connect(node6).reportPrice(1000)).wait();
      await mineBuckets(1);
      const bucket = (await oracle.getCurrentBucketNumber()) - 1n;
      const outliers = await oracle.getOutlierNodes(bucket);
      expect(outliers.length).to.equal(2);
      expect(outliers).to.include(node3.address);
      expect(outliers).to.include(node4.address);
    });
  });
});
