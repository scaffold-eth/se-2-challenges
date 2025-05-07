import { expect } from "chai";
import { ethers } from "hardhat";
import { PredictionMarket } from "../typechain-types";

describe("📈📉🏎️ Prediction Markets Challenge", function () {
  // We define a fixture to reuse the same setup in every test.

  let predictionMarket: PredictionMarket;
  let owner: any;
  let oracle: any;

  let contractArtifact = "";
  if (process.env.CONTRACT_ADDRESS) {
    contractArtifact = `contracts/download-${process.env.CONTRACT_ADDRESS}.sol:PredictionMarket1`;
  } else {
    contractArtifact = "contracts/PredictionMarket.sol:PredictionMarket";
  }
  before(async () => {
    [owner, oracle] = await ethers.getSigners();
    const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
    predictionMarket = (await predictionMarketFactory.deploy(
      owner.address,
      oracle.address,
      "Test Question",
      ethers.parseEther("1"),
      50,
      20,
      { value: ethers.parseEther("10") },
    )) as PredictionMarket;
    await predictionMarket.waitForDeployment();
  });

  describe("Checkpoint2", function () {
    it("Should revert when no ETH is provided for initial liquidity", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);

      await expect(
        predictionMarketFactory.deploy(
          owner.address,
          oracle.address,
          "Test Question",
          ethers.parseEther("1"),
          50,
          20,
          { value: 0 }, // No ETH provided
        ),
      ).to.be.revertedWithCustomError(predictionMarketFactory, "PredictionMarket__MustProvideETHForInitialLiquidity");
    });

    it("Should revert when initialYesProbability is 0 or >= 100", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);

      // Test case 1: initialYesProbability = 0
      await expect(
        predictionMarketFactory.deploy(
          owner.address,
          oracle.address,
          "Test Question",
          ethers.parseEther("1"),
          0, // Invalid probability (0)
          20,
          { value: ethers.parseEther("10") },
        ),
      ).to.be.revertedWithCustomError(predictionMarketFactory, "PredictionMarket__InvalidProbability");

      // Test case 2: initialYesProbability = 100
      await expect(
        predictionMarketFactory.deploy(
          owner.address,
          oracle.address,
          "Test Question",
          ethers.parseEther("1"),
          100, // Invalid probability (>= 100)
          20,
          { value: ethers.parseEther("10") },
        ),
      ).to.be.revertedWithCustomError(predictionMarketFactory, "PredictionMarket__InvalidProbability");
    });

    it("Should revert when percentageToLock is >= 100 or 0", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);

      // Test case 1: percentageToLock = 0
      await expect(
        predictionMarketFactory.deploy(
          owner.address,
          oracle.address,
          "Test Question",
          ethers.parseEther("1"),
          50,
          0, // Invalid percentage (0)
          { value: ethers.parseEther("10") },
        ),
      ).to.be.revertedWithCustomError(predictionMarketFactory, "PredictionMarket__InvalidPercentageToLock");

      // Test case 2: percentageToLock = 100
      await expect(
        predictionMarketFactory.deploy(
          owner.address,
          oracle.address,
          "Test Question",
          ethers.parseEther("1"),
          50,
          100, // Invalid percentage (>= 100)
          { value: ethers.parseEther("10") },
        ),
      ).to.be.revertedWithCustomError(predictionMarketFactory, "PredictionMarket__InvalidPercentageToLock");
    });
    it("Should set the correct state variables on deployment", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const question = "Will the green car win the race?";
      const initialTokenValue = ethers.parseEther("0.01");
      const initialYesProbability = 60;
      const percentageToLock = 10;
      const initialLiquidity = ethers.parseEther("1");

      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        question,
        initialTokenValue,
        initialYesProbability,
        percentageToLock,
        { value: initialLiquidity },
      );
      await predictionMarket.waitForDeployment();

      // Verify all state variables are set correctly
      expect(await predictionMarket.i_oracle()).to.equal(oracle.address);
      expect(await predictionMarket.s_question()).to.equal(question);
      expect(await predictionMarket.i_initialTokenValue()).to.equal(initialTokenValue);
      expect(await predictionMarket.i_initialYesProbability()).to.equal(initialYesProbability);
      expect(await predictionMarket.i_percentageLocked()).to.equal(percentageToLock);
      expect(await predictionMarket.s_ethCollateral()).to.equal(initialLiquidity);
    });
  });

  describe("Checkpoint3", function () {
    it("Should correctly calculate initial token amounts", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const question = "Will the green car win the race?";
      const initialTokenValue = ethers.parseEther("0.01");
      const initialYesProbability = 60;
      const percentageToLock = 10;
      const initialLiquidity = ethers.parseEther("1");

      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        question,
        initialTokenValue,
        initialYesProbability,
        percentageToLock,
        { value: initialLiquidity },
      );
      await predictionMarket.waitForDeployment();

      // Get token contracts
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const noTokenAddress = await predictionMarket.i_noToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);
      const noToken = await ethers.getContractAt("PredictionMarketToken", noTokenAddress);

      // Calculate expected values
      const PRECISION = BigInt(1e18); // 1e18 precision
      const initialTokenAmount = (initialLiquidity * PRECISION) / initialTokenValue; // 10 tokens

      // Verify token amounts
      expect(await yesToken.totalSupply()).to.equal(initialTokenAmount);
      expect(await noToken.totalSupply()).to.equal(initialTokenAmount);
    });

    it("Should correctly transfer locked tokens to deployer", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const question = "Will the green car win the race?";
      const initialTokenValue = ethers.parseEther("0.01");
      const initialYesProbability = 60;
      const percentageToLock = 10;
      const initialLiquidity = ethers.parseEther("1");

      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        question,
        initialTokenValue,
        initialYesProbability,
        percentageToLock,
        { value: initialLiquidity },
      );
      await predictionMarket.waitForDeployment();

      // Get token contracts
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const noTokenAddress = await predictionMarket.i_noToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);
      const noToken = await ethers.getContractAt("PredictionMarketToken", noTokenAddress);

      // Calculate expected values
      const PRECISION = BigInt(1e18); // 1e18 precision
      const initialTokenAmount = (initialLiquidity * PRECISION) / initialTokenValue; // 10 tokens
      const initialYesAmountLocked =
        (initialTokenAmount * BigInt(initialYesProbability) * BigInt(percentageToLock) * BigInt(2)) / BigInt(10000);
      const initialNoAmountLocked =
        (initialTokenAmount * BigInt(100 - initialYesProbability) * BigInt(percentageToLock) * BigInt(2)) /
        BigInt(10000);

      // Verify locked token transfers to deployer
      expect(await yesToken.balanceOf(owner.address)).to.equal(initialYesAmountLocked);
      expect(await noToken.balanceOf(owner.address)).to.equal(initialNoAmountLocked);
    });
  });

  describe("Checkpoint4", function () {
    it("Should successfully add liquidity, mint tokens and update state variables", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();
      const initialEthCollateral = await predictionMarket.s_ethCollateral();
      const liquidityToAdd = ethers.parseEther("5");
      const expectedTokenAmount = (liquidityToAdd * BigInt(1e18)) / ethers.parseEther("1");
      // Get initial token balances
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const noTokenAddress = await predictionMarket.i_noToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);
      const noToken = await ethers.getContractAt("PredictionMarketToken", noTokenAddress);
      const initialYesTokenBalance = await yesToken.balanceOf(predictionMarket.getAddress());
      const initialNoTokenBalance = await noToken.balanceOf(predictionMarket.getAddress());
      // Add liquidity
      await predictionMarket.connect(owner).addLiquidity({ value: liquidityToAdd });
      // Verify state changes
      expect(await predictionMarket.s_ethCollateral()).to.equal(initialEthCollateral + liquidityToAdd);
      expect(await yesToken.balanceOf(predictionMarket.getAddress())).to.equal(
        initialYesTokenBalance + expectedTokenAmount,
      );
      expect(await noToken.balanceOf(predictionMarket.getAddress())).to.equal(
        initialNoTokenBalance + expectedTokenAmount,
      );
    });

    it("Should revert when trying to remove more tokens than available", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Try to remove more ETH than we initially provided
      const ethToRemove = ethers.parseEther("11"); // Try to remove 11 ETH when we only have 10 ETH worth of tokens

      // Try to remove liquidity with more tokens than available
      await expect(predictionMarket.connect(owner).removeLiquidity(ethToRemove)).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__InsufficientTokenReserve",
      );
    });
    it("Should successfully remove liquidity, burn tokens and update state variables", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();
      const initialEthCollateral = await predictionMarket.s_ethCollateral();
      const ethToRemove = ethers.parseEther("5");
      const expectedTokenAmount = (ethToRemove * BigInt(1e18)) / ethers.parseEther("1");
      // Get initial token balances
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const noTokenAddress = await predictionMarket.i_noToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);
      const noToken = await ethers.getContractAt("PredictionMarketToken", noTokenAddress);
      const initialYesTokenBalance = await yesToken.balanceOf(predictionMarket.getAddress());
      const initialNoTokenBalance = await noToken.balanceOf(predictionMarket.getAddress());
      // Remove liquidity
      await predictionMarket.connect(owner).removeLiquidity(ethToRemove);
      // Verify state changes
      expect(await predictionMarket.s_ethCollateral()).to.equal(initialEthCollateral - ethToRemove);
      expect(await yesToken.balanceOf(predictionMarket.getAddress())).to.equal(
        initialYesTokenBalance - expectedTokenAmount,
      );
      expect(await noToken.balanceOf(predictionMarket.getAddress())).to.equal(
        initialNoTokenBalance - expectedTokenAmount,
      );
    });

    it("Should emit correct events when adding and removing liquidity", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Test LiquidityAdded event
      const liquidityToAdd = ethers.parseEther("5");
      const expectedTokenAmount = (liquidityToAdd * BigInt(1e18)) / ethers.parseEther("1");

      // Add liquidity and expect event
      await expect(predictionMarket.connect(owner).addLiquidity({ value: liquidityToAdd }))
        .to.emit(predictionMarket, "LiquidityAdded")
        .withArgs(owner.address, liquidityToAdd, expectedTokenAmount);

      // Test LiquidityRemoved event
      const ethToRemove = ethers.parseEther("3");
      const expectedTokenAmountToRemove = (ethToRemove * BigInt(1e18)) / ethers.parseEther("1");

      // Remove liquidity and expect event
      await expect(predictionMarket.connect(owner).removeLiquidity(ethToRemove))
        .to.emit(predictionMarket, "LiquidityRemoved")
        .withArgs(owner.address, ethToRemove, expectedTokenAmountToRemove);
    });
  });

  describe("Checkpoint5", function () {
    it("Should revert when trying to add liquidity after prediction is reported", async function () {
      // First report the prediction
      await predictionMarket.connect(oracle).report(0); // Report YES as winning option

      // Try to add liquidity after prediction is reported
      await expect(
        predictionMarket.connect(owner).addLiquidity({ value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(predictionMarket, "PredictionMarket__PredictionAlreadyReported");
    });

    it("Should revert when trying to remove liquidity after prediction is reported", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // First report the prediction
      await predictionMarket.connect(oracle).report(0); // Report YES as winning option

      // Try to remove liquidity after prediction is reported
      await expect(
        predictionMarket.connect(owner).removeLiquidity(ethers.parseEther("1")),
      ).to.be.revertedWithCustomError(predictionMarket, "PredictionMarket__PredictionAlreadyReported");
    });

    it("Should revert when trying to report after prediction is reported", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // First report the prediction
      await predictionMarket.connect(oracle).report(0); // Report YES as winning option

      // Try to report again
      await expect(predictionMarket.connect(oracle).report(0)).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__PredictionAlreadyReported",
      );
    });

    it("Should revert when trying to report when not called by the s_oracle", async function () {
      const [owner, oracle, nonOracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Try to report from non-oracle account
      await expect(predictionMarket.connect(nonOracle).report(0)).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__OnlyOracleCanReport",
      );
    });

    it("Should correctly set winning token and isReported flag when reporting", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token addresses before reporting
      const yesTokenAddress = await predictionMarket.i_yesToken();

      // Initially isReported should be false
      expect(await predictionMarket.s_isReported()).to.equal(false);

      // Report YES outcome
      await predictionMarket.connect(oracle).report(0);

      // Verify isReported is set to true
      expect(await predictionMarket.s_isReported()).to.equal(true);

      // Verify winning token is set to YES token
      expect(await predictionMarket.s_winningToken()).to.equal(yesTokenAddress);

      // Deploy a new instance for testing NO outcome
      const predictionMarket2 = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question 2",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket2.waitForDeployment();

      // Get token addresses for second instance
      const noTokenAddress2 = await predictionMarket2.i_noToken();

      // Initially isReported should be false
      expect(await predictionMarket2.s_isReported()).to.equal(false);

      // Report NO outcome
      await predictionMarket2.connect(oracle).report(1);

      // Verify isReported is set to true
      expect(await predictionMarket2.s_isReported()).to.equal(true);

      // Verify winning token is set to NO token
      expect(await predictionMarket2.s_winningToken()).to.equal(noTokenAddress2);
    });

    it("Should emit correct MarketReported event when reporting", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token addresses before reporting
      const yesTokenAddress = await predictionMarket.i_yesToken();

      // Report YES outcome and expect event
      await expect(predictionMarket.connect(oracle).report(0))
        .to.emit(predictionMarket, "MarketReported")
        .withArgs(oracle.address, 0, yesTokenAddress); // 0 represents YES outcome

      // Deploy a new instance for testing NO outcome
      const predictionMarket2 = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question 2",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket2.waitForDeployment();

      // Get token addresses for second instance
      const noTokenAddress2 = await predictionMarket2.i_noToken();

      // Report NO outcome and expect event
      await expect(predictionMarket2.connect(oracle).report(1))
        .to.emit(predictionMarket2, "MarketReported")
        .withArgs(oracle.address, 1, noTokenAddress2); // 1 represents NO outcome
    });
  });

  describe("Checkpoint6", function () {
    it("Should revert when trying to resolve before prediction is reported", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Try to resolve before reporting
      await expect(predictionMarket.connect(owner).resolveMarketAndWithdraw()).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__PredictionNotReported",
      );
    });

    it("Should correctly resolve market and withdraw ETH", async function () {
      const [owner, oracle, nonOwner] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get initial balances
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      const initialContractBalance = await ethers.provider.getBalance(predictionMarket.getAddress());

      // Report the prediction
      await predictionMarket.connect(oracle).report(0); // Report YES as winning option

      // Get winning token contract and initial values
      const winningTokenAddress = await predictionMarket.s_winningToken();
      const winningToken = await ethers.getContractAt("PredictionMarketToken", winningTokenAddress);
      const initialWinningTokens = await winningToken.balanceOf(predictionMarket.getAddress());
      const initialLpTradingRevenue = await predictionMarket.s_lpTradingRevenue();

      // Calculate expected amounts before resolving
      const expectedEthAmount = (initialWinningTokens * ethers.parseEther("1")) / BigInt(1e18);
      const expectedTotalEthToSend = expectedEthAmount + initialLpTradingRevenue;

      // Try to resolve from non-owner account (should fail)
      await expect(predictionMarket.connect(nonOwner).resolveMarketAndWithdraw()).to.be.revertedWithCustomError(
        predictionMarket,
        "OwnableUnauthorizedAccount",
      );

      // Resolve market
      const tx = await predictionMarket.connect(owner).resolveMarketAndWithdraw();
      const receipt = await tx.wait();

      // Get final balances
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      const finalContractBalance = await ethers.provider.getBalance(predictionMarket.getAddress());
      const finalWinningTokens = await winningToken.balanceOf(predictionMarket.getAddress());

      // Verify state changes
      const expectedWinningTokens = BigInt(0);
      expect(finalWinningTokens).to.equal(expectedWinningTokens); // All winning tokens should be burned

      // Account for gas costs in balance calculations
      const gasUsed = receipt?.gasUsed || BigInt(0);
      const gasPrice = tx.gasPrice || BigInt(0);
      const gasCost = gasUsed * gasPrice;
      const actualEthReceived = finalOwnerBalance - initialOwnerBalance + gasCost;

      // Verify the exact amount was sent
      expect(actualEthReceived).to.equal(expectedTotalEthToSend);
      expect(finalContractBalance).to.equal(initialContractBalance - expectedTotalEthToSend);

      // Verify event emission
      const marketResolvedEvent = receipt?.logs.find(log => {
        try {
          return predictionMarket.interface.parseLog({ topics: log.topics, data: log.data })?.name === "MarketResolved";
        } catch {
          return false;
        }
      });
      const expectedEvent = marketResolvedEvent !== undefined;
      expect(expectedEvent).to.equal(true);
    });

    it("Should send exact totalEthToSend amount to msg.sender", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get initial balances
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      const initialContractBalance = await ethers.provider.getBalance(predictionMarket.getAddress());
      const initialLpTradingRevenue = await predictionMarket.s_lpTradingRevenue();

      // Report the prediction
      await predictionMarket.connect(oracle).report(0); // Report YES as winning option

      // Get winning token contract and balance
      const winningTokenAddress = await predictionMarket.s_winningToken();
      const winningToken = await ethers.getContractAt("PredictionMarketToken", winningTokenAddress);
      const contractWinningTokens = await winningToken.balanceOf(predictionMarket.getAddress());

      // Calculate expected ETH amount from winning tokens
      const ethFromWinningTokens = (contractWinningTokens * ethers.parseEther("1")) / BigInt(1e18);

      // Calculate expected total ETH to send
      const expectedTotalEthToSend = ethFromWinningTokens + initialLpTradingRevenue;

      // Resolve market and get transaction
      const tx = await predictionMarket.connect(owner).resolveMarketAndWithdraw();
      const receipt = await tx.wait();

      // Get final balances
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      const finalContractBalance = await ethers.provider.getBalance(predictionMarket.getAddress());

      // Calculate actual ETH sent (accounting for gas costs)
      const gasUsed = receipt?.gasUsed || BigInt(0);
      const gasPrice = tx.gasPrice || BigInt(0);
      const gasCost = gasUsed * gasPrice;
      const actualEthReceived = finalOwnerBalance - initialOwnerBalance + gasCost;

      // Verify the exact amount was sent
      expect(actualEthReceived).to.equal(expectedTotalEthToSend);
      expect(finalContractBalance).to.equal(initialContractBalance - expectedTotalEthToSend);
    });
  });

  describe("Checkpoint7", function () {
    it("Should correctly calculate buy price in ETH", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contracts
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const noTokenAddress = await predictionMarket.i_noToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);
      const noToken = await ethers.getContractAt("PredictionMarketToken", noTokenAddress);

      // Calculate expected values
      const PRECISION = BigInt(1e18);
      const initialTokenAmount = (ethers.parseEther("10") * PRECISION) / ethers.parseEther("1");
      const tradingAmount = initialTokenAmount / BigInt(10); // Buy 10% of total supply

      // Get buy price for YES tokens
      const buyPrice = await predictionMarket.getBuyPriceInEth(0, tradingAmount);

      // Verify price calculation
      const currentTokenSoldBefore = initialTokenAmount - (await yesToken.balanceOf(predictionMarket.getAddress()));
      const currentOtherTokenSold = initialTokenAmount - (await noToken.balanceOf(predictionMarket.getAddress()));
      const totalTokensSoldBefore = currentTokenSoldBefore + currentOtherTokenSold;
      const probabilityBefore = (currentTokenSoldBefore * PRECISION) / totalTokensSoldBefore;

      const currentTokenReserveAfter = (await yesToken.balanceOf(predictionMarket.getAddress())) - tradingAmount;
      const currentTokenSoldAfter = initialTokenAmount - currentTokenReserveAfter;
      const totalTokensSoldAfter = totalTokensSoldBefore + tradingAmount;
      const probabilityAfter = (currentTokenSoldAfter * PRECISION) / totalTokensSoldAfter;

      const probabilityAvg = (probabilityBefore + probabilityAfter) / BigInt(2);
      const expectedPrice = (ethers.parseEther("1") * probabilityAvg * tradingAmount) / (PRECISION * PRECISION);

      expect(buyPrice).to.equal(expectedPrice);
    });

    it("Should correctly calculate sell price in ETH", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contracts
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const noTokenAddress = await predictionMarket.i_noToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);
      const noToken = await ethers.getContractAt("PredictionMarketToken", noTokenAddress);

      // Calculate expected values
      const PRECISION = BigInt(1e18);
      const initialTokenAmount = (ethers.parseEther("10") * PRECISION) / ethers.parseEther("1");
      const tradingAmount = initialTokenAmount / BigInt(10); // Sell 10% of total supply

      // Get sell price for YES tokens
      const sellPrice = await predictionMarket.getSellPriceInEth(0, tradingAmount);

      // Verify price calculation
      const currentTokenSoldBefore = initialTokenAmount - (await yesToken.balanceOf(predictionMarket.getAddress()));
      const currentOtherTokenSold = initialTokenAmount - (await noToken.balanceOf(predictionMarket.getAddress()));
      const totalTokensSoldBefore = currentTokenSoldBefore + currentOtherTokenSold;
      const probabilityBefore = (currentTokenSoldBefore * PRECISION) / totalTokensSoldBefore;

      const currentTokenReserveAfter = (await yesToken.balanceOf(predictionMarket.getAddress())) + tradingAmount;
      const currentTokenSoldAfter = initialTokenAmount - currentTokenReserveAfter;
      const totalTokensSoldAfter = totalTokensSoldBefore - tradingAmount;
      const probabilityAfter = (currentTokenSoldAfter * PRECISION) / totalTokensSoldAfter;

      const probabilityAvg = (probabilityBefore + probabilityAfter) / BigInt(2);
      const expectedPrice = (ethers.parseEther("1") * probabilityAvg * tradingAmount) / (PRECISION * PRECISION);

      expect(sellPrice).to.equal(expectedPrice);
    });

    it("Should revert when trying to buy more tokens than available in reserve", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // Try to buy more tokens than available in reserve
      const reserveAmount = await yesToken.balanceOf(predictionMarket.getAddress());
      const tooManyTokens = reserveAmount + BigInt(1);

      await expect(predictionMarket.getBuyPriceInEth(0, tooManyTokens)).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__InsufficientLiquidity",
      );
    });

    it("Should correctly calculate probability for different token amounts", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contracts
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const noTokenAddress = await predictionMarket.i_noToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);
      const noToken = await ethers.getContractAt("PredictionMarketToken", noTokenAddress);

      // Calculate expected values
      const PRECISION = BigInt(1e18);
      const initialTokenAmount = (ethers.parseEther("10") * PRECISION) / ethers.parseEther("1");

      // Test different scenarios
      const scenarios = [
        { liquidityToAdd: ethers.parseEther("10"), expectedProbability: PRECISION / BigInt(2) }, // 50% YES (initial state)
        { liquidityToAdd: ethers.parseEther("20"), expectedProbability: PRECISION / BigInt(2) }, // Still 50% YES
      ];

      for (const scenario of scenarios) {
        // Add liquidity to create token balances
        await predictionMarket.connect(owner).addLiquidity({ value: scenario.liquidityToAdd });

        // Calculate probability
        const currentTokenSold = initialTokenAmount - (await yesToken.balanceOf(predictionMarket.getAddress()));
        const totalTokensSold =
          initialTokenAmount -
          (await yesToken.balanceOf(predictionMarket.getAddress())) +
          (initialTokenAmount - (await noToken.balanceOf(predictionMarket.getAddress())));
        const probability = (currentTokenSold * PRECISION) / totalTokensSold;

        expect(probability).to.equal(scenario.expectedProbability);
      }
    });

    it("Should correctly get current reserves for both YES and NO outcomes", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contracts
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const noTokenAddress = await predictionMarket.i_noToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);
      const noToken = await ethers.getContractAt("PredictionMarketToken", noTokenAddress);

      // Get initial reserves
      const initialYesReserve = await yesToken.balanceOf(predictionMarket.getAddress());
      const initialNoReserve = await noToken.balanceOf(predictionMarket.getAddress());

      // Test reserves through price calculation for YES outcome
      const smallAmount = BigInt(1e15); // Small amount to minimize price impact
      const yesPrice = await predictionMarket.getBuyPriceInEth(0, smallAmount);
      expect(yesPrice).to.be.gt(0); // Price should be calculated correctly

      // Test reserves through price calculation for NO outcome
      const noPrice = await predictionMarket.getBuyPriceInEth(1, smallAmount);
      expect(noPrice).to.be.gt(0); // Price should be calculated correctly

      // Add some liquidity to change reserves
      await predictionMarket.connect(owner).addLiquidity({ value: ethers.parseEther("5") });

      // Get new reserves
      const newYesReserve = await yesToken.balanceOf(predictionMarket.getAddress());
      const newNoReserve = await noToken.balanceOf(predictionMarket.getAddress());

      // Verify reserves increased equally
      expect(newYesReserve).to.be.gt(initialYesReserve);
      expect(newNoReserve).to.be.gt(initialNoReserve);
      expect(newYesReserve).to.equal(newNoReserve);

      // Test reserves again through price calculation
      const yesPriceAfter = await predictionMarket.getBuyPriceInEth(0, smallAmount);
      const noPriceAfter = await predictionMarket.getBuyPriceInEth(1, smallAmount);

      // Prices should still be calculated correctly with new reserves
      expect(yesPriceAfter).to.be.gt(0);
      expect(noPriceAfter).to.be.gt(0);
    });

    it("Should correctly calculate probability with edge cases", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Calculate expected values
      const PRECISION = BigInt(1e18);
      const initialTokenAmount = (ethers.parseEther("10") * PRECISION) / ethers.parseEther("1");

      // Test different scenarios for probability calculation
      const scenarios = [
        // Very small amount of tokens sold (almost all in reserve)
        {
          yesTokensSold: BigInt(1),
          totalTokensSold: BigInt(2),
          expectedProbability: PRECISION / BigInt(2), // 50%
        },
        // Almost all tokens sold (very small reserve)
        {
          yesTokensSold: initialTokenAmount - BigInt(1),
          totalTokensSold: initialTokenAmount * BigInt(2) - BigInt(2),
          expectedProbability: PRECISION / BigInt(2), // 50%
        },
        // Uneven distribution (more YES tokens sold)
        {
          yesTokensSold: initialTokenAmount / BigInt(2),
          totalTokensSold: initialTokenAmount,
          expectedProbability: PRECISION / BigInt(2), // 50%
        },
        // Uneven distribution (more NO tokens sold)
        {
          yesTokensSold: initialTokenAmount / BigInt(4),
          totalTokensSold: initialTokenAmount,
          expectedProbability: PRECISION / BigInt(4), // 25%
        },
      ];

      for (const scenario of scenarios) {
        // Calculate probability using the contract's formula
        const probability = (scenario.yesTokensSold * PRECISION) / scenario.totalTokensSold;

        // Verify the probability calculation
        expect(probability).to.equal(scenario.expectedProbability);

        // Verify that the probability is within valid range (0 to 1)
        expect(probability).to.be.gte(BigInt(0));
        expect(probability).to.be.lte(PRECISION);
      }
    });
  });

  describe("Checkpoint8", function () {
    it("Should revert when trying to buy tokens with zero amount", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Try to buy tokens with zero amount
      await expect(
        predictionMarket.connect(owner).buyTokensWithETH(0, 0, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(predictionMarket, "PredictionMarket__AmountMustBeGreaterThanZero");
    });

    it("Should revert when trying to sell tokens with zero amount", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Try to sell tokens with zero amount
      await expect(predictionMarket.connect(owner).sellTokensForEth(0, 0)).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__AmountMustBeGreaterThanZero",
      );
    });

    it("Should revert when trying to buy tokens with incorrect ETH amount", async function () {
      const [owner, oracle, buyer] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // Calculate amount to buy
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);

      // Try to buy with incorrect ETH amount
      await expect(
        predictionMarket.connect(buyer).buyTokensWithETH(0, amountToBuy, { value: requiredEth + BigInt(1) }),
      ).to.be.revertedWithCustomError(predictionMarket, "PredictionMarket__MustSendExactETHAmount");
    });

    it("Should successfully buy tokens with ETH", async function () {
      const [owner, oracle, buyer] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // Calculate amount to buy
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);

      // Get initial balances
      const initialBuyerBalance = await yesToken.balanceOf(buyer.address);
      const initialContractBalance = await ethers.provider.getBalance(predictionMarket.getAddress());

      // Buy tokens
      await predictionMarket.connect(buyer).buyTokensWithETH(0, amountToBuy, { value: requiredEth });

      // Get final balances
      const finalBuyerBalance = await yesToken.balanceOf(buyer.address);
      const finalContractBalance = await ethers.provider.getBalance(predictionMarket.getAddress());

      // Verify token transfer
      expect(finalBuyerBalance).to.equal(initialBuyerBalance + amountToBuy);
      expect(finalContractBalance).to.equal(initialContractBalance + requiredEth);
    });

    it("Should successfully sell tokens for ETH", async function () {
      const [owner, oracle, seller] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // First buy some tokens
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);
      await predictionMarket.connect(seller).buyTokensWithETH(0, amountToBuy, { value: requiredEth });

      // Approve tokens for selling
      await yesToken.connect(seller).approve(predictionMarket.getAddress(), amountToBuy);

      // Get initial balances
      const initialSellerBalance = await ethers.provider.getBalance(seller.address);
      const initialContractBalance = await ethers.provider.getBalance(predictionMarket.getAddress());
      const initialSellerTokens = await yesToken.balanceOf(seller.address);

      // Calculate ETH to receive
      const ethToReceive = await predictionMarket.getSellPriceInEth(0, amountToBuy);

      // Sell tokens
      const tx = await predictionMarket.connect(seller).sellTokensForEth(0, amountToBuy);
      const receipt = await tx.wait();

      // Get final balances
      const finalSellerBalance = await ethers.provider.getBalance(seller.address);
      const finalContractBalance = await ethers.provider.getBalance(predictionMarket.getAddress());
      const finalSellerTokens = await yesToken.balanceOf(seller.address);

      // Calculate actual ETH received (accounting for gas costs)
      const gasUsed = receipt?.gasUsed || BigInt(0);
      const gasPrice = tx.gasPrice || BigInt(0);
      const gasCost = gasUsed * gasPrice;
      const actualEthReceived = finalSellerBalance - initialSellerBalance + gasCost;

      // Verify token transfer and ETH received
      expect(finalSellerTokens).to.equal(initialSellerTokens - amountToBuy);
      expect(actualEthReceived).to.equal(ethToReceive);
      expect(finalContractBalance).to.equal(initialContractBalance - ethToReceive);
    });

    it("Should revert when trying to sell more tokens than owned", async function () {
      const [owner, oracle, seller] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // First buy some tokens
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);
      await predictionMarket.connect(seller).buyTokensWithETH(0, amountToBuy, { value: requiredEth });

      // Approve tokens for selling
      await yesToken.connect(seller).approve(predictionMarket.getAddress(), amountToBuy);

      // Try to sell more tokens than owned
      const tooManyTokens = amountToBuy + BigInt(1);
      await expect(predictionMarket.connect(seller).sellTokensForEth(0, tooManyTokens)).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__InsufficientBalance",
      );
    });

    it("Should revert when trying to sell tokens without approval", async function () {
      const [owner, oracle, seller] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // First buy some tokens
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);
      await predictionMarket.connect(seller).buyTokensWithETH(0, amountToBuy, { value: requiredEth });

      // Try to sell tokens without approval
      await expect(predictionMarket.connect(seller).sellTokensForEth(0, amountToBuy)).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__InsufficientAllowance",
      );
    });

    it("Should emit correct events when buying and selling tokens", async function () {
      const [owner, oracle, trader] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // Calculate amount to buy
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);

      // Buy tokens and expect event
      await expect(predictionMarket.connect(trader).buyTokensWithETH(0, amountToBuy, { value: requiredEth }))
        .to.emit(predictionMarket, "TokensPurchased")
        .withArgs(trader.address, 0, amountToBuy, requiredEth);

      // Approve tokens for selling
      await yesToken.connect(trader).approve(predictionMarket.getAddress(), amountToBuy);

      // Calculate ETH to receive
      const ethToReceive = await predictionMarket.getSellPriceInEth(0, amountToBuy);

      // Sell tokens and expect event
      await expect(predictionMarket.connect(trader).sellTokensForEth(0, amountToBuy))
        .to.emit(predictionMarket, "TokensSold")
        .withArgs(trader.address, 0, amountToBuy, ethToReceive);
    });

    it("Should revert when trying to buy tokens after prediction is reported", async function () {
      const [owner, oracle, buyer] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // Calculate amount to buy
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);

      // Report the prediction
      await predictionMarket.connect(oracle).report(0);

      // Try to buy tokens after prediction is reported
      await expect(
        predictionMarket.connect(buyer).buyTokensWithETH(0, amountToBuy, { value: requiredEth }),
      ).to.be.revertedWithCustomError(predictionMarket, "PredictionMarket__PredictionAlreadyReported");
    });

    it("Should revert when trying to sell tokens after prediction is reported", async function () {
      const [owner, oracle, seller] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // First buy some tokens
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);
      await predictionMarket.connect(seller).buyTokensWithETH(0, amountToBuy, { value: requiredEth });

      // Approve tokens for selling
      await yesToken.connect(seller).approve(predictionMarket.getAddress(), amountToBuy);

      // Report the prediction
      await predictionMarket.connect(oracle).report(0);

      // Try to sell tokens after prediction is reported
      await expect(predictionMarket.connect(seller).sellTokensForEth(0, amountToBuy)).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__PredictionAlreadyReported",
      );
    });

    it("Owner cannot buy or sell tokens", async function () {
      const [owner] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        owner.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);

      // Owner tries to buy tokens
      await expect(
        predictionMarket.connect(owner).buyTokensWithETH(0, amountToBuy, { value: requiredEth }),
      ).to.be.revertedWithCustomError(predictionMarket, "PredictionMarket__OwnerCannotCall");

      // Owner tries to sell tokens (even if owner doesn't have tokens, should revert on owner check)
      await expect(predictionMarket.connect(owner).sellTokensForEth(0, amountToBuy)).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__OwnerCannotCall",
      );
    });
  });

  describe("Checkpoint9", function () {
    it("Should revert when trying to redeem before prediction is reported", async function () {
      const [owner, oracle, redeemer] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Try to redeem before prediction is reported
      await expect(
        predictionMarket.connect(redeemer).redeemWinningTokens(ethers.parseEther("1")),
      ).to.be.revertedWithCustomError(predictionMarket, "PredictionMarket__PredictionNotReported");
    });

    it("Should revert when trying to redeem more tokens than owned", async function () {
      const [owner, oracle, redeemer] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Report the prediction
      await predictionMarket.connect(oracle).report(0); // Report YES as winning outcome

      // Try to redeem more tokens than owned
      await expect(
        predictionMarket.connect(redeemer).redeemWinningTokens(ethers.parseEther("1")),
      ).to.be.revertedWithCustomError(predictionMarket, "PredictionMarket__InsufficientWinningTokens");
    });

    it("Should revert when trying to redeem zero tokens", async function () {
      const [owner, oracle, redeemer] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Report the prediction
      await predictionMarket.connect(oracle).report(0);

      // Try to redeem zero tokens
      await expect(predictionMarket.connect(redeemer).redeemWinningTokens(0)).to.be.revertedWithCustomError(
        predictionMarket,
        "PredictionMarket__AmountMustBeGreaterThanZero",
      );
    });

    it("Should successfully redeem winning tokens and receive ETH", async function () {
      const [owner, oracle, redeemer] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // First buy some YES tokens
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);
      await predictionMarket.connect(redeemer).buyTokensWithETH(0, amountToBuy, { value: requiredEth });

      // Report YES as winning outcome
      await predictionMarket.connect(oracle).report(0);

      // Get initial balances
      const initialRedeemerBalance = await ethers.provider.getBalance(redeemer.address);
      const initialContractBalance = await ethers.provider.getBalance(predictionMarket.getAddress());
      const initialRedeemerTokens = await yesToken.balanceOf(redeemer.address);

      // Calculate expected ETH to receive
      const expectedEthToReceive = (amountToBuy * ethers.parseEther("1")) / BigInt(1e18);

      // Redeem tokens
      const tx = await predictionMarket.connect(redeemer).redeemWinningTokens(amountToBuy);
      const receipt = await tx.wait();

      // Get final balances
      const finalRedeemerBalance = await ethers.provider.getBalance(redeemer.address);
      const finalContractBalance = await ethers.provider.getBalance(predictionMarket.getAddress());
      const finalRedeemerTokens = await yesToken.balanceOf(redeemer.address);

      // Calculate actual ETH received (accounting for gas costs)
      const gasUsed = receipt?.gasUsed || BigInt(0);
      const gasPrice = tx.gasPrice || BigInt(0);
      const gasCost = gasUsed * gasPrice;
      const actualEthReceived = finalRedeemerBalance - initialRedeemerBalance + gasCost;

      // Verify token burning and ETH transfer
      expect(finalRedeemerTokens).to.equal(initialRedeemerTokens - amountToBuy);
      expect(actualEthReceived).to.equal(expectedEthToReceive);
      expect(finalContractBalance).to.equal(initialContractBalance - expectedEthToReceive);
    });

    it("Should emit correct WinningTokensRedeemed event", async function () {
      const [owner, oracle, redeemer] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Get token contract
      const yesTokenAddress = await predictionMarket.i_yesToken();
      const yesToken = await ethers.getContractAt("PredictionMarketToken", yesTokenAddress);

      // First buy some YES tokens
      const amountToBuy = (await yesToken.balanceOf(predictionMarket.getAddress())) / BigInt(10);
      const requiredEth = await predictionMarket.getBuyPriceInEth(0, amountToBuy);
      await predictionMarket.connect(redeemer).buyTokensWithETH(0, amountToBuy, { value: requiredEth });

      // Report YES as winning outcome
      await predictionMarket.connect(oracle).report(0);

      // Calculate expected ETH to receive
      const expectedEthToReceive = (amountToBuy * ethers.parseEther("1")) / BigInt(1e18);

      // Redeem tokens and expect event
      await expect(predictionMarket.connect(redeemer).redeemWinningTokens(amountToBuy))
        .to.emit(predictionMarket, "WinningTokensRedeemed")
        .withArgs(redeemer.address, amountToBuy, expectedEthToReceive);
    });

    it("Owner cannot redeem tokens", async function () {
      const [owner, oracle] = await ethers.getSigners();
      const predictionMarketFactory = await ethers.getContractFactory(contractArtifact);
      const predictionMarket = await predictionMarketFactory.deploy(
        owner.address,
        oracle.address,
        "Test Question",
        ethers.parseEther("1"),
        50,
        20,
        { value: ethers.parseEther("10") },
      );
      await predictionMarket.waitForDeployment();

      // Report YES as winning outcome
      await predictionMarket.connect(oracle).report(0);

      // Attempt to redeem as owner (should revert)
      await expect(
        predictionMarket.connect(owner).redeemWinningTokens(ethers.parseEther("1")),
      ).to.be.revertedWithCustomError(predictionMarket, "PredictionMarket__OwnerCannotCall");
    });
  });
});
