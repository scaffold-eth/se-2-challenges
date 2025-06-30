//
// This script executes when you run 'yarn test'
//

import { ethers } from "hardhat";
import { expect } from "chai";
import { Corn, CornDEX, Lending } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("💳🌽 Over-collateralized Lending Challenge 🤓", function () {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  let cornToken: Corn;
  let cornDEX: CornDEX;
  let lending: Lending;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const collateralAmount = ethers.parseEther("10");
  const borrowAmount = ethers.parseEther("5000");

  beforeEach(async function () {
    await ethers.provider.send("hardhat_reset", []);
    [owner, user1, user2] = await ethers.getSigners();

    const Corn = await ethers.getContractFactory("Corn");
    cornToken = await Corn.deploy();

    const CornDEX = await ethers.getContractFactory("CornDEX");
    cornDEX = await CornDEX.deploy(await cornToken.getAddress());

    await cornToken.mintTo(owner.address, ethers.parseEther("1000000"));
    await cornToken.approve(cornDEX.target, ethers.parseEther("1000000"));
    await cornDEX.init(ethers.parseEther("1000000"), { value: ethers.parseEther("1000") });

    // For SRE Auto-grader - use the the downloaded contract instead of default contract
    let contractArtifact = "";
    if (contractAddress) {
      contractArtifact = `contracts/download-${contractAddress}.sol:Lending`;
    } else {
      contractArtifact = "contracts/Lending.sol:Lending";
    }

    const Lending = await ethers.getContractFactory(contractArtifact);
    lending = (await Lending.deploy(cornDEX.target, cornToken.target)) as Lending;
    await cornToken.mintTo(lending.target, ethers.parseEther("10000000000000000000000"));
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await cornToken.balanceOf(lending.target)).to.equal(ethers.parseEther("10000000000000000000000"));
    });
  });

  describe("Collateral Operations", function () {
    it("Should allow adding collateral", async function () {
      await lending.connect(user1).addCollateral({ value: collateralAmount });
      expect(await lending.s_userCollateral(user1.address)).to.equal(collateralAmount);
    });

    it("Should require value of added collateral to be more than zero", async function () {
      await expect(lending.connect(user1).addCollateral({ value: 0 })).to.be.revertedWithCustomError(
        lending,
        "Lending__InvalidAmount",
      );
    });

    it("Should emit CollateralAdded event", async function () {
      await expect(lending.connect(user1).addCollateral({ value: collateralAmount }))
        .to.emit(lending, "CollateralAdded")
        .withArgs(user1.address, collateralAmount, await cornDEX.currentPrice());
    });

    it("Should allow withdrawing collateral when no debt", async function () {
      const balanceInitial = await ethers.provider.getBalance(user1.address);
      await lending.connect(user1).addCollateral({ value: collateralAmount });
      const balanceAfterAdd = await ethers.provider.getBalance(user1.address);
      expect(balanceAfterAdd).to.be.lt(balanceInitial);
      await lending.connect(user1).withdrawCollateral(collateralAmount);
      expect(await lending.s_userCollateral(user1.address)).to.equal(0);
      const balanceAfterWithdraw = await ethers.provider.getBalance(user1.address);
      expect(balanceAfterWithdraw).to.be.gt(balanceAfterAdd);
    });

    it("Should prevent withdrawing more than deposited", async function () {
      await lending.connect(user1).addCollateral({ value: collateralAmount });
      await expect(lending.connect(user1).withdrawCollateral(collateralAmount * 2n)).to.be.revertedWithCustomError(
        lending,
        "Lending__InvalidAmount",
      );
    });

    it("Should prevent withdrawing zero", async function () {
      await lending.connect(user1).addCollateral({ value: collateralAmount });
      await expect(lending.connect(user1).withdrawCollateral(0n)).to.be.revertedWithCustomError(
        lending,
        "Lending__InvalidAmount",
      );
    });

    it("Should prevent withdrawing collateral if it makes the position liquidatable", async function () {
      await lending.connect(user1).addCollateral({ value: collateralAmount });
      await lending.connect(user1).borrowCorn(borrowAmount);
      await expect(lending.connect(user1).withdrawCollateral(collateralAmount)).to.be.revertedWithCustomError(
        lending,
        "Lending__UnsafePositionRatio",
      );
    });
  });

  describe("Borrowing Operations", function () {
    beforeEach(async function () {
      await lending.connect(user1).addCollateral({ value: collateralAmount });
    });

    it("Should allow borrowing when sufficiently collateralized", async function () {
      expect(await cornToken.balanceOf(user1.address)).to.equal(0n);
      await lending.connect(user1).borrowCorn(borrowAmount);
      expect(await lending.s_userBorrowed(user1.address)).to.equal(borrowAmount);
      expect(await cornToken.balanceOf(user1.address)).to.equal(borrowAmount);
    });

    it("Should prevent borrowing when insufficiently collateralized", async function () {
      const tooMuchBorrow = ethers.parseEther("10000");
      await expect(lending.connect(user1).borrowCorn(tooMuchBorrow)).to.be.revertedWithCustomError(
        lending,
        "Lending__UnsafePositionRatio",
      );
    });

    it("Should prevent borrowing when amount is zero", async function () {
      await expect(lending.connect(user1).borrowCorn(0n)).to.be.revertedWithCustomError(
        lending,
        "Lending__InvalidAmount",
      );
    });

    it("Should emit AssetBorrowed event", async function () {
      await expect(lending.connect(user1).borrowCorn(borrowAmount))
        .to.emit(lending, "AssetBorrowed")
        .withArgs(user1.address, borrowAmount, await cornDEX.currentPrice());
    });
  });

  describe("Repayment Operations", function () {
    beforeEach(async function () {
      await lending.connect(user1).addCollateral({ value: collateralAmount });
      await lending.connect(user1).borrowCorn(borrowAmount);
    });

    it("Should allow repaying borrowed amount", async function () {
      await cornToken.connect(user1).approve(lending.target, borrowAmount);
      await lending.connect(user1).repayCorn(borrowAmount);
      expect(await lending.s_userBorrowed(user1.address)).to.equal(0);
    });

    it("Should allow repaying less than full borrowed amount", async function () {
      await cornToken.connect(user1).approve(lending.target, borrowAmount / 2n);
      await lending.connect(user1).repayCorn(borrowAmount / 2n);
      expect(await lending.s_userBorrowed(user1.address)).to.equal(borrowAmount / 2n);
    });

    it("Should prevent repaying more than borrowed", async function () {
      await cornToken.connect(user1).approve(lending.target, borrowAmount * 2n);
      await expect(lending.connect(user1).repayCorn(borrowAmount * 2n)).to.be.revertedWithCustomError(
        lending,
        "Lending__InvalidAmount",
      );
    });

    it("Should prevent repaying when amount is zero", async function () {
      await expect(lending.connect(user1).repayCorn(0n)).to.be.revertedWithCustomError(
        lending,
        "Lending__InvalidAmount",
      );
    });

    it("Should emit AssetRepaid event", async function () {
      await cornToken.connect(user1).approve(lending.target, borrowAmount);
      await expect(lending.connect(user1).repayCorn(borrowAmount))
        .to.emit(lending, "AssetRepaid")
        .withArgs(user1.address, borrowAmount, await cornDEX.currentPrice());
    });
  });

  describe("Liquidation", function () {
    beforeEach(async function () {
      await lending.connect(user1).addCollateral({ value: collateralAmount });
      await lending.connect(user1).borrowCorn(borrowAmount);
      await cornToken
        .connect(await ethers.getImpersonatedSigner(owner.address as string))
        .mintTo(user2.address, borrowAmount);
      await cornToken.connect(user2).approve(lending.target, borrowAmount);
    });

    it("Should allow liquidation when position is unsafe", async function () {
      // drop price of eth so that user1 position is below 1.2
      await cornDEX.swap(ethers.parseEther("300"), { value: ethers.parseEther("300") });
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await lending.isLiquidatable(user1)).to.be.true;
      // get balance before liquidation
      const beforeBalance = await ethers.provider.getBalance(user2.address);
      await lending.connect(user2).liquidate(user1.address);
      // get balance after liquidation
      const afterBalance = await ethers.provider.getBalance(user2.address);
      // check if user1's borrowed amount is 0
      expect(await lending.s_userBorrowed(user1.address)).to.equal(0);
      // check if user2's ETH balance increased
      expect(afterBalance).to.be.gt(beforeBalance);
    });

    it("Should prevent liquidation of safe positions", async function () {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await lending.isLiquidatable(user1)).to.be.false;
      await expect(lending.connect(user2).liquidate(user1.address)).to.be.revertedWithCustomError(
        lending,
        "Lending__NotLiquidatable",
      );
    });

    it("Should have enough CORN to liquidate", async function () {
      await cornDEX.swap(ethers.parseEther("300"), { value: ethers.parseEther("300") });
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await lending.isLiquidatable(user1)).to.be.true;
      await cornToken
        .connect(await ethers.getImpersonatedSigner(owner.address as string))
        .burnFrom(user2.address, borrowAmount / 2n);
      await expect(lending.connect(user2).liquidate(user1.address)).to.be.revertedWithCustomError(
        lending,
        "Lending__InsufficientLiquidatorCorn",
      );
    });

    it("Should emit appropriate events on liquidation", async function () {
      await cornDEX.swap(ethers.parseEther("300"), { value: ethers.parseEther("300") });
      await expect(lending.connect(user2).liquidate(user1.address)).to.emit(lending, "Liquidation");
    });
  });
});
