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

    const deployContracts = async () => {
      const FundingRecipientFactory = await ethers.getContractFactory("FundingRecipient");
      fundingRecipient = (await FundingRecipientFactory.deploy()) as FundingRecipient;

      const CrowdFundFactory = await ethers.getContractFactory(contractArtifact);
      crowdFundContract = (await CrowdFundFactory.deploy(await fundingRecipient.getAddress())) as CrowdFund;
    };

    describe("Checkpoint 1: 🤝 Contributing 💵", function () {
      beforeEach(async function () {
        await deployContracts();
      });

      const getContributionEventsFromReceipt = (receipt: any) => {
        // We avoid chai matchers like `.to.emit` so this works in minimal environments.
        const parsed = receipt.logs
          .map((log: any) => {
            try {
              return crowdFundContract.interface.parseLog(log);
            } catch {
              return undefined;
            }
          })
          .filter(Boolean);
        return parsed.filter((p: any) => p.name === "Contribution");
      };

      it("Checkpoint1: balances should go up when you contribute()", async function () {
        const [owner] = await ethers.getSigners();

        const startingBalance = await crowdFundContract.balances(owner.address);

        const amount = ethers.parseEther("0.001");
        const contributeTx = await crowdFundContract.contribute({ value: amount });
        const receipt = await contributeTx.wait();
        expect(receipt?.status).to.equal(1);

        const newBalance = await crowdFundContract.balances(owner.address);
        expect(newBalance).to.equal(startingBalance + amount);
      });

      it("Checkpoint1: should emit a Contribution event with contributor + amount", async function () {
        const [owner] = await ethers.getSigners();

        const amount = ethers.parseEther("0.001");
        const tx = await crowdFundContract.contribute({ value: amount });
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);

        const contributionEvents = getContributionEventsFromReceipt(receipt);
        expect(contributionEvents.length).to.equal(1);

        const evt = contributionEvents[0];
        expect(evt.args[0]).to.equal(owner.address);
        expect(evt.args[1]).to.equal(amount);
      });

      it("Checkpoint1: should accumulate multiple contributions from the same user", async function () {
        const [owner] = await ethers.getSigners();

        const starting = await crowdFundContract.balances(owner.address);

        const a1 = ethers.parseEther("0.001");
        const a2 = ethers.parseEther("0.002");
        await (await crowdFundContract.contribute({ value: a1 })).wait();
        await (await crowdFundContract.contribute({ value: a2 })).wait();

        const ending = await crowdFundContract.balances(owner.address);
        expect(ending).to.equal(starting + a1 + a2);
      });

      it("Checkpoint1: should track balances independently per contributor", async function () {
        const [owner, secondAccount] = await ethers.getSigners();

        const a1 = ethers.parseEther("0.001");
        const a2 = ethers.parseEther("0.002");

        await (await crowdFundContract.connect(owner).contribute({ value: a1 })).wait();
        await (await crowdFundContract.connect(secondAccount).contribute({ value: a2 })).wait();

        expect(await crowdFundContract.balances(owner.address)).to.equal(a1);
        expect(await crowdFundContract.balances(secondAccount.address)).to.equal(a2);
      });

      it("Checkpoint1: contract ETH balance should increase when someone contributes", async function () {
        const startContractBal = await ethers.provider.getBalance(await crowdFundContract.getAddress());

        const amount = ethers.parseEther("0.001");
        await (await crowdFundContract.contribute({ value: amount })).wait();

        const endContractBal = await ethers.provider.getBalance(await crowdFundContract.getAddress());
        expect(endContractBal).to.equal(startContractBal + amount);
      });
    });

    describe("Checkpoint 2: 📤 Withdrawing Funds", function () {
      beforeEach(async function () {
        await deployContracts();
      });

      const setOpenToWithdrawTrue = async () => {
        // Checkpoint 2 doesn't include a setter for `openToWithdraw`, so we toggle it directly in storage.
        //
        // Don't worry if you don't understand the wizardry that happens here.
        //
        // Important: `openToWithdraw` might be:
        // - in its own storage slot (bool uses the least-significant byte of the slot), OR
        // - packed into an existing slot (e.g. declared right after an `address`, so it shares slot 0),
        //   in which case flipping `0x...01` for the whole slot DOES NOT necessarily flip the bool.
        //
        // So we probe (slot, byteOffset) by mutating ONE byte at a time and checking which mutation makes
        // `openToWithdraw()` return true. This effectively answers: "which storage location impacts this variable?"
        const target = await crowdFundContract.getAddress();

        // If it's already open, nothing to do.
        if (await crowdFundContract.openToWithdraw()) return;

        const writeStorageAt = async (slot: bigint, value: string) => {
          const slotHex = ethers.zeroPadValue(ethers.toBeHex(slot), 32);
          await network.provider.send("hardhat_setStorageAt", [target, slotHex, value]);
        };

        const hexToBytes32 = (hex: string) => {
          // Expect 0x-prefixed 32-byte hex from `getStorage`.
          const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
          const padded = normalized.padStart(64, "0");
          const out: number[] = [];
          for (let i = 0; i < 64; i += 2) out.push(parseInt(padded.slice(i, i + 2), 16));
          if (out.length !== 32) throw new Error("Expected 32 bytes");
          return out;
        };

        const bytes32ToHex = (bytes: number[]) => {
          if (bytes.length !== 32) throw new Error("Expected 32 bytes");
          const hex = bytes.map(b => b.toString(16).padStart(2, "0")).join("");
          return "0x" + hex;
        };

        // Probe a reasonable number of slots so re-ordering / adding variables doesn't break tests.
        // (Mapping `balances` lives at a slot too, but since we always revert unsuccessful writes,
        //  it's safe to probe it.)
        for (let s = 0n; s <= 20n; s++) {
          const original = await ethers.provider.getStorage(target, s);
          const originalBytes = hexToBytes32(original);

          try {
            // Try flipping each byte to 0x01 (leaving all other bytes unchanged).
            // Storage words are represented big-endian in hex, but since we probe ALL 32 bytes,
            // we don't need to reason about endianness/packing direction here.
            for (let byteIdx = 0; byteIdx < 32; byteIdx++) {
              const mutated = [...originalBytes];
              mutated[byteIdx] = 0x01;
              await writeStorageAt(s, bytes32ToHex(mutated));

              const isOpen = await crowdFundContract.openToWithdraw();
              if (isOpen === true) {
                // Found the (slot, byteIdx) that impacts `openToWithdraw`.
                // We intentionally keep this storage mutation for the test.
                return;
              }

              // Not the right byte → restore original before continuing.
              await writeStorageAt(s, original);
            }
          } catch {
            // If the function doesn't exist yet, nothing to do here.
          }
          // Ensure we leave storage exactly as we found it before moving to the next slot.
          await writeStorageAt(s, original);
        }

        throw new Error("Could not locate `openToWithdraw` storage slot to toggle it for tests.");
      };

      it("Checkpoint2: withdraw should revert with NotOpenToWithdraw() when withdrawals are not open", async function () {
        await expect(crowdFundContract.withdraw()).to.be.revertedWithCustomError(
          crowdFundContract,
          "NotOpenToWithdraw",
        );
      });

      it("Checkpoint2: withdraw should send your full balance and zero-out your recorded balance", async function () {
        const [, contributor] = await ethers.getSigners();

        const amount = ethers.parseEther("0.001");
        await (await crowdFundContract.connect(contributor).contribute({ value: amount })).wait();
        expect(await crowdFundContract.balances(contributor.address)).to.equal(amount);

        // We modify storage directly to set openToWithdraw to true since we have not implemented the setter yet.
        await setOpenToWithdrawTrue();

        const startingBalance = await ethers.provider.getBalance(contributor.address);
        const withdrawTx = await crowdFundContract.connect(contributor).withdraw();

        const tx = await ethers.provider.getTransaction(withdrawTx.hash);
        if (!tx) throw new Error("Cannot resolve transaction");
        const receipt = await ethers.provider.getTransactionReceipt(withdrawTx.hash);
        if (!receipt) throw new Error("Cannot resolve receipt");

        const gasCost = tx.gasPrice * receipt.gasUsed;
        const endingBalance = await ethers.provider.getBalance(contributor.address);

        expect(endingBalance).to.equal(startingBalance + amount - gasCost);
        expect(await crowdFundContract.balances(contributor.address)).to.equal(0n);
      });

      it("Checkpoint2: withdrawing twice should not let you withdraw more than you contributed", async function () {
        const [, contributor] = await ethers.getSigners();

        const amount = ethers.parseEther("0.001");
        await (await crowdFundContract.connect(contributor).contribute({ value: amount })).wait();

        // We modify storage directly to set openToWithdraw to true since we have not implemented the setter yet.
        await setOpenToWithdrawTrue();

        await (await crowdFundContract.connect(contributor).withdraw()).wait();
        const balanceAfterFirst = await ethers.provider.getBalance(contributor.address);

        // Second withdraw should refund 0; only gas should change wallet balance.
        const secondTx = await crowdFundContract.connect(contributor).withdraw();
        const tx = await ethers.provider.getTransaction(secondTx.hash);
        if (!tx) throw new Error("Cannot resolve transaction");
        const receipt = await ethers.provider.getTransactionReceipt(secondTx.hash);
        if (!receipt) throw new Error("Cannot resolve receipt");
        const gasCost = tx.gasPrice * receipt.gasUsed;

        const balanceAfterSecond = await ethers.provider.getBalance(contributor.address);
        expect(balanceAfterSecond).to.equal(balanceAfterFirst - gasCost);
        expect(await crowdFundContract.balances(contributor.address)).to.equal(0n);
      });
    });

    describe("Checkpoint 3: 🔬 State Machine / Timing ⏱", function () {
      beforeEach(async function () {
        await deployContracts();
      });

      it("Checkpoint3: execute() should revert with TooEarly() if called before the deadline", async function () {
        await expect(crowdFundContract.execute()).to.be.revertedWithCustomError(crowdFundContract, "TooEarly");
      });

      it("Checkpoint3: timeLeft should decrease as time moves forward (until it hits 0)", async function () {
        const t1 = await crowdFundContract.timeLeft();
        expect(Number(t1)).to.be.greaterThan(0);

        await network.provider.send("evm_increaseTime", [5]);
        await network.provider.send("evm_mine");

        const t2 = await crowdFundContract.timeLeft();
        expect(Number(t2)).to.be.lessThan(Number(t1));
        expect(Number(t2)).to.be.greaterThanOrEqual(0);
      });

      it("Checkpoint3: if enough is contributed and time has passed, execute() should complete()", async function () {
        const timeLeft1 = await crowdFundContract.timeLeft();
        expect(
          Number(timeLeft1),
          "timeLeft not greater than 0. Did you implement the timeLeft() function correctly?",
        ).to.greaterThan(0);

        const amount = ethers.parseEther("1");
        await crowdFundContract.contribute({ value: amount });

        await network.provider.send("evm_increaseTime", [72 * 3600]);
        await network.provider.send("evm_mine");

        const timeLeft2 = await crowdFundContract.timeLeft();
        expect(
          Number(timeLeft2),
          "timeLeft not equal to 0. Did you implement the timeLeft() function correctly?",
        ).to.equal(0);

        const startRecipientBal = await ethers.provider.getBalance(await fundingRecipient.getAddress());
        const startContractBal = await ethers.provider.getBalance(await crowdFundContract.getAddress());

        await crowdFundContract.execute();

        const result = await fundingRecipient.completed();
        expect(result).to.equal(true);

        const endRecipientBal = await ethers.provider.getBalance(await fundingRecipient.getAddress());
        const endContractBal = await ethers.provider.getBalance(await crowdFundContract.getAddress());

        // Funds should have moved into the FundingRecipient via `complete{value: ...}()`
        expect(endRecipientBal).to.equal(startRecipientBal + startContractBal);
        expect(endContractBal).to.equal(0n);
      });

      it("Checkpoint3: if not enough is contributed and time has passed, execute() should enable withdraw", async function () {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [owner, secondAccount] = await ethers.getSigners();

        await crowdFundContract.connect(secondAccount).contribute({
          value: ethers.parseEther("0.001"),
        });

        await network.provider.send("evm_increaseTime", [72 * 3600]);
        await network.provider.send("evm_mine");

        await crowdFundContract.execute();

        const result = await fundingRecipient.completed();
        expect(result).to.equal(false);

        // If `openToWithdraw` is implemented (Checkpoint 2/3), it should now be true.
        // We use `as any` so earlier checkpoints can still compile this test file.
        if ((crowdFundContract as any).openToWithdraw) {
          const isOpen = await (crowdFundContract as any).openToWithdraw();
          expect(isOpen).to.equal(true);
        }

        const startingBalance = await ethers.provider.getBalance(secondAccount.address);
        const withdrawTx = await crowdFundContract.connect(secondAccount).withdraw();

        const tx = await ethers.provider.getTransaction(withdrawTx.hash);
        if (!tx) throw new Error("Cannot resolve transaction");

        const receipt = await ethers.provider.getTransactionReceipt(withdrawTx.hash);
        if (!receipt) throw new Error("Cannot resolve receipt");

        const gasCost = tx.gasPrice * receipt.gasUsed;
        const endingBalance = await ethers.provider.getBalance(secondAccount.address);

        expect(endingBalance).to.equal(startingBalance + ethers.parseEther("0.001") - gasCost);
      });
    });

    describe("Checkpoint 4: 💵 Receive Function / UX 🙎", function () {
      beforeEach(async function () {
        await deployContracts();
      });

      it("Checkpoint4: sending ETH directly to the contract should behave like contribute()", async function () {
        const [owner] = await ethers.getSigners();
        const startingBalance = await crowdFundContract.balances(owner.address);

        const amount = ethers.parseEther("0.001");
        const sendTx = await owner.sendTransaction({ to: await crowdFundContract.getAddress(), value: amount });
        await sendTx.wait();

        const newBalance = await crowdFundContract.balances(owner.address);
        expect(newBalance).to.equal(startingBalance + amount);
      });
    });
  });
});
