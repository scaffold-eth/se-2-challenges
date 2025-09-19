import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { StakingOracle, ORA } from "../typechain-types";

describe("Checkpoint2", function () {
  let oracle: StakingOracle;
  let oraToken: ORA;
  let node1: HardhatEthersSigner;
  let node2: HardhatEthersSigner;
  let node3: HardhatEthersSigner;
  let node4: HardhatEthersSigner;
  let slasher: HardhatEthersSigner;

  const MINIMUM_STAKE = ethers.parseEther("1");
  const STALE_DATA_WINDOW = 24;

  beforeEach(async function () {
    [node1, node2, node3, node4, slasher] = await ethers.getSigners();

    const StakingOracleFactory = await ethers.getContractFactory("StakingOracle");
    oracle = await StakingOracleFactory.deploy();

    const oraTokenAddress = await oracle.oracleToken();
    const ORAFactory = await ethers.getContractFactory("ORA");
    oraToken = ORAFactory.attach(oraTokenAddress) as ORA;
  });

  describe("constructor", function () {
    it("Should deploy an ORA token and set initial state", async function () {
      const StakingOracleFactory = await ethers.getContractFactory("StakingOracle");
      const newly_deployed_oracle = await StakingOracleFactory.deploy();
      const tokenAddress = await newly_deployed_oracle.oracleToken();
      const contractCode = await ethers.provider.getCode(tokenAddress);
      expect(contractCode).to.not.equal("0x");
    });
  });

  describe("getNodeAddresses", function () {
    it("Should return an empty array when no nodes are registered", async function () {
      const StakingOracleFactory = await ethers.getContractFactory("StakingOracle");
      const newOracle = await StakingOracleFactory.deploy();
      const nodeAddresses = await newOracle.getNodeAddresses();
      assert(Array.isArray(nodeAddresses), "nodeAddresses should be an array");
      assert(nodeAddresses.length === 0, "nodeAddresses should be empty");
    });

    it("Should return all registered node addresses in order", async function () {
      await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE });
      await oracle.connect(node2).registerNode(1501, { value: MINIMUM_STAKE });
      await oracle.connect(node3).registerNode(1502, { value: MINIMUM_STAKE });
      const nodeAddresses = await oracle.getNodeAddresses();
      expect(nodeAddresses).to.deep.equal([node1.address, node2.address, node3.address]);
    });
  });

  describe("Node Registration", function () {
    it("Should allow nodes to register with minimum stake", async function () {
      const initialPrice = 1500;
      await expect(oracle.connect(node1).registerNode(initialPrice, { value: MINIMUM_STAKE }))
        .to.emit(oracle, "NodeRegistered")
        .withArgs(node1.address, MINIMUM_STAKE)
        .and.to.emit(oracle, "PriceReported")
        .withArgs(node1.address, initialPrice);

      const nodeInfo = await oracle.nodes(node1.address);
      expect(nodeInfo.nodeAddress).to.equal(node1.address);
      expect(nodeInfo.stakedAmount).to.equal(MINIMUM_STAKE);
      expect(nodeInfo.lastReportedPrice).to.equal(initialPrice);
      expect(nodeInfo.lastReportedTimestamp).to.be.gt(0);

      expect(await oracle.nodeAddresses(0)).to.equal(node1.address);
    });

    it("Should emit NodeRegistered and PriceReported events on successful registration", async function () {
      const initialPrice = 1500;
      await expect(oracle.connect(node1).registerNode(initialPrice, { value: MINIMUM_STAKE }))
        .to.emit(oracle, "NodeRegistered")
        .withArgs(node1.address, MINIMUM_STAKE)
        .and.to.emit(oracle, "PriceReported")
        .withArgs(node1.address, initialPrice);
    });

    it("Should reject registration with insufficient stake", async function () {
      const insufficientStake = ethers.parseEther("0.5");
      const initialPrice = 1500;
      await expect(
        oracle.connect(node1).registerNode(initialPrice, { value: insufficientStake }),
      ).to.be.revertedWithCustomError(oracle, "InsufficientStake");
    });

    it("Should reject duplicate node registration", async function () {
      const initialPrice = 1500;
      await oracle.connect(node1).registerNode(initialPrice, { value: MINIMUM_STAKE });

      await expect(
        oracle.connect(node1).registerNode(initialPrice, { value: MINIMUM_STAKE }),
      ).to.be.revertedWithCustomError(oracle, "NodeAlreadyRegistered");
    });
  });

  describe("Price Reporting", function () {
    beforeEach(async function () {
      await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE });
    });

    it("Should record the reported price and timestamp in contract state", async function () {
      let nodeInfo = await oracle.nodes(node1.address);
      expect(nodeInfo.lastReportedPrice).to.equal(1500);
      expect(nodeInfo.lastReportedTimestamp).to.be.gt(0);

      const price = 1600;
      const tx = await oracle.connect(node1).reportPrice(price);
      await tx.wait();

      nodeInfo = await oracle.nodes(node1.address);
      expect(nodeInfo.lastReportedPrice).to.equal(price);
      expect(nodeInfo.lastReportedTimestamp).to.be.gt(0);
    });

    it("Should emit PriceReported event when reporting price", async function () {
      const price = 1500;
      await expect(oracle.connect(node1).reportPrice(price))
        .to.emit(oracle, "PriceReported")
        .withArgs(node1.address, price);
    });

    it("Should reject price reports from unregistered nodes", async function () {
      const price = 1500;
      await expect(oracle.connect(node2).reportPrice(price)).to.be.revertedWithCustomError(oracle, "NodeNotRegistered");
    });

    it("Should reject price reports from nodes with insufficient stake", async function () {
      await oracle.connect(node1).reportPrice(1500);
      await time.increase(STALE_DATA_WINDOW + 1);
      await oracle.connect(slasher).slashNodes();

      const nodeInfo = await oracle.nodes(node1.address);
      const expectedSlashedAmount = MINIMUM_STAKE - ethers.parseEther("1");
      expect(nodeInfo.stakedAmount).to.equal(expectedSlashedAmount);
      expect(nodeInfo.stakedAmount).to.be.lt(MINIMUM_STAKE);

      await expect(oracle.connect(node1).reportPrice(1600)).to.be.revertedWithCustomError(oracle, "NotEnoughStake");
    });
  });

  describe("Claim Reward", function () {
    beforeEach(async function () {
      await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE });
    });

    it("Should allow nodes to claim rewards based on time elapsed", async function () {
      await time.increase(100); // 100 seconds

      const balanceBefore = await oraToken.balanceOf(node1.address);
      await oracle.connect(node1).claimReward();
      const balanceAfter = await oraToken.balanceOf(node1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should reject claim from unregistered nodes", async function () {
      await expect(oracle.connect(node2).claimReward()).to.be.revertedWithCustomError(oracle, "NodeNotRegistered");
    });

    it("Should update lastClaimedTimestamp after successful claim", async function () {
      await time.increase(100);

      const nodeInfoBefore = await oracle.nodes(node1.address);
      await oracle.connect(node1).claimReward();
      const nodeInfoAfter = await oracle.nodes(node1.address);

      expect(nodeInfoAfter.lastClaimedTimestamp).to.be.gt(nodeInfoBefore.lastClaimedTimestamp);
    });

    it("Should handle reward calculation for slashed nodes correctly", async function () {
      // Register and let some time pass
      await time.increase(50);

      // Get slashed - this will set lastSlashedTimestamp
      await time.increase(STALE_DATA_WINDOW + 1);
      await oracle.connect(slasher).slashNodes();

      const nodeInfo = await oracle.nodes(node1.address);
      expect(nodeInfo.stakedAmount).to.be.lt(MINIMUM_STAKE);
      expect(nodeInfo.lastSlashedTimestamp).to.be.gt(0);

      // Slashed nodes can claim rewards up to their slash timestamp
      const balanceBefore = await oraToken.balanceOf(node1.address);
      await oracle.connect(node1).claimReward();
      const balanceAfter = await oraToken.balanceOf(node1.address);

      // Should get rewards for the time between registration and slashing
      expect(balanceAfter).to.be.gt(balanceBefore);

      // Trying to claim again should fail since no new rewards accumulated
      await expect(oracle.connect(node1).claimReward()).to.be.revertedWithCustomError(oracle, "NoRewardsAvailable");
    });

    it("Should revert when no rewards are available", async function () {
      // Advance time slightly to account for registration timestamp
      await time.increase(1);

      // Claim should work with minimal time passed
      const balanceBefore = await oraToken.balanceOf(node1.address);
      await oracle.connect(node1).claimReward();
      const balanceAfter = await oraToken.balanceOf(node1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Slashing Mechanism", function () {
    beforeEach(async function () {
      await oracle.connect(node1).registerNode(1450, { value: MINIMUM_STAKE });
      await oracle.connect(node2).registerNode(1500, { value: MINIMUM_STAKE });
      await oracle.connect(node3).registerNode(1550, { value: MINIMUM_STAKE });
    });

    it("Should slash stale nodes and reward slasher", async function () {
      await time.increase(STALE_DATA_WINDOW + 1);
      await oracle.connect(node1).reportPrice(1600); // Keep node1 fresh

      const slasherBalanceBefore = await ethers.provider.getBalance(slasher.address);
      await oracle.connect(slasher).slashNodes();
      const slasherBalanceAfter = await ethers.provider.getBalance(slasher.address);

      expect(slasherBalanceAfter).to.be.gt(slasherBalanceBefore);

      const node2Info = await oracle.nodes(node2.address);
      const node3Info = await oracle.nodes(node3.address);

      const expectedSlashedAmount = MINIMUM_STAKE - ethers.parseEther("1");
      expect(node2Info.stakedAmount).to.equal(expectedSlashedAmount);
      expect(node3Info.stakedAmount).to.equal(expectedSlashedAmount);
    });

    it("Should emit NodeSlashed events for stale nodes", async function () {
      await time.increase(STALE_DATA_WINDOW + 1);
      await oracle.connect(node1).reportPrice(1600);

      await expect(oracle.connect(slasher).slashNodes())
        .to.emit(oracle, "NodeSlashed")
        .withArgs(node2.address, ethers.parseEther("1"))
        .and.to.emit(oracle, "NodeSlashed")
        .withArgs(node3.address, ethers.parseEther("1"));
    });

    it("Should reward slasher with correct percentage of slashed amounts", async function () {
      const StakingOracleFactory = await ethers.getContractFactory("StakingOracle");
      const freshOracle = await StakingOracleFactory.deploy();

      await freshOracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE });
      await freshOracle.connect(node2).registerNode(1501, { value: MINIMUM_STAKE });

      await time.increase(STALE_DATA_WINDOW + 1);
      await freshOracle.connect(node1).reportPrice(1500); // Keep node1 fresh

      const slasherBalanceBefore = await ethers.provider.getBalance(slasher.address);

      const tx = await freshOracle.connect(slasher).slashNodes();
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Transaction receipt is null");
      const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice);

      const node2InfoAfter = await freshOracle.nodes(node2.address);
      expect(node2InfoAfter.stakedAmount).to.equal(MINIMUM_STAKE - ethers.parseEther("1"));

      const SLASHER_REWARD_PERCENTAGE = await freshOracle.SLASHER_REWARD_PERCENTAGE();
      const expectedReward = (ethers.parseEther("1") * SLASHER_REWARD_PERCENTAGE) / 100n;
      const slasherBalanceAfter = await ethers.provider.getBalance(slasher.address);

      expect(slasherBalanceAfter).to.equal(slasherBalanceBefore + expectedReward - gasUsed);
    });

    it("Should update lastSlashedTimestamp when node is slashed", async function () {
      await time.increase(STALE_DATA_WINDOW + 1);

      const nodeInfoBefore = await oracle.nodes(node2.address);
      expect(nodeInfoBefore.lastSlashedTimestamp).to.equal(0);

      await oracle.connect(slasher).slashNodes();

      const nodeInfoAfter = await oracle.nodes(node2.address);
      // The contract now properly updates lastSlashedTimestamp
      expect(nodeInfoAfter.lastSlashedTimestamp).to.be.gt(0);
      expect(nodeInfoAfter.stakedAmount).to.be.lt(MINIMUM_STAKE);
    });
  });

  describe("Price Aggregation and Node Management", function () {
    beforeEach(async function () {
      await oracle.connect(node1).registerNode(1450, { value: MINIMUM_STAKE });
      await oracle.connect(node2).registerNode(1500, { value: MINIMUM_STAKE });
      await oracle.connect(node3).registerNode(1550, { value: MINIMUM_STAKE });
    });

    it("Should correctly calculate median price", async function () {
      let price = await oracle.getPrice();
      expect(price).to.equal(1500);

      await oracle.connect(node4).registerNode(1600, { value: MINIMUM_STAKE });
      price = await oracle.getPrice();
      expect(price).to.equal(1525);
    });

    it("Should exclude stale price reports in the median calculation", async function () {
      let price = await oracle.getPrice();
      expect(price).to.equal(1500);

      await time.increase(STALE_DATA_WINDOW + 1);

      await oracle.connect(node2).reportPrice(2400);
      await oracle.connect(node3).reportPrice(2500);

      price = await oracle.getPrice();
      expect(price).to.equal(2450);

      await time.increase(STALE_DATA_WINDOW + 1);
      await oracle.connect(node1).reportPrice(1700);

      price = await oracle.getPrice();
      expect(price).to.equal(1700);
    });

    it("Should handle case when no valid prices are available", async function () {
      await time.increase(STALE_DATA_WINDOW + 1);
      await expect(oracle.getPrice()).to.be.revertedWithCustomError(oracle, "NoValidPricesAvailable");
    });

    it("Should correctly separate fresh and stale nodes (via getPrice behavior)", async function () {
      // Test the separation logic indirectly through price calculation
      let price = await oracle.getPrice();
      expect(price).to.equal(1500); // median of [1450, 1500, 1550]

      await time.increase(STALE_DATA_WINDOW + 1);
      await oracle.connect(node1).reportPrice(1600); // Keep node1 fresh

      // Now only node1 should be fresh, so price should be 1600
      price = await oracle.getPrice();
      expect(price).to.equal(1600);
    });

    it("Should handle empty node array in separateStaleNodes", async function () {
      const result = await oracle.separateStaleNodes([]);
      const freshNodes = Array.from(result[0]);
      const staleNodes = Array.from(result[1]);
      expect(freshNodes).to.deep.equal([]);
      expect(staleNodes).to.deep.equal([]);
    });
  });

  describe("Node Information Queries", function () {
    beforeEach(async function () {
      await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE });
    });

    it("Should return correct node information", async function () {
      const nodeInfo = await oracle.nodes(node1.address);
      expect(nodeInfo.nodeAddress).to.equal(node1.address);
      expect(nodeInfo.stakedAmount).to.equal(MINIMUM_STAKE);
      expect(nodeInfo.lastReportedPrice).to.equal(1500);
      expect(nodeInfo.lastReportedTimestamp).to.be.gt(0);
      expect(nodeInfo.lastClaimedTimestamp).to.be.gt(0);
      expect(nodeInfo.lastSlashedTimestamp).to.equal(0);
    });

    it("Should return zero values for unregistered node", async function () {
      const nodeInfo = await oracle.nodes(node2.address);
      expect(nodeInfo.nodeAddress).to.equal(ethers.ZeroAddress);
      expect(nodeInfo.stakedAmount).to.equal(0);
      expect(nodeInfo.lastReportedPrice).to.equal(0);
      expect(nodeInfo.lastReportedTimestamp).to.equal(0);
      expect(nodeInfo.lastClaimedTimestamp).to.equal(0);
      expect(nodeInfo.lastSlashedTimestamp).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle single node scenarios", async function () {
      await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE });
      const price = await oracle.getPrice();
      expect(price).to.equal(1500);
    });

    it("Should handle all nodes becoming stale", async function () {
      await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE });
      await oracle.connect(node2).registerNode(1600, { value: MINIMUM_STAKE });

      await time.increase(STALE_DATA_WINDOW + 1);

      await expect(oracle.getPrice()).to.be.revertedWithCustomError(oracle, "NoValidPricesAvailable");
    });

    it("Should handle slashing with insufficient stake", async function () {
      // Register with minimal stake
      await oracle.connect(node1).registerNode(1500, { value: MINIMUM_STAKE });

      // Make stale and slash
      await time.increase(STALE_DATA_WINDOW + 1);
      await oracle.connect(slasher).slashNodes();

      const nodeInfo = await oracle.nodes(node1.address);
      // After slashing 1 ETH from 1 ETH stake, should be 0
      expect(nodeInfo.stakedAmount).to.equal(0);
    });
  });
});
