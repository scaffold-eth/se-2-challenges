import { expect } from "chai";
import { network } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";
import type { StakingOracle, ORA } from "../types/ethers-contracts/index.js";

describe("Checkpoint2 - StakingOracle", function () {
  let ethers: Awaited<ReturnType<typeof network.create>>["ethers"];
  let networkHelpers: Awaited<ReturnType<typeof network.create>>["networkHelpers"];

  before(async () => {
    ({ ethers, networkHelpers } = await network.create());
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

  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (contractAddress) {
    // If env variable is set then skip this test file (for the auto-grader)
    return true;
  }

  async function mineBuckets(count: number) {
    const bucketWindow = Number(await oracle.BUCKET_WINDOW());
    await networkHelpers.mine(bucketWindow * count);
  }

  async function moveToFreshBucket() {
    // Ensure we have plenty of blocks left in the current bucket so a multi-tx reporting sequence
    // doesn't accidentally cross a bucket boundary mid-test.
    const bucketWindow = Number(await oracle.BUCKET_WINDOW());
    const blockNum = await ethers.provider.getBlockNumber();
    const toNext = (bucketWindow - (blockNum % bucketWindow)) % bucketWindow; // 0..bucketWindow-1
    await networkHelpers.mine(toNext + 1);
  }

  async function oracleAddr() {
    return await oracle.getAddress();
  }

  async function stakeForDelayedFirstReport() {
    // If a node registers and doesn't report in its registration bucket, it will be penalized
    // once the bucket advances. Give enough buffer so tests can safely mine buckets before first report.
    const MINIMUM_STAKE = await oracle.MINIMUM_STAKE();
    const INACTIVITY_PENALTY = await oracle.INACTIVITY_PENALTY();
    // Buffer several missed buckets to avoid edge cases where setup txs + mining advance multiple buckets.
    return MINIMUM_STAKE + 10n * INACTIVITY_PENALTY;
  }

  async function fundApproveAndRegister(node: HardhatEthersSigner, amount: bigint) {
    // node1 is the ORA deployer and is minted a huge ORA balance in the ORA constructor.
    if (node.address.toLowerCase() !== node1.address.toLowerCase()) {
      await (await oraToken.connect(node1).transfer(node.address, amount)).wait();
    }
    await (await oraToken.connect(node).approve(await oracleAddr(), amount)).wait();
    await (await oracle.connect(node).registerNode(amount)).wait();
  }

  async function indexOfNodeAddress(address: string) {
    const arr = await oracle.getNodeAddresses();
    return arr.findIndex(a => a.toLowerCase() === address.toLowerCase());
  }

  beforeEach(async function () {
    [node1, node2, node3, node4, node5, node6, slasher] = await ethers.getSigners();
    const ORAFactory = await ethers.getContractFactory("ORA");
    oraToken = (await ORAFactory.deploy()) as unknown as ORA;
    await oraToken.waitForDeployment();

    const StakingOracleFactory = await ethers.getContractFactory("StakingOracle");
    oracle = (await StakingOracleFactory.deploy(await oraToken.getAddress())) as StakingOracle;
    await oracle.waitForDeployment();

    // StakingOracle must own the ORA token to mint rewards
    await (await oraToken.transferOwnership(await oracle.getAddress())).wait();
  });
  describe("constructor", function () {
    it("wires the provided ORA token", async function () {
      const tokenAddress = await oracle.oracleToken();
      expect(tokenAddress).to.equal(await oraToken.getAddress());
    });

    it("mints ORA to deployer via token constructor", async function () {
      const bal = await oraToken.balanceOf(node1.address);
      expect(bal).to.be.gt(0n);
    });
  });
  describe("getNodeAddresses", function () {
    it("returns all registered nodes in order", async function () {
      const MINIMUM_STAKE = await oracle.MINIMUM_STAKE();
      await fundApproveAndRegister(node1, MINIMUM_STAKE);
      await fundApproveAndRegister(node2, MINIMUM_STAKE);
      await fundApproveAndRegister(node3, MINIMUM_STAKE);
      const nodeAddresses = await oracle.getNodeAddresses();
      expect(nodeAddresses.length).to.equal(3);
      expect(nodeAddresses[0]).to.equal(node1.address);
      expect(nodeAddresses[1]).to.equal(node2.address);
      expect(nodeAddresses[2]).to.equal(node3.address);
    });
  });
  describe("Node Registration", function () {
    it("allows register with minimum stake and emits events", async function () {
      const MINIMUM_STAKE = await oracle.MINIMUM_STAKE();
      await (await oraToken.connect(node1).approve(await oracleAddr(), MINIMUM_STAKE)).wait();
      await expect(oracle.connect(node1).registerNode(MINIMUM_STAKE))
        .to.emit(oracle, "NodeRegistered")
        .withArgs(node1.address, MINIMUM_STAKE);
      const info = await oracle.nodes(node1.address);
      expect(info.stakedAmount).to.equal(MINIMUM_STAKE);
      expect(info.active).to.equal(true);
      expect(info.reportCount).to.equal(0n);
      expect(info.claimedReportCount).to.equal(0n);
      expect(await oracle.getNodeAddresses()).to.deep.equal([node1.address]);
    });
    it("rejects insufficient stake and duplicate registration", async function () {
      const MINIMUM_STAKE = await oracle.MINIMUM_STAKE();
      await expect(oracle.connect(node1).registerNode(MINIMUM_STAKE - 1n)).to.be.revertedWithCustomError(
        oracle,
        "InsufficientStake",
      );
      await (await oraToken.connect(node1).approve(await oracleAddr(), MINIMUM_STAKE)).wait();
      await oracle.connect(node1).registerNode(MINIMUM_STAKE);
      await (await oraToken.connect(node1).approve(await oracleAddr(), MINIMUM_STAKE)).wait();
      await expect(oracle.connect(node1).registerNode(MINIMUM_STAKE)).to.be.revertedWithCustomError(
        oracle,
        "NodeAlreadyRegistered",
      );
    });
  });
  describe("Price Reporting", function () {
    beforeEach(async function () {
      await fundApproveAndRegister(node1, await stakeForDelayedFirstReport());
    });

    it("emits PriceReported and prevents double report in same bucket", async function () {
      await mineBuckets(1);
      const tx = await oracle.connect(node1).reportPrice(1600);
      const rcpt = await tx.wait();
      if (!rcpt) throw new Error("no receipt");

      const parsed = rcpt.logs
        .map(log => {
          try {
            return oracle.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e?.name === "PriceReported");
      if (!parsed) throw new Error("PriceReported event not found");

      const reportedNode = parsed.args[0] as string;
      const reportedPrice = parsed.args[1] as bigint;
      const reportedBucket = parsed.args[2] as bigint;

      expect(reportedNode).to.equal(node1.address);
      expect(reportedPrice).to.equal(1600n);

      const [p, slashed] = await oracle.getSlashedStatus(node1.address, reportedBucket);
      expect(p).to.equal(1600n);
      expect(slashed).to.equal(false);

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
      // With exact MINIMUM_STAKE, missing 1 expected report applies INACTIVITY_PENALTY and drops below MINIMUM_STAKE.
      const MINIMUM_STAKE = await oracle.MINIMUM_STAKE();
      await fundApproveAndRegister(node2, MINIMUM_STAKE);
      await mineBuckets(1);
      await expect(oracle.connect(node2).reportPrice(1600)).to.be.revertedWithCustomError(oracle, "InsufficientStake");
    });
  });

  describe("Claim Reward", function () {
    beforeEach(async function () {
      await fundApproveAndRegister(node1, await stakeForDelayedFirstReport());
    });

    it("reverts when there are no unclaimed report rewards", async function () {
      await expect(oracle.connect(node1).claimReward()).to.be.revertedWithCustomError(oracle, "NoRewardsAvailable");
    });

    it("mints 1 ORA per report and reverts with no additional rewards", async function () {
      await mineBuckets(1);
      await (await oracle.connect(node1).reportPrice(1600)).wait();
      const beforeBal = await oraToken.balanceOf(node1.address);
      await (await oracle.connect(node1).claimReward()).wait();
      const afterBal = await oraToken.balanceOf(node1.address);
      const REWARD_PER_REPORT = await oracle.REWARD_PER_REPORT();
      expect(afterBal - beforeBal).to.equal(REWARD_PER_REPORT);
      await expect(oracle.connect(node1).claimReward()).to.be.revertedWithCustomError(oracle, "NoRewardsAvailable");
    });

    it("accumulates rewards across multiple buckets", async function () {
      await mineBuckets(1);
      await (await oracle.connect(node1).reportPrice(1600)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node1).reportPrice(1700)).wait();
      const beforeBal = await oraToken.balanceOf(node1.address);
      await (await oracle.connect(node1).claimReward()).wait();
      const afterBal = await oraToken.balanceOf(node1.address);
      const REWARD_PER_REPORT = await oracle.REWARD_PER_REPORT();
      expect(afterBal - beforeBal).to.equal(REWARD_PER_REPORT * 2n);
    });
  });
  describe("Prices by bucket", function () {
    beforeEach(async function () {
      const stake = await stakeForDelayedFirstReport();
      await fundApproveAndRegister(node1, stake);
      await fundApproveAndRegister(node2, stake);
      await moveToFreshBucket();
    });
    it("reverts getLatestPrice until a bucket median is recorded", async function () {
      await expect(oracle.getLatestPrice()).to.be.revertedWithCustomError(oracle, "MedianNotRecorded");
    });

    it("returns median for previous bucket via getLatestPrice after recordBucketMedian", async function () {
      await mineBuckets(1);
      const bucketA = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1100)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node6).recordBucketMedian(bucketA)).wait();
      const latest = await oracle.getLatestPrice();
      expect(latest).to.equal(1050n);
    });

    it("getPastPrice returns stored median for a finalized bucket", async function () {
      await mineBuckets(1);
      const bucketA = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1100)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node6).recordBucketMedian(bucketA)).wait();
      const pastMedian = await oracle.getPastPrice(bucketA);
      expect(pastMedian).to.equal(1050n);
      const [p1] = await oracle.getSlashedStatus(node1.address, bucketA);
      const [p2] = await oracle.getSlashedStatus(node2.address, bucketA);
      expect(p1).to.equal(1000n);
      expect(p2).to.equal(1100n);
    });

    it("getPastPrice reverts for bucket without recorded median", async function () {
      await mineBuckets(1);
      const futureBucket = await oracle.getCurrentBucketNumber();
      await expect(oracle.getPastPrice(futureBucket)).to.be.revertedWithCustomError(oracle, "MedianNotRecorded");
    });
  });
  describe("Effective stake and addStake", function () {
    beforeEach(async function () {
      await moveToFreshBucket();
      const MINIMUM_STAKE = await oracle.MINIMUM_STAKE();
      await fundApproveAndRegister(node1, MINIMUM_STAKE + 10n);
    });
    it("penalizes missed buckets and floors at zero; addStake increases", async function () {
      const INACTIVITY_PENALTY = await oracle.INACTIVITY_PENALTY();
      await mineBuckets(2);
      const eff1 = await oracle.getEffectiveStake(node1.address);
      // With 2 buckets elapsed since registration and 0 reports, expectedReports=2 so penalty = 2*INACTIVITY_PENALTY.
      const staked = (await oracle.nodes(node1.address)).stakedAmount;
      expect(eff1).to.equal(staked - 2n * INACTIVITY_PENALTY);

      const addAmount = 500n;
      await (await oraToken.connect(node1).approve(await oracleAddr(), addAmount)).wait();
      await (await oracle.connect(node1).addStake(addAmount)).wait();
      const eff2 = await oracle.getEffectiveStake(node1.address);
      expect(eff2).to.equal(staked + addAmount - 2n * INACTIVITY_PENALTY);
    });
    it("rejects zero value stake addition", async function () {
      await expect(oracle.connect(node1).addStake(0)).to.be.revertedWithCustomError(oracle, "InsufficientStake");
    });
  });
  describe("Slashing - deviation in past bucket", function () {
    beforeEach(async function () {
      // Ensure we have plenty of blocks left in the current bucket so setup txs + the first report
      // don't accidentally cross a bucket boundary and trigger an immediate inactivity penalty.
      await moveToFreshBucket();

      const MINIMUM_STAKE = await oracle.MINIMUM_STAKE();
      const stake = await stakeForDelayedFirstReport();
      await fundApproveAndRegister(node1, stake);
      await fundApproveAndRegister(node2, stake);

      // Keep node3 at exactly MINIMUM_STAKE so MISREPORT_PENALTY can fully slash to zero in removal-path tests.
      // To avoid inactivity penalties breaking future reports, have node3 report once immediately in its registration bucket.
      await fundApproveAndRegister(node3, MINIMUM_STAKE);
      await (await oracle.connect(node3).reportPrice(1000)).wait();
    });
    it("reverts for current bucket and for non-deviated prices", async function () {
      const current = await oracle.getCurrentBucketNumber();
      const node3AddressesIndex = await indexOfNodeAddress(node3.address);
      // reportIndex=0 is irrelevant here because current bucket check happens first
      await expect(
        oracle.connect(slasher).slashNode(node3.address, current, 0, node3AddressesIndex),
      ).to.be.revertedWithCustomError(oracle, "OnlyPastBucketsAllowed");

      await mineBuckets(1);
      const bucketB = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1050)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node4).recordBucketMedian(bucketB)).wait();
      const node3AddressesIndexB = await indexOfNodeAddress(node3.address);
      // node3 reported third in this bucket => reportIndex=2
      await expect(
        oracle.connect(slasher).slashNode(node3.address, bucketB, 2, node3AddressesIndexB),
      ).to.be.revertedWithCustomError(oracle, "NotDeviated");
    });
    it("slashes deviated node, rewards slasher, and cannot slash again", async function () {
      const MINIMUM_STAKE = await oracle.MINIMUM_STAKE();
      const extra = MINIMUM_STAKE; // ensure stake remains after MISREPORT_PENALTY
      // fund node3 for the extra stake (it spent its entire balance staking MINIMUM_STAKE in beforeEach)
      await (await oraToken.connect(node1).transfer(node3.address, extra)).wait();
      await (await oraToken.connect(node3).approve(await oracleAddr(), extra)).wait();
      await (await oracle.connect(node3).addStake(extra)).wait();

      await mineBuckets(1);
      const bucketB = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1200)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node4).recordBucketMedian(bucketB)).wait();

      const node3AddressesIndex = await indexOfNodeAddress(node3.address);
      const slasherBalBefore = await oraToken.balanceOf(slasher.address);
      const tx = await oracle.connect(slasher).slashNode(node3.address, bucketB, 2, node3AddressesIndex);
      await tx.wait();

      const SLASHER_REWARD_PERCENTAGE = await oracle.SLASHER_REWARD_PERCENTAGE();
      const MISREPORT_PENALTY = await oracle.MISREPORT_PENALTY();
      const expectedReward = (MISREPORT_PENALTY * SLASHER_REWARD_PERCENTAGE) / 100n;
      const slasherBalAfter = await oraToken.balanceOf(slasher.address);
      expect(slasherBalAfter - slasherBalBefore).to.equal(expectedReward);

      await expect(
        oracle.connect(slasher).slashNode(node3.address, bucketB, 2, node3AddressesIndex),
      ).to.be.revertedWithCustomError(oracle, "NodeAlreadySlashed");
    });
    it("slashes deviated node and removes when stake hits zero", async function () {
      await mineBuckets(1);
      const bucketB = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1200)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node4).recordBucketMedian(bucketB)).wait();

      const node3AddressesIndex = await indexOfNodeAddress(node3.address);
      await (await oracle.connect(slasher).slashNode(node3.address, bucketB, 2, node3AddressesIndex)).wait();

      const addresses = await oracle.getNodeAddresses();
      expect(addresses).to.not.include(node3.address);
      const infoAfter = await oracle.nodes(node3.address);
      expect(infoAfter.active).to.equal(false);
    });
    it("verifies slashed flag is set correctly after slashing", async function () {
      await mineBuckets(1);
      const bucketB = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1200)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node4).recordBucketMedian(bucketB)).wait();

      const node3AddressesIndex = await indexOfNodeAddress(node3.address);
      await (await oracle.connect(slasher).slashNode(node3.address, bucketB, 2, node3AddressesIndex)).wait();
      const [price, slashedFlag] = await oracle.getSlashedStatus(node3.address, bucketB);
      expect(price).to.equal(1200n);
      expect(slashedFlag).to.equal(true);
    });
    it("reverts for exact 10% deviation threshold (should not slash)", async function () {
      // Median is 1000, so 10% deviation means 1100 or 900.
      // With MAX_DEVIATION_BPS = 1000 (10%), exactly 10% should NOT slash (strict >).
      // NOTE: Because bucket boundaries depend on block.number and tests mine blocks, it’s possible to
      // advance more than 1 bucket between registration and this first report (due to setup txs).
      // Keep this test deterministic by topping up node3 so it always remains >= MINIMUM_STAKE.
      const MINIMUM_STAKE = await oracle.MINIMUM_STAKE();
      await (await oraToken.connect(node1).transfer(node3.address, MINIMUM_STAKE)).wait();
      await (await oraToken.connect(node3).approve(await oracleAddr(), MINIMUM_STAKE)).wait();
      await (await oracle.connect(node3).addStake(MINIMUM_STAKE)).wait();

      await mineBuckets(1);
      const bucketB = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1100)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node4).recordBucketMedian(bucketB)).wait();
      const node3AddressesIndex = await indexOfNodeAddress(node3.address);
      await expect(
        oracle.connect(slasher).slashNode(node3.address, bucketB, 2, node3AddressesIndex),
      ).to.be.revertedWithCustomError(oracle, "NotDeviated");
    });
    it("reverts IndexOutOfBounds when index is out of range", async function () {
      // Trigger the removal path (stake -> 0) and provide an invalid nodeAddressesIndex.
      await mineBuckets(1);
      const bucketB = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1200)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node4).recordBucketMedian(bucketB)).wait();

      const addresses = await oracle.getNodeAddresses();
      const invalidIndex = addresses.length; // Index out of bounds
      await expect(
        oracle.connect(slasher).slashNode(node3.address, bucketB, 2, invalidIndex),
      ).to.be.revertedWithCustomError(oracle, "IndexOutOfBounds");
    });
    it("reverts NodeNotAtGivenIndex when index doesn't match address", async function () {
      await mineBuckets(1);
      const bucketB = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1200)).wait();
      await mineBuckets(1);
      await (await oracle.connect(node4).recordBucketMedian(bucketB)).wait();

      const node3AddressesIndex = await indexOfNodeAddress(node3.address);
      // Try to slash node3 but use node1's reportIndex (0)
      await expect(
        oracle.connect(slasher).slashNode(node3.address, bucketB, 0, node3AddressesIndex),
      ).to.be.revertedWithCustomError(oracle, "NodeNotAtGivenIndex");
    });

    it("reverts MedianNotRecorded if slashing is attempted before recordBucketMedian", async function () {
      await moveToFreshBucket();
      const bucketB = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1200)).wait();
      await mineBuckets(1);
      const node3AddressesIndex = await indexOfNodeAddress(node3.address);
      await expect(
        oracle.connect(slasher).slashNode(node3.address, bucketB, 2, node3AddressesIndex),
      ).to.be.revertedWithCustomError(oracle, "MedianNotRecorded");
    });
  });
  describe("exitNode", function () {
    beforeEach(async function () {
      const MINIMUM_STAKE = await oracle.MINIMUM_STAKE();
      await fundApproveAndRegister(node1, MINIMUM_STAKE);
      await fundApproveAndRegister(node2, MINIMUM_STAKE);
    });
    it("reverts before waiting period and exits with effective stake after", async function () {
      const idx = await indexOfNodeAddress(node1.address);
      // Ensure lastReportedBucket is set so the waiting period is measured from the last report.
      await (await oracle.connect(node1).reportPrice(1500)).wait();
      await expect(oracle.connect(node1).exitNode(idx)).to.be.revertedWithCustomError(oracle, "WaitingPeriodNotOver");
      const WAITING_PERIOD = Number(await oracle.WAITING_PERIOD());
      await mineBuckets(WAITING_PERIOD);
      const effectiveStake = await oracle.getEffectiveStake(node1.address);
      const balBefore = await oraToken.balanceOf(node1.address);
      const tx = await oracle.connect(node1).exitNode(idx);
      await tx.wait();
      const balAfter = await oraToken.balanceOf(node1.address);
      expect(balAfter - balBefore).to.equal(effectiveStake);
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
      const idx2 = await indexOfNodeAddress(node2.address);
      // Try to exit node1 but use node2's index
      await expect(oracle.connect(node1).exitNode(idx2)).to.be.revertedWithCustomError(oracle, "NodeNotAtGivenIndex");
    });
  });
  describe("getOutlierNodes", function () {
    beforeEach(async function () {
      const stake = await stakeForDelayedFirstReport();
      await fundApproveAndRegister(node1, stake);
      await fundApproveAndRegister(node2, stake);
      await fundApproveAndRegister(node3, stake);
      await fundApproveAndRegister(node4, stake);
      await fundApproveAndRegister(node5, stake);
      await fundApproveAndRegister(node6, stake);
    });
    it("returns empty array when no outliers exist", async function () {
      await moveToFreshBucket();
      const bucketB = await oracle.getCurrentBucketNumber();
      // All nodes report the same price in this bucket
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1000)).wait();
      await (await oracle.connect(node4).reportPrice(1000)).wait();
      await (await oracle.connect(node5).reportPrice(1000)).wait();
      await (await oracle.connect(node6).reportPrice(1000)).wait();
      await mineBuckets(1);
      await (await oracle.connect(slasher).recordBucketMedian(bucketB)).wait();
      const outliers = await oracle.getOutlierNodes(bucketB);
      expect(outliers.length).to.equal(0);
    });
    it("returns deviated node addresses", async function () {
      await moveToFreshBucket();
      const bucketB = await oracle.getCurrentBucketNumber();
      // node4 reports 1200 while others report 1000 (median = 1000)
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1000)).wait();
      await (await oracle.connect(node4).reportPrice(1200)).wait();
      await (await oracle.connect(node5).reportPrice(1000)).wait();
      await (await oracle.connect(node6).reportPrice(1000)).wait();
      await mineBuckets(1);
      await (await oracle.connect(slasher).recordBucketMedian(bucketB)).wait();
      const outliers = await oracle.getOutlierNodes(bucketB);
      expect(outliers.length).to.equal(1);
      expect(outliers[0]).to.equal(node4.address);
    });
    it("excludes nodes that did not report in the bucket", async function () {
      await moveToFreshBucket();
      const bucketB = await oracle.getCurrentBucketNumber();
      // Only 4 reporters (meets the 2/3 threshold for 6 nodes: requiredReports = 4)
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node4).reportPrice(1200)).wait();
      await (await oracle.connect(node5).reportPrice(1000)).wait();
      await mineBuckets(1);
      await (await oracle.connect(slasher).recordBucketMedian(bucketB)).wait();
      const outliers = await oracle.getOutlierNodes(bucketB);
      expect(outliers.length).to.equal(1);
      expect(outliers[0]).to.equal(node4.address);
      expect(outliers).to.not.include(node3.address);
    });
    it("handles multiple outliers correctly", async function () {
      await moveToFreshBucket();
      const bucketB = await oracle.getCurrentBucketNumber();
      await (await oracle.connect(node1).reportPrice(1000)).wait();
      await (await oracle.connect(node2).reportPrice(1000)).wait();
      await (await oracle.connect(node3).reportPrice(1000)).wait();
      await (await oracle.connect(node4).reportPrice(1400)).wait(); // outlier (>10% from median 1000)
      await (await oracle.connect(node5).reportPrice(1400)).wait(); // outlier
      await (await oracle.connect(node6).reportPrice(1000)).wait();
      await mineBuckets(1);
      await (await oracle.connect(slasher).recordBucketMedian(bucketB)).wait();
      const outliers = await oracle.getOutlierNodes(bucketB);
      expect(outliers.length).to.equal(2);
      expect(outliers).to.include(node4.address);
      expect(outliers).to.include(node5.address);
    });
  });
});
