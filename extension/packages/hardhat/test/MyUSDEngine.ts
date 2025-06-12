//
// This script executes when you run 'yarn test'
//

import { ethers } from "hardhat";
import { expect } from "chai";
import { MyUSD, DEX, MyUSDEngine, Oracle, MyUSDStaking, RateController } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { fetchPriceFromUniswap } from "../scripts/fetchPriceFromUniswap";

describe("🚩 Stablecoin Challenge 🤓", function () {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  let myUSDToken: MyUSD;
  let dex: DEX;
  let myUSDEngine: MyUSDEngine;
  let oracle: Oracle;
  let staking: MyUSDStaking;
  let rateController: RateController;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const collateralAmount = ethers.parseEther("10");
  const borrowAmount = ethers.parseEther("5000");

  beforeEach(async function () {
    await ethers.provider.send("hardhat_reset", []);
    [owner, user1, user2] = await ethers.getSigners();

    // For SRE Auto-grader - use the the downloaded contract instead of default contract
    let contractArtifact = "";
    if (contractAddress) {
      contractArtifact = `contracts/download-${contractAddress}.sol:MyUSDEngine`;
    } else {
      contractArtifact = "contracts/MyUSDEngine.sol:MyUSDEngine";
    }

    // Get the deployer's current nonce
    const deployerNonce = await ethers.provider.getTransactionCount(owner.address);

    // Calculate future addresses based on nonce
    const futureStakingAddress = ethers.getCreateAddress({
      from: owner.address,
      nonce: deployerNonce + 4, // +4 because it will be our fifth deployment
    });

    const futureEngineAddress = ethers.getCreateAddress({
      from: owner.address,
      nonce: deployerNonce + 5, // +5 because it will be our sixth deployment
    });

    // Deploy RateController first
    const RateControllerFactory = await ethers.getContractFactory("RateController");
    rateController = await RateControllerFactory.deploy(futureEngineAddress, futureStakingAddress);

    // Deploy MyUSD with future addresses
    const MyUSDFactory = await ethers.getContractFactory("MyUSD");
    myUSDToken = await MyUSDFactory.deploy(futureEngineAddress, futureStakingAddress);

    // Deploy DEX
    const DEXFactory = await ethers.getContractFactory("DEX");
    dex = await DEXFactory.deploy(await myUSDToken.getAddress());

    const ethPrice = await fetchPriceFromUniswap();

    // Deploy Oracle
    const OracleFactory = await ethers.getContractFactory("Oracle");
    oracle = await OracleFactory.deploy(await dex.getAddress(), ethPrice);

    // Deploy MyUSDStaking
    const MyUSDStakingFactory = await ethers.getContractFactory("MyUSDStaking");
    staking = await MyUSDStakingFactory.deploy(
      await myUSDToken.getAddress(),
      futureEngineAddress,
      await rateController.getAddress(),
    );

    // Finally deploy the MyUSDEngine at the predicted address
    const MyUSDEngineFactory = await ethers.getContractFactory(contractArtifact);
    myUSDEngine = (await MyUSDEngineFactory.deploy(
      await oracle.getAddress(),
      await myUSDToken.getAddress(),
      await staking.getAddress(),
      await rateController.getAddress(),
    )) as MyUSDEngine;

    // Verify addresses match predictions
    expect(await myUSDEngine.getAddress()).to.equal(futureEngineAddress);
    expect(await staking.getAddress()).to.equal(futureStakingAddress);

    const ethCollateralAmount = ethers.parseEther("5000");
    // Initialize DEX with liquidity
    const ethDEXAmount = ethers.parseEther("1000");
    const myUSDAmount = (await oracle.getETHUSDPrice()) * 1000n;

    // Add collateral and mint MyUSD for DEX initialization
    await myUSDEngine.addCollateral({ value: ethCollateralAmount });
    await myUSDEngine.mintMyUSD(myUSDAmount);

    const confirmedBalance = await myUSDToken.balanceOf(owner.address);
    // Don't add DEX liquidity if the deployer account doesn't have the stablecoins
    if (confirmedBalance == myUSDAmount) {
      // Approve DEX to use tokens and initialize DEX
      await myUSDToken.approve(dex.target, myUSDAmount);
      await dex.init(myUSDAmount, { value: ethDEXAmount });
    }
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await myUSDToken.owner()).to.equal(owner.address);
      expect(await dex.totalLiquidity()).to.be.gt(0);
      expect(await oracle.getETHMyUSDPrice()).to.be.gt(0);
      expect(await myUSDEngine.borrowRate()).to.equal(0);
      expect(await staking.savingsRate()).to.equal(0);
    });
  });

  describe("Collateral Operations", function () {
    it("Should allow adding collateral", async function () {
      await myUSDEngine.connect(user1).addCollateral({ value: collateralAmount });
      expect(await myUSDEngine.s_userCollateral(user1.address)).to.equal(collateralAmount);
    });

    it("Should emit CollateralAdded event", async function () {
      await expect(myUSDEngine.connect(user1).addCollateral({ value: collateralAmount }))
        .to.emit(myUSDEngine, "CollateralAdded")
        .withArgs(user1.address, collateralAmount, await oracle.getETHMyUSDPrice());
    });

    it("Should allow withdrawing collateral when no debt", async function () {
      await myUSDEngine.connect(user1).addCollateral({ value: collateralAmount });
      expect(await myUSDEngine.s_userCollateral(user1.address)).to.be.gt(0n);
      await myUSDEngine.connect(user1).withdrawCollateral(collateralAmount);
      expect(await myUSDEngine.s_userCollateral(user1.address)).to.equal(0);
    });

    it("Should prevent withdrawing more than deposited", async function () {
      await myUSDEngine.connect(user1).addCollateral({ value: collateralAmount });
      await expect(myUSDEngine.connect(user1).withdrawCollateral(collateralAmount * 2n)).to.be.revertedWithCustomError(
        myUSDEngine,
        "Engine__InsufficientCollateral",
      );
    });
  });

  describe("Borrowing Operations", function () {
    beforeEach(async function () {
      await myUSDEngine.connect(user1).addCollateral({ value: collateralAmount });
    });

    it("Should allow borrowing when sufficiently collateralized", async function () {
      expect(await myUSDToken.balanceOf(user1.address)).to.equal(0n);
      await myUSDEngine.connect(user1).mintMyUSD(borrowAmount);
      expect(await myUSDEngine.s_userDebtShares(user1.address)).to.equal(borrowAmount);
      expect(await myUSDToken.balanceOf(user1.address)).to.equal(borrowAmount);
    });

    it("Should prevent borrowing when insufficiently collateralized", async function () {
      const tooMuchBorrow = (await oracle.getETHUSDPrice()) * collateralAmount;
      await expect(myUSDEngine.connect(user1).mintMyUSD(tooMuchBorrow)).to.be.revertedWithCustomError(
        myUSDEngine,
        "Engine__UnsafePositionRatio",
      );
    });

    it("Should emit DebtSharesMinted event", async function () {
      await expect(myUSDEngine.connect(user1).mintMyUSD(borrowAmount))
        .to.emit(myUSDEngine, "DebtSharesMinted")
        .withArgs(user1.address, borrowAmount, borrowAmount);
    });
  });

  describe("Repayment Operations", function () {
    beforeEach(async function () {
      await myUSDEngine.connect(user1).addCollateral({ value: collateralAmount });
      await myUSDEngine.connect(user1).mintMyUSD(borrowAmount);
    });

    it("Should allow repaying borrowed amount", async function () {
      expect(await myUSDEngine.s_userDebtShares(user1.address)).to.be.gt(0n);
      await myUSDToken.connect(user1).approve(myUSDEngine.target, borrowAmount);
      await myUSDEngine.connect(user1).repayUpTo(borrowAmount);
      expect(await myUSDEngine.s_userDebtShares(user1.address)).to.equal(0);
    });

    it("Should allow repaying less than full borrowed amount", async function () {
      await myUSDToken.connect(user1).approve(myUSDEngine.target, borrowAmount / 2n);
      await myUSDEngine.connect(user1).repayUpTo(borrowAmount / 2n);
      expect(await myUSDEngine.s_userDebtShares(user1.address)).to.equal(borrowAmount / 2n);
    });

    it("Should allow repaying more than borrowed", async function () {
      expect(await myUSDEngine.s_userDebtShares(user1.address)).to.be.gt(0n);
      await myUSDToken.connect(user1).approve(myUSDEngine.target, borrowAmount * 2n);
      await dex.connect(user1).swap(ethers.parseEther("10"), { value: ethers.parseEther("10") });
      await myUSDEngine.connect(user1).repayUpTo(borrowAmount * 2n);
      expect(await myUSDEngine.s_userDebtShares(user1.address)).to.equal(0);
    });

    it("Should emit DebtSharesBurned event", async function () {
      await myUSDToken.connect(user1).approve(myUSDEngine.target, borrowAmount);
      await expect(myUSDEngine.connect(user1).repayUpTo(borrowAmount))
        .to.emit(myUSDEngine, "DebtSharesBurned")
        .withArgs(user1.address, borrowAmount, await myUSDToken.balanceOf(user1.address));
    });
  });

  describe("Liquidation", function () {
    beforeEach(async function () {
      const collateralAmount = ethers.parseEther("1");
      const borrowAmount = ((await oracle.getETHUSDPrice()) * 1000n) / 1505n;
      await myUSDEngine.connect(user1).addCollateral({ value: collateralAmount });
      await myUSDEngine.connect(user1).mintMyUSD(borrowAmount);
      await myUSDToken
        .connect(await ethers.getImpersonatedSigner(myUSDEngine.target as string))
        .mintTo(user2.address, borrowAmount * 10n);
      await myUSDToken.connect(user2).approve(myUSDEngine.target, borrowAmount * 10n);
    });

    it("Should allow liquidation when position is unsafe", async function () {
      // drop price of eth so that user1 position is below 1.5
      const amountToSwap = ethers.parseEther("10");
      await dex.swap(amountToSwap, { value: amountToSwap });
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await myUSDEngine.isLiquidatable(user1)).to.be.true;
      const beforeBalance = await ethers.provider.getBalance(user2.address);
      await myUSDEngine.connect(user2).liquidate(user1.address);
      const afterBalance = await ethers.provider.getBalance(user2.address);
      expect(await myUSDEngine.s_userDebtShares(user1.address)).to.equal(0);
      expect(afterBalance).to.be.gt(beforeBalance);
    });

    it("Should prevent liquidation of safe positions", async function () {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await myUSDEngine.isLiquidatable(user1)).to.be.false;
      await expect(myUSDEngine.connect(user2).liquidate(user1.address)).to.be.revertedWithCustomError(
        myUSDEngine,
        "Engine__NotLiquidatable",
      );
    });

    it("Should emit appropriate events on liquidation", async function () {
      const amountToSwap = ethers.parseEther("10");
      await dex.swap(amountToSwap, { value: amountToSwap });
      await expect(myUSDEngine.connect(user2).liquidate(user1.address)).to.emit(myUSDEngine, "Liquidation");
    });
  });

  describe("Borrow Rate Management", function () {
    it("Should allow rate controller to set borrow rate", async function () {
      const newRate = 500; // 5%
      await rateController.setBorrowRate(newRate);
      expect(await myUSDEngine.borrowRate()).to.equal(newRate);
    });

    it("Should emit BorrowRateUpdated event when rate changes", async function () {
      const newRate = 300; // 3%
      await expect(rateController.setBorrowRate(newRate)).to.emit(myUSDEngine, "BorrowRateUpdated").withArgs(newRate);
    });

    it("Should prevent non-rate controller from setting borrow rate", async function () {
      const newRate = 500;
      // First verify rate controller can set it (will fail with empty function)
      await rateController.setBorrowRate(newRate);
      expect(await myUSDEngine.borrowRate()).to.equal(newRate);

      // Then verify non-rate controller cannot
      await expect(myUSDEngine.connect(user1).setBorrowRate(newRate)).to.be.revertedWithCustomError(
        myUSDEngine,
        "Engine__NotRateController",
      );
    });

    it("Should prevent setting borrow rate below savings rate", async function () {
      // First set borrow rate to 4%
      await rateController.setBorrowRate(400);
      // Then set savings rate to 3%
      await rateController.setSavingsRate(300);

      // Try to set borrow rate to 2% (below savings rate) - should revert
      await expect(rateController.setBorrowRate(200)).to.be.revertedWithCustomError(
        myUSDEngine,
        "Engine__InvalidBorrowRate",
      );
    });

    it("Should allow setting borrow rate equal to savings rate", async function () {
      await rateController.setBorrowRate(400);
      await rateController.setSavingsRate(300);
      await rateController.setBorrowRate(300);
      expect(await myUSDEngine.borrowRate()).to.equal(300);
    });

    it("Should allow setting borrow rate above savings rate", async function () {
      await rateController.setBorrowRate(300);
      await rateController.setSavingsRate(300);
      await rateController.setBorrowRate(500);
      expect(await myUSDEngine.borrowRate()).to.equal(500);
    });
  });

  describe("Interest Accrual", function () {
    beforeEach(async function () {
      await myUSDEngine.connect(user1).addCollateral({ value: collateralAmount });
      await myUSDEngine.connect(user1).mintMyUSD(borrowAmount);
    });

    it("Should not accrue interest with zero borrow rate", async function () {
      const initialDebt = await myUSDEngine.getCurrentDebtValue(user1.address);
      expect(initialDebt).to.be.gt(0); // Verify debt was actually created

      // Fast forward time by 1 year
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const finalDebt = await myUSDEngine.getCurrentDebtValue(user1.address);
      expect(finalDebt).to.be.eq(initialDebt);
    });

    it("Should accrue interest correctly over time", async function () {
      const borrowRate = 1000; // 10% annual
      await rateController.setBorrowRate(borrowRate);

      const initialDebt = await myUSDEngine.getCurrentDebtValue(user1.address);
      expect(initialDebt).to.be.gt(0); // Verify debt was actually created

      // Fast forward time by 1 year
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const finalDebt = await myUSDEngine.getCurrentDebtValue(user1.address);
      const expectedDebt = initialDebt + (initialDebt * BigInt(borrowRate)) / 10000n;

      expect(finalDebt).to.be.closeTo(expectedDebt, ethers.parseEther("0.001"));
    });

    it("Should accrue interest proportionally over partial time periods", async function () {
      const borrowRate = 1200; // 12% annual
      await rateController.setBorrowRate(borrowRate);

      const initialDebt = await myUSDEngine.getCurrentDebtValue(user1.address);
      expect(initialDebt).to.be.gt(0); // Verify debt was actually created

      // Fast forward time by 6 months
      await ethers.provider.send("evm_increaseTime", [182 * 24 * 60 * 60]); // ~6 months
      await ethers.provider.send("evm_mine", []);

      const finalDebt = await myUSDEngine.getCurrentDebtValue(user1.address);
      const expectedDebt = initialDebt + (initialDebt * BigInt(borrowRate) * 182n) / (365n * 10000n);

      expect(finalDebt).to.be.closeTo(expectedDebt, ethers.parseEther("0.001"));
    });

    it("Should handle multiple interest accrual periods", async function () {
      const borrowRate = 500; // 5% annual
      await rateController.setBorrowRate(borrowRate);

      const initialDebt = await myUSDEngine.getCurrentDebtValue(user1.address);
      expect(initialDebt).to.be.gt(0); // Verify debt was actually created

      // Fast forward 3 months
      await ethers.provider.send("evm_increaseTime", [91 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const midDebt = await myUSDEngine.getCurrentDebtValue(user1.address);
      const expectedMidDebt = initialDebt + (initialDebt * BigInt(borrowRate) * 91n) / (365n * 10000n);

      // Change rate and fast forward another 3 months
      await rateController.setBorrowRate(800); // 8% annual

      const afterRateChangeDebt = await myUSDEngine.getCurrentDebtValue(user1.address);
      await ethers.provider.send("evm_increaseTime", [91 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const finalDebt = await myUSDEngine.getCurrentDebtValue(user1.address);
      const expectedFinalDebt = afterRateChangeDebt + (afterRateChangeDebt * BigInt(800) * 91n) / (365n * 10000n);

      expect(midDebt).to.be.closeTo(expectedMidDebt, ethers.parseEther("0.001"));
      expect(finalDebt).to.be.closeTo(expectedFinalDebt, ethers.parseEther("0.001"));
    });
  });

  describe("Savings Rate Management", function () {
    beforeEach(async function () {
      await rateController.setBorrowRate(400);
      expect(await myUSDEngine.borrowRate()).to.equal(400);
    });

    it("Should allow rate controller to set savings rate", async function () {
      const newRate = 300; // 3%
      await rateController.setSavingsRate(newRate);
      expect(await staking.savingsRate()).to.equal(newRate);
    });

    it("Should emit SavingsRateUpdated event when rate changes", async function () {
      const newRate = 250; // 2.5%
      await expect(rateController.setSavingsRate(newRate)).to.emit(staking, "SavingsRateUpdated").withArgs(newRate);
    });

    it("Should prevent non-rate controller from setting savings rate", async function () {
      const newRate = 300;
      // First verify rate controller can set it (will fail with empty function)
      await rateController.setSavingsRate(newRate);
      expect(await staking.savingsRate()).to.equal(newRate);

      // Then verify non-rate controller cannot
      await expect(staking.connect(user1).setSavingsRate(newRate)).to.be.revertedWithCustomError(
        staking,
        "Staking__NotRateController",
      );
    });

    it("Should prevent setting savings rate above borrow rate", async function () {
      // Try to set savings rate to 5% (above borrow rate) - should revert
      await expect(rateController.setSavingsRate(500)).to.be.revertedWithCustomError(
        staking,
        "Staking__InvalidSavingsRate",
      );
    });

    it("Should allow setting savings rate equal to borrow rate", async function () {
      const rate = 400; // 4%
      await rateController.setSavingsRate(rate);
      expect(await staking.savingsRate()).to.equal(rate);
    });

    it("Should prevent setting borrow rate below savings rate", async function () {
      await rateController.setSavingsRate(0);
      expect(await rateController.setBorrowRate(300)).to.be.revertedWithCustomError(
        myUSDEngine,
        "Engine__InvalidBorrowRate",
      );
    });
  });

  describe("Staking Operations", function () {
    beforeEach(async function () {
      // Get some MyUSD tokens for testing
      await myUSDEngine.connect(user1).addCollateral({ value: collateralAmount });
      await myUSDEngine.connect(user1).mintMyUSD(borrowAmount);

      // Verify that user1 got the tokens
      expect(await myUSDToken.balanceOf(user1.address)).to.be.gt(0);
    });

    it("Should allow staking MyUSD tokens", async function () {
      const stakeAmount = ethers.parseEther("1000");
      await myUSDToken.connect(user1).approve(staking.target, stakeAmount);
      await staking.connect(user1).stake(stakeAmount);

      expect(await staking.userShares(user1.address)).to.be.gt(0);
      expect(await staking.getBalance(user1.address)).to.equal(stakeAmount);
    });

    it("Should emit Staked event", async function () {
      const stakeAmount = ethers.parseEther("1000");
      await myUSDToken.connect(user1).approve(staking.target, stakeAmount);

      await expect(staking.connect(user1).stake(stakeAmount))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, stakeAmount, stakeAmount); // 1:1 initially
    });

    it("Should prevent staking zero amount", async function () {
      await expect(staking.connect(user1).stake(0)).to.be.revertedWithCustomError(staking, "Staking__InvalidAmount");
    });

    it("Should prevent staking without sufficient balance", async function () {
      const stakeAmount = ethers.parseEther("100000"); // More than user has
      await myUSDToken.connect(user1).approve(staking.target, stakeAmount);

      await expect(staking.connect(user1).stake(stakeAmount)).to.be.revertedWithCustomError(
        staking,
        "MyUSD__InsufficientBalance",
      );
    });

    it("Should prevent staking without sufficient allowance", async function () {
      const stakeAmount = ethers.parseEther("1000");
      // Don't approve or approve less
      await myUSDToken.connect(user1).approve(staking.target, stakeAmount / 2n);

      await expect(staking.connect(user1).stake(stakeAmount)).to.be.revertedWithCustomError(
        staking,
        "MyUSD__InsufficientAllowance",
      );
    });

    it("Should handle multiple stakes from same user", async function () {
      const stakeAmount1 = ethers.parseEther("1000");
      const stakeAmount2 = ethers.parseEther("500");

      await myUSDToken.connect(user1).approve(staking.target, stakeAmount1 + stakeAmount2);

      await staking.connect(user1).stake(stakeAmount1);
      const balanceAfterFirst = await staking.getBalance(user1.address);

      await staking.connect(user1).stake(stakeAmount2);
      const balanceAfterSecond = await staking.getBalance(user1.address);

      expect(balanceAfterFirst).to.equal(stakeAmount1);
      expect(balanceAfterSecond).to.equal(stakeAmount1 + stakeAmount2);
    });
  });

  describe("Withdrawal Operations", function () {
    beforeEach(async function () {
      // Setup user with MyUSD and stake some
      await myUSDEngine.connect(user1).addCollateral({ value: collateralAmount });
      await myUSDEngine.connect(user1).mintMyUSD(borrowAmount);

      const stakeAmount = ethers.parseEther("1000");
      await myUSDToken.connect(user1).approve(staking.target, stakeAmount);
      await staking.connect(user1).stake(stakeAmount);
    });

    it("Should allow withdrawing staked tokens", async function () {
      const initialBalance = await myUSDToken.balanceOf(user1.address);
      await staking.connect(user1).withdraw();
      const finalBalance = await myUSDToken.balanceOf(user1.address);

      expect(await staking.userShares(user1.address)).to.equal(0);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should emit Withdrawn event", async function () {
      const expectedAmount = await staking.getBalance(user1.address);
      const expectedShares = await staking.userShares(user1.address);

      await expect(staking.connect(user1).withdraw())
        .to.emit(staking, "Withdrawn")
        .withArgs(user1.address, expectedAmount, expectedShares);
    });

    it("Should prevent withdrawal with no balance", async function () {
      await expect(staking.connect(user2).withdraw()).to.be.revertedWithCustomError(
        staking,
        "Staking__InsufficientBalance",
      );
    });

    it("Should handle withdrawal after partial time with no interest", async function () {
      const stakeAmount = ethers.parseEther("1000");

      // Fast forward time but no savings rate set
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
      await ethers.provider.send("evm_mine", []);

      const balanceBeforeWithdraw = await staking.getBalance(user1.address);
      expect(balanceBeforeWithdraw).to.equal(stakeAmount);

      await staking.connect(user1).withdraw();
      expect(await staking.userShares(user1.address)).to.equal(0);
    });
  });

  describe("Savings Interest Accrual", function () {
    beforeEach(async function () {
      // Setup user with MyUSD and stake some
      await myUSDEngine.connect(user1).addCollateral({ value: collateralAmount });
      await myUSDEngine.connect(user1).mintMyUSD(borrowAmount);

      const stakeAmount = ethers.parseEther("1000");
      await myUSDToken.connect(user1).approve(staking.target, stakeAmount);
      await staking.connect(user1).stake(stakeAmount);
    });

    it("Should not accrue interest with zero savings rate", async function () {
      const initialBalance = await staking.getBalance(user1.address);
      expect(initialBalance).to.be.gt(0); // Verify tokens were actually staked

      // Fast forward time by 1 year
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const finalBalance = await staking.getBalance(user1.address);
      expect(finalBalance).to.equal(initialBalance);
    });

    it("Should accrue interest correctly over time", async function () {
      const borrowRate = 1000; // 10% annual
      const savingsRate = 800; // 8% annual
      await rateController.setBorrowRate(borrowRate);
      await rateController.setSavingsRate(savingsRate);

      const initialBalance = await staking.getBalance(user1.address);
      expect(initialBalance).to.be.gt(0); // Verify tokens were actually staked

      // Fast forward time by 1 year
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const finalBalance = await staking.getBalance(user1.address);
      const expectedBalance = initialBalance + (initialBalance * BigInt(savingsRate)) / 10000n;

      expect(finalBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.001"));
    });

    it("Should accrue interest proportionally over partial time periods", async function () {
      const borrowRate = 1200; // 12% annual
      const savingsRate = 900; // 9% annual
      await rateController.setBorrowRate(borrowRate);
      await rateController.setSavingsRate(savingsRate);

      const initialBalance = await staking.getBalance(user1.address);
      expect(initialBalance).to.be.gt(0); // Verify tokens were actually staked

      // Fast forward time by 6 months
      await ethers.provider.send("evm_increaseTime", [182 * 24 * 60 * 60]); // ~6 months
      await ethers.provider.send("evm_mine", []);

      const finalBalance = await staking.getBalance(user1.address);
      const expectedBalance = initialBalance + (initialBalance * BigInt(savingsRate) * 182n) / (365n * 10000n);

      expect(finalBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.001"));
    });

    it("Should handle multiple interest accrual periods", async function () {
      await rateController.setBorrowRate(600); // 6%
      await rateController.setSavingsRate(400); // 4% annual

      const initialBalance = await staking.getBalance(user1.address);
      expect(initialBalance).to.be.gt(0); // Verify tokens were actually staked

      // Fast forward 3 months
      await ethers.provider.send("evm_increaseTime", [91 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      // Get the balance before rate change - this should include 91 days of 4% interest
      const expectedMidBalance = initialBalance + (initialBalance * BigInt(400) * 91n) / (365n * 10000n);
      const midBalance = await staking.getBalance(user1.address);

      // Change rate and fast forward another 3 months
      await rateController.setBorrowRate(1000); // 10%
      await rateController.setSavingsRate(700); // 7% annual

      const balanceAfterRateChange = await staking.getBalance(user1.address);
      // Now we fast forward time with the new 7% rate
      await ethers.provider.send("evm_increaseTime", [91 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const expectedFinalBalance =
        balanceAfterRateChange + (balanceAfterRateChange * BigInt(700) * 91n) / (365n * 10000n);
      const finalBalance = await staking.getBalance(user1.address);

      expect(midBalance).to.be.closeTo(expectedMidBalance, ethers.parseEther("0.001"));
      expect(finalBalance).to.be.closeTo(expectedFinalBalance, ethers.parseEther("0.001"));
    });
  });
});
