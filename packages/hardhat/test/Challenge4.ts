//
// this script executes when you run 'yarn test'
//
// you can also test remote submissions like:
// CONTRACT_ADDRESS=0x43Ab1FCd430C1f20270C2470f857f7a006117bbb yarn test --network rinkeby
//
// you can even run mint commands if the tests pass like:
// yarn test && echo "PASSED" || echo "FAILED"
//
import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";
import { TransactionReceipt } from "@ethersproject/providers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("🚩 Challenge 4: ⚖️ 🪙 DEX", () => {
  // this.timeout(45000);

  let dexContract: Contract;
  let balloonsContract: Contract;
  let deployer: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const contractAddress = process.env.CONTRACT_ADDRESS;
  let contractArtifact: string;
  if (contractAddress) {
    contractArtifact = `contracts/download-${contractAddress}.sol:RiggedRoll`;
  } else {
    contractArtifact = "contracts/RiggedRoll.sol:RiggedRoll";
  }

  function getEventValue(txReceipt: TransactionReceipt, eventNumber: number) {
    const log = txReceipt.logs.find(log => log.address === dexContract.address);
    const logDescr = log && dexContract.interface.parseLog(log);
    const args = logDescr?.args;
    return args && args[eventNumber]; // index of ethAmount in event
  }

  async function deployNewInstance() {
    before("Deploying fresh contracts", async function () {
      console.log("\t", " 🛫 Deploying new contracts...");

      const BalloonsContract = await ethers.getContractFactory("Balloons");
      balloonsContract = await BalloonsContract.deploy();

      const DexContract = await ethers.getContractFactory(contractArtifact);
      dexContract = await DexContract.deploy(balloonsContract.address);

      await balloonsContract.approve(dexContract.address, ethers.utils.parseEther("100"));

      await dexContract.init(ethers.utils.parseEther("5"), {
        value: ethers.utils.parseEther("5"),
        gasLimit: 200000,
      });

      [deployer, user2, user3] = await ethers.getSigners();

      await balloonsContract.transfer(user2.address, ethers.utils.parseEther("10"));
      await balloonsContract.transfer(user3.address, ethers.utils.parseEther("10"));
    });
  }

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before(done => {
    setTimeout(done, 2000);
  });

  // --------------------- START OF CHECKPOINT 2 ---------------------
  describe("Checkpoint 2: Reserves", function () {
    describe("Deploying the contracts and testing the init function", () => {
      it("Should deploy contracts", async function () {
        const BalloonsContract = await ethers.getContractFactory("Balloons");
        balloonsContract = await BalloonsContract.deploy();

        const DexContract = await ethers.getContractFactory(contractArtifact);
        dexContract = await DexContract.deploy(balloonsContract.address);

        await balloonsContract.approve(dexContract.address, ethers.utils.parseEther("100"));

        const lpBefore = await dexContract.totalLiquidity();
        console.log(
          "\t",
          " 💦 Expecting total liquidity to be 0 before initializing.  Total liquidity:",
          ethers.utils.formatEther(lpBefore),
        );
        expect(lpBefore).to.equal(0);
        console.log("\t", " 🔰 Calling init with 5 Eth");
        await dexContract.init(ethers.utils.parseEther("5"), {
          value: ethers.utils.parseEther("5"),
          gasLimit: 200000,
        });
        const lpAfter = await dexContract.totalLiquidity();
        console.log(
          "\t",
          " 💦 Expecting new total liquidity to be 5.  Total liquidity:",
          ethers.utils.formatEther(lpAfter),
        );
      });
    });
  });
  // ----------------- END OF CHECKPOINT 2 -----------------
  // ----------------- START OF CHECKPOINT 3 -----------------
  describe("Checkpoint 3: Price", async () => {
    describe("price()", async () => {
      // https://etherscan.io/address/0x7a250d5630b4cf539739df2c5dacb4c659f2488d#readContract
      // in Uniswap the fee is build in getAmountOut() function
      it("Should calculate the price correctly", async function () {
        let xInput = ethers.utils.parseEther("1");
        let xReserves = ethers.utils.parseEther("5");
        let yReserves = ethers.utils.parseEther("5");
        let yOutput = await dexContract.price(xInput, xReserves, yReserves);
        expect(
          yOutput.toString(),
          "Check your price function's calculations.  Don't forget the 3% fee for liquidity providers, and the function should be view or pure.",
        ).to.equal("831248957812239453");
        xInput = ethers.utils.parseEther("1");
        xReserves = ethers.utils.parseEther("10");
        yReserves = ethers.utils.parseEther("15");
        yOutput = await dexContract.price(xInput, xReserves, yReserves);
        expect(yOutput.toString()).to.equal("1359916340820223697");
      });
    });
  });
  // ----------------- END OF CHECKPOINT 3 -----------------
  // ----------------- START OF CHECKPOINT 4 -----------------
  describe("Checkpoint 4: Trading", function () {
    deployNewInstance();
    describe("ethToToken()", function () {
      it("Should be able to send 1 Ether to DEX in exchange for _ $BAL", async function () {
        const dex_eth_start = await ethers.provider.getBalance(dexContract.address);
        console.log("\t", " 💵 Dex contract's initial Eth balance:", ethers.utils.formatEther(dex_eth_start));
        console.log("\t", " 📞 Calling ethToToken with a value of 1 Eth...");
        const tx1 = await dexContract.ethToToken({ value: ethers.utils.parseEther("1") });

        expect(tx1, "ethToToken should revert before initalization").not.to.be.reverted;

        console.log("\t", " 🔰 Initializing...");
        const tx1_receipt = await tx1.wait();
        const ethSent_1 = getEventValue(tx1_receipt, 2);

        console.log("\t", " 🔼 Expecting the Eth value emitted to be 1.  Value:", ethers.utils.formatEther(ethSent_1));
        expect(ethSent_1, "Check you are emitting the correct Eth value and in the correct order").to.equal(
          ethers.utils.parseEther("1"),
        );

        const dex_eth_after = await ethers.provider.getBalance(dexContract.address);
        console.log("\t", " 💵 Dex contract's new Eth balance:", ethers.utils.formatEther(dex_eth_after));

        console.log("\t", " 💵 Expecting final Dex balance to have increased by 1...");
        expect(await ethers.provider.getBalance(dexContract.address)).to.equal(ethers.utils.parseEther("6"));
      });

      it("Should revert if 0 ETH sent", async function () {
        await expect(
          dexContract.ethToToken({ value: ethers.utils.parseEther("0") }),
          "ethToToken should revert when sending 0 value...",
        ).to.be.reverted;
      });

      it("Should send less tokens after the first trade (ethToToken called)", async function () {
        const user2BalBefore = await balloonsContract.balanceOf(user2.address);
        console.log("\t", " 💵 User2 initial $BAL balance:", ethers.utils.formatEther(user2BalBefore));
        console.log("\t", " 🥈 User2 calling ethToToken with value of 1 ETH...");
        await dexContract.connect(user2).ethToToken({ value: ethers.utils.parseEther("1") });

        const user2BalAfter = await balloonsContract.balanceOf(user2.address);
        console.log("\t", " 💵 User2 new $BAL balance:", ethers.utils.formatEther(user2BalAfter));

        const user3BalBefore = await balloonsContract.balanceOf(user3.address);
        console.log("\t", " 💵 User3 initial $BAL balance:", ethers.utils.formatEther(user3BalBefore));
        console.log("\t", " 🥉 User3 calling ethToToken with value of 1 ETH...");
        await dexContract.connect(user3).ethToToken({ value: ethers.utils.parseEther("1") });

        const user3BalAfter = await balloonsContract.balanceOf(user3.address);
        console.log("\t", " 💵 User3 new $BAL balance:", ethers.utils.formatEther(user3BalAfter));

        console.log("\t", " 💵 Expecting User2 to have aquired more $BAL than User3...");
        expect(user2BalAfter).to.greaterThan(user3BalAfter);
      });

      it("Should emit an event when ethToToken() called", async function () {
        await expect(
          dexContract.ethToToken({ value: ethers.utils.parseEther("1") }),
          "Make sure you're emitting the EthToTokenSwap event correctly",
        ).to.emit(dexContract, "EthToTokenSwap");
      });

      it("Should transfer tokens to purchaser after trade", async function () {
        const user3_token_before = await balloonsContract.balanceOf(user3.address);
        console.log("\t", " 💵 User3 initial $BAL balance:", ethers.utils.formatEther(user3_token_before));

        console.log("\t", " 🥉 User3 calling ethToToken with value of 1 ETH...");
        const tx1 = await dexContract.connect(user3).ethToToken({
          value: ethers.utils.parseEther("1"),
        });
        await tx1.wait();

        const user3_token_after = await balloonsContract.balanceOf(user3.address);
        console.log("\t", " 💵 User3 new $BAL balance:", ethers.utils.formatEther(user3_token_after));

        const tokenDifferece = user3_token_after.sub(user3_token_before);
        console.log("\t", " 🥉 Expecting user3's $BAL balance to increase by the correct amount...");
        expect(tokenDifferece).to.be.equal("277481486896167099");
      });
      // could insert more tests to show the declining price, and what happens when the pool becomes very imbalanced.
    });

    describe("tokenToEth()", async () => {
      it("Should send 1 $BAL to DEX in exchange for _ $ETH", async function () {
        const balloons_bal_start = await balloonsContract.balanceOf(dexContract.address);
        console.log("\t", " 💵 Initial Ballons $BAL balance:", ethers.utils.formatEther(balloons_bal_start));
        const dex_eth_start = await ethers.provider.getBalance(dexContract.address);
        console.log("\t", " 💵 Initial DEX Eth balance:", ethers.utils.formatEther(dex_eth_start));

        console.log("\t", " 📞 Calling tokenToEth with 1 Eth...");
        const tx1 = await dexContract.tokenToEth(ethers.utils.parseEther("1"));

        const balloons_bal_end = await balloonsContract.balanceOf(dexContract.address);
        console.log("\t", " 💵 Final Ballons $BAL balance:", ethers.utils.formatEther(balloons_bal_end));
        const dex_eth_end = await ethers.provider.getBalance(dexContract.address);
        console.log("\t", " 💵 Final DEX Eth balance:", ethers.utils.formatEther(dex_eth_end));

        await expect(tx1).not.to.be.revertedWith("Contract not initialized");
        // Checks that the balance of the DEX contract has decreased by 1 $BAL
        console.log("\t", " 🎈 Expecting the $BAL balance of the Ballon contract to have increased by 1...");
        expect(await balloonsContract.balanceOf(dexContract.address)).to.equal(
          balloons_bal_start.add(ethers.utils.parseEther("1")),
        );
        // Checks that the balance of the DEX contract has increased
        console.log("\t", " ⚖️ Expecting the balance of the Dex contract to have decreased...");
        expect(await ethers.provider.getBalance(dexContract.address)).to.lessThan(dex_eth_start);
      });

      it("Should revert if 0 tokens sent to the DEX", async function () {
        await expect(dexContract.tokenToEth(ethers.utils.parseEther("0"))).to.be.reverted;
      });

      it("Should emit event TokenToEthSwap when tokenToEth() called", async function () {
        await expect(
          dexContract.tokenToEth(ethers.utils.parseEther("1")),
          "Make sure you're emitting the TokenToEthSwap event correctly",
        ).to.emit(dexContract, "TokenToEthSwap");
      });

      it("Should send less eth after the first trade (tokenToEth() called)", async function () {
        const dex_eth_start = await ethers.provider.getBalance(dexContract.address);
        console.log("\t", " 💵 Initial Dex balance:", ethers.utils.formatEther(dex_eth_start));
        console.log("\t", " 📞 Calling tokenToEth with 1 Eth...");
        const tx1 = await dexContract.tokenToEth(ethers.utils.parseEther("1"));
        await tx1.wait();

        const dex_eth_next = await ethers.provider.getBalance(dexContract.address);
        const tx1difference = dex_eth_next.sub(dex_eth_start);
        console.log(
          "\t",
          " 💵 Next Dex balance:",
          ethers.utils.formatEther(dex_eth_next),
          " Eth sent:",
          ethers.utils.formatEther(tx1difference.mul(-1)),
        );

        console.log("\t", " 📞 Calling tokenToEth with 1 Eth...");
        const tx2 = await dexContract.tokenToEth(ethers.utils.parseEther("1"));
        await tx2.wait();

        const dex_eth_end = await ethers.provider.getBalance(dexContract.address);
        const tx2difference = dex_eth_end.sub(dex_eth_next);
        console.log(
          "\t",
          " 💵 Final Dex balance:",
          ethers.utils.formatEther(dex_eth_end),
          " Eth sent:",
          ethers.utils.formatEther(tx2difference.mul(-1)),
        );

        console.log("\t", " ➖ Expecting the first call to get more Eth than the second...");
        expect(tx2difference).to.greaterThan(tx1difference);
      });
    });
  });
  // ----------------- END OF CHECKPOINT 4 -----------------
  // ----------------- START OF CHECKPOINT 5 -----------------
  describe("Checkpoint 5: Liquidity", async () => {
    describe("deposit()", async () => {
      deployNewInstance();
      it("Should increase liquidity in the pool when ETH is deposited", async function () {
        console.log("\t", " 💵 Approving 100 ETH...");
        await balloonsContract.connect(user2).approve(dexContract.address, ethers.utils.parseEther("100"));
        const liquidity_start = await dexContract.totalLiquidity();
        console.log("\t", " ⚖️ Starting Dex liquidity", ethers.utils.formatEther(liquidity_start));
        const user2liquidity = await dexContract.getLiquidity(user2.address);
        console.log(
          "\t",
          " ⚖️ Expecting user's liquidity to be 0. Liquidity:",
          ethers.utils.formatEther(user2liquidity),
        );
        expect(user2liquidity).to.equal("0");
        console.log("\t", " 🔼 Expecting the deposit function to emit correctly...");
        await expect(
          dexContract.connect(user2).deposit((ethers.utils.parseEther("5"), { value: ethers.utils.parseEther("5") })),
          "Check the order of the values when emitting LiquidityProvided: msg.sender, liquidityMinted, msg.value, tokenDeposit",
        )
          .to.emit(dexContract, "LiquidityProvided")
          .withArgs(anyValue, ethers.utils.parseEther("5"), ethers.utils.parseEther("5"), anyValue);
        const liquidity_end = await dexContract.totalLiquidity();
        console.log(
          "\t",
          " 💸 Final liquidity should increase by 5.  Final liquidity:",
          ethers.utils.formatEther(liquidity_end),
        );
        expect(liquidity_end, "Total liquidity should increase").to.equal(
          liquidity_start.add(ethers.utils.parseEther("5")),
        );
        const user_lp = await dexContract.getLiquidity(user2.address);
        console.log("\t", " ⚖️ User's liquidity provided should be 5. LP:", ethers.utils.formatEther(user_lp));
        expect(user_lp.toString(), "User's liquidity provided should be 5.").to.equal(ethers.utils.parseEther("5"));
      });

      it("Should revert if 0 ETH deposited", async function () {
        await expect(
          dexContract.deposit((ethers.utils.parseEther("0"), { value: ethers.utils.parseEther("0") })),
          "Should revert if 0 value is sent",
        ).to.be.reverted;
      });
    });
    // pool should have 5:5 ETH:$BAL ratio
    describe("withdraw()", async () => {
      deployNewInstance();
      it("Should withdraw 1 ETH and 1 $BAL when pool is at a 1:1 ratio", async function () {
        const startingLiquidity = await dexContract.totalLiquidity();
        console.log("\t", " ⚖️ Starting liquidity:", ethers.utils.formatEther(startingLiquidity));
        const userBallonsBalance = await balloonsContract.balanceOf(deployer.address);
        console.log("\t", " 💵 User's starting $BAL balance:", ethers.utils.formatEther(userBallonsBalance));

        console.log("\t", " 🔽 Calling withdraw with with a value of 1 Eth...");
        const tx1 = await dexContract.withdraw(ethers.utils.parseEther("1"));
        const userBallonsBalanceAfter = await balloonsContract.balanceOf(deployer.address);
        const tx1_receipt = await tx1.wait();

        const eth_out = getEventValue(tx1_receipt, 2);
        const token_out = getEventValue(tx1_receipt, 3);

        console.log("\t", " 💵 User's new $BAL balance:", ethers.utils.formatEther(userBallonsBalanceAfter));
        console.log(
          "\t",
          " 🎈 Expecting the balance to have increased by 1",
          ethers.utils.formatEther(userBallonsBalanceAfter),
        );
        expect(userBallonsBalance, "User $BAL balance shoud increase").to.equal(
          userBallonsBalanceAfter.sub(ethers.utils.parseEther("1")),
        );

        console.log("\t", " 🔽 Expecting the Eth withdrawn emit to be 1...");
        expect(eth_out, "ethWithdrawn incorrect in emit").to.be.equal(ethers.utils.parseEther("1"));
        console.log("\t", " 🔽 Expecting the $BAL withdrawn emit to be 1...");
        expect(token_out, "tokenAmount incorrect in emit").to.be.equal(ethers.utils.parseEther("1"));
      });

      it("Should revert if sender does not have enough liqudity", async function () {
        console.log("\t", " ✋ Expecting withdraw to revert when there is not enough liquidity...");
        await expect(dexContract.withdraw(ethers.utils.parseEther("100"))).to.be.reverted;
      });

      it("Should decrease total liquidity", async function () {
        const totalLpBefore = await dexContract.totalLiquidity();
        console.log("\t", " ⚖️ Initial liquidity:", ethers.utils.formatEther(totalLpBefore));
        console.log("\t", " 📞 Calling withdraw with 1 Eth...");
        const txWithdraw = await dexContract.withdraw(ethers.utils.parseEther("1"));
        const totalLpAfter = await dexContract.totalLiquidity();
        console.log("\t", " ⚖️ Final liquidity:", ethers.utils.formatEther(totalLpAfter));
        const txWithdraw_receipt = await txWithdraw.wait();
        const liquidityBurned = getEventValue(txWithdraw_receipt, 2);
        console.log("\t", " 🔼 Emitted liquidity removed:", ethers.utils.formatEther(liquidityBurned));

        expect(totalLpAfter, "Emitted incorrect liquidity amount burned").to.be.equal(
          totalLpBefore.sub(liquidityBurned),
        );
        expect(totalLpBefore, "Emitted total liquidity should decrease").to.be.above(totalLpAfter);
      });

      it("Should emit event LiquidityWithdrawn when withdraw() called", async function () {
        await expect(
          dexContract.withdraw(ethers.utils.parseEther("1.5")),
          "Make sure you emit the LiquidityRemoved event correctly",
        )
          .to.emit(dexContract, "LiquidityRemoved")
          .withArgs(
            deployer.address,
            ethers.utils.parseEther("1.5"),
            ethers.utils.parseEther("1.5"),
            ethers.utils.parseEther("1.5"),
          );
      });
    });
  });
  // ----------------- END OF CHECKPOINT 5 -----------------
});
