import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { WhitelistOracle, SimpleOracle } from "../typechain-types";

describe("Checkpoint1", function () {
  let whitelistOracle: WhitelistOracle;
  let owner: HardhatEthersSigner, addr1: HardhatEthersSigner, addr2: HardhatEthersSigner, addr3: HardhatEthersSigner, addr4: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const WhitelistOracleFactory = await ethers.getContractFactory("WhitelistOracle");
    whitelistOracle = await WhitelistOracleFactory.deploy();
  });

  it("Should deploy and set owner", async function () {
    expect(await whitelistOracle.owner()).to.equal(owner.address);
  });

  it("Should allow adding oracles and deploy SimpleOracle contracts", async function () {
    await whitelistOracle.addOracle(addr1.address);
    
    const oracleAddress = await whitelistOracle.oracles(0);
    expect(oracleAddress).to.not.equal(ethers.ZeroAddress);
    
    // Check that the oracle is a SimpleOracle contract
    const SimpleOracleFactory = await ethers.getContractFactory("SimpleOracle");
    const oracle = SimpleOracleFactory.attach(oracleAddress) as SimpleOracle;
    expect(await oracle.owner()).to.equal(addr1.address);
  });

  it("Should allow removing oracles by index", async function () {
    await whitelistOracle.addOracle(addr1.address);
    await whitelistOracle.addOracle(addr2.address);
    
    const oracle1Address = await whitelistOracle.oracles(0);
    
    await whitelistOracle.removeOracle(0);
    
    // After removal, the oracle at index 0 should be different (swapped from end)
    const newOracle0Address = await whitelistOracle.oracles(0);
    expect(newOracle0Address).to.not.equal(oracle1Address);
    
    // Should only have one oracle left
    await expect(whitelistOracle.oracles(1)).to.be.reverted;
  });

  it("Should emit OracleAdded event when an oracle is added", async function () {
    const tx = await whitelistOracle.addOracle(addr1.address);
    await tx.wait();
    const oracleAddress = await whitelistOracle.oracles(0);
    
    expect(tx).to.emit(whitelistOracle, "OracleAdded").withArgs(oracleAddress, addr1.address);
  });

  it("Should emit OracleRemoved event when an oracle is removed", async function () {
    await whitelistOracle.addOracle(addr1.address);
    const oracleAddress = await whitelistOracle.oracles(0);
    
    await expect(whitelistOracle.removeOracle(0))
      .to.emit(whitelistOracle, "OracleRemoved")
      .withArgs(oracleAddress);
  });

  it("Should revert with IndexOutOfBounds when trying to remove non-existent oracle", async function () {
    await expect(whitelistOracle.removeOracle(0)).to.be.revertedWithCustomError(whitelistOracle, "IndexOutOfBounds");
    
    await whitelistOracle.addOracle(addr1.address);
    await expect(whitelistOracle.removeOracle(1)).to.be.revertedWithCustomError(whitelistOracle, "IndexOutOfBounds");
    
    await whitelistOracle.removeOracle(0);
    await expect(whitelistOracle.removeOracle(0)).to.be.revertedWithCustomError(whitelistOracle, "IndexOutOfBounds");
  });

  it("Should revert with NoOraclesAvailable when getPrice is called with no oracles", async function () {
    await expect(whitelistOracle.getPrice()).to.be.revertedWithCustomError(whitelistOracle, "NoOraclesAvailable");
  });

  it("Should return correct price with one oracle", async function () {
    await whitelistOracle.addOracle(addr1.address);
    const oracleAddress = await whitelistOracle.oracles(0);
    
    const SimpleOracleFactory = await ethers.getContractFactory("SimpleOracle");
    const oracle = SimpleOracleFactory.attach(oracleAddress) as SimpleOracle;
    
    await oracle.setPrice(1000n);
    
    const price = await whitelistOracle.getPrice();
    expect(price).to.equal(1000n);
  });

  it("Should return correct median price with odd number of oracles", async function () {
    await whitelistOracle.addOracle(addr1.address);
    await whitelistOracle.addOracle(addr2.address);
    await whitelistOracle.addOracle(addr3.address);
    
    const SimpleOracleFactory = await ethers.getContractFactory("SimpleOracle");
    const oracle1 = SimpleOracleFactory.attach(await whitelistOracle.oracles(0)) as SimpleOracle;
    const oracle2 = SimpleOracleFactory.attach(await whitelistOracle.oracles(1)) as SimpleOracle;
    const oracle3 = SimpleOracleFactory.attach(await whitelistOracle.oracles(2)) as SimpleOracle;
    
    await oracle1.setPrice(1000n);
    await oracle2.setPrice(3000n);
    await oracle3.setPrice(2000n);
    
    const medianPrice = await whitelistOracle.getPrice();
    expect(medianPrice).to.equal(2000n);
  });

  it("Should return correct median price with even number of oracles", async function () {
    await whitelistOracle.addOracle(addr1.address);
    await whitelistOracle.addOracle(addr2.address);
    await whitelistOracle.addOracle(addr3.address);
    await whitelistOracle.addOracle(addr4.address);
    
    const SimpleOracleFactory = await ethers.getContractFactory("SimpleOracle");
    const oracle1 = SimpleOracleFactory.attach(await whitelistOracle.oracles(0)) as SimpleOracle;
    const oracle2 = SimpleOracleFactory.attach(await whitelistOracle.oracles(1)) as SimpleOracle;
    const oracle3 = SimpleOracleFactory.attach(await whitelistOracle.oracles(2)) as SimpleOracle;
    const oracle4 = SimpleOracleFactory.attach(await whitelistOracle.oracles(3)) as SimpleOracle;
    
    await oracle1.setPrice(1000n);
    await oracle2.setPrice(3000n);
    await oracle3.setPrice(2000n);
    await oracle4.setPrice(4000n);
    
    const medianPrice = await whitelistOracle.getPrice();
    expect(medianPrice).to.equal(2500n);
  });

  it("Should exclude price reports older than 24 seconds from median calculation", async function () {
    await whitelistOracle.addOracle(addr1.address);
    await whitelistOracle.addOracle(addr2.address);
    await whitelistOracle.addOracle(addr3.address);
    
    const SimpleOracleFactory = await ethers.getContractFactory("SimpleOracle");
    const oracle1 = SimpleOracleFactory.attach(await whitelistOracle.oracles(0)) as SimpleOracle;
    const oracle2 = SimpleOracleFactory.attach(await whitelistOracle.oracles(1)) as SimpleOracle;
    const oracle3 = SimpleOracleFactory.attach(await whitelistOracle.oracles(2)) as SimpleOracle;
    
    await oracle1.setPrice(1000n);
    await oracle2.setPrice(2000n);
    await oracle3.setPrice(3000n);
    
    let medianPrice = await whitelistOracle.getPrice();
    expect(medianPrice).to.equal(2000n);
    
    // Advance time by 25 seconds (more than STALE_DATA_WINDOW of 24 seconds)
    await ethers.provider.send("evm_increaseTime", [25]);
    await ethers.provider.send("evm_mine");
    
    // Set new prices for only two oracles (the old prices should be stale)
    await oracle1.setPrice(5000n);
    await oracle2.setPrice(3000n);
    
    // Should only use the two fresh prices: median of [5000, 3000] = 4000
    medianPrice = await whitelistOracle.getPrice();
    expect(medianPrice).to.equal(4000n);
  });

  it("Should return empty array when no oracles are active", async function () {
    const activeNodes = await whitelistOracle.getActiveOracleNodes();
    expect(activeNodes.length).to.equal(0);
  });

  it("Should return correct active oracle nodes", async function () {
    await whitelistOracle.addOracle(addr1.address);
    await whitelistOracle.addOracle(addr2.address);
    
    const oracle1Address = await whitelistOracle.oracles(0);
    const oracle2Address = await whitelistOracle.oracles(1);
    
    const SimpleOracleFactory = await ethers.getContractFactory("SimpleOracle");
    const oracle1 = SimpleOracleFactory.attach(oracle1Address) as SimpleOracle;
    const oracle2 = SimpleOracleFactory.attach(oracle2Address) as SimpleOracle;
    
    await oracle1.setPrice(1000n);
    await oracle2.setPrice(2000n);
    
    let activeNodes = await whitelistOracle.getActiveOracleNodes();
    expect(activeNodes.length).to.equal(2);
    expect(activeNodes).to.include(oracle1Address);
    expect(activeNodes).to.include(oracle2Address);
    
    // Make oracle1's price stale
    await ethers.provider.send("evm_increaseTime", [25]);
    await ethers.provider.send("evm_mine");
    
    // Update only oracle2
    await oracle2.setPrice(3000n);
    
    activeNodes = await whitelistOracle.getActiveOracleNodes();
    expect(activeNodes.length).to.equal(1);
    expect(activeNodes[0]).to.equal(oracle2Address);
  });

  it("Should handle edge case when all prices are stale but array is not empty", async function () {
    await whitelistOracle.addOracle(addr1.address);
    await whitelistOracle.addOracle(addr2.address);
    
    const SimpleOracleFactory = await ethers.getContractFactory("SimpleOracle");
    const oracle1 = SimpleOracleFactory.attach(await whitelistOracle.oracles(0)) as SimpleOracle;
    const oracle2 = SimpleOracleFactory.attach(await whitelistOracle.oracles(1)) as SimpleOracle;
    
    await oracle1.setPrice(1000n);
    await oracle2.setPrice(2000n);
    
    // Verify median works initially
    let medianPrice = await whitelistOracle.getPrice();
    expect(medianPrice).to.equal(1500n);
    
    // Make all prices stale
    await ethers.provider.send("evm_increaseTime", [25]);
    await ethers.provider.send("evm_mine");
    
    const activeNodes = await whitelistOracle.getActiveOracleNodes();
    expect(activeNodes.length).to.equal(0);
  });
});