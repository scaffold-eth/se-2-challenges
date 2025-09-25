import { expect } from "chai";
import { ethers } from "hardhat";
import type { Voting } from "../typechain-types";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("🗳️ ZK Voting Challenge", function () {
  let contractArtifact = "";
  if (process.env.CONTRACT_ADDRESS) {
    contractArtifact = `contracts/download-${process.env.CONTRACT_ADDRESS}.sol:Voting`;
  } else {
    contractArtifact = "contracts/Voting.sol:Voting";
  }
  describe("Checkpoint2", function () {
    async function deployLibrariesAndVoting() {
      const [owner, alice, bob] = await ethers.getSigners();
      // Deploy PoseidonT3 → LeanIMT and link LeanIMT into Voting
      const PoseidonFactory = await ethers.getContractFactory("PoseidonT3");
      const poseidon = await PoseidonFactory.deploy();
      await poseidon.waitForDeployment();

      const LeanIMTFactory = await ethers.getContractFactory("LeanIMT", {
        libraries: { PoseidonT3: await poseidon.getAddress() },
      });
      const leanIMT = await LeanIMTFactory.deploy();
      await leanIMT.waitForDeployment();

      const VotingFactory = await ethers.getContractFactory(contractArtifact, {
        libraries: { "@zk-kit/lean-imt.sol/LeanIMT.sol:LeanIMT": await leanIMT.getAddress() },
      });
      const verifierZero = "0x0000000000000000000000000000000000000000";
      const voting = (await VotingFactory.deploy(owner.address, verifierZero, "Should we build zk apps?")) as Voting;
      await voting.waitForDeployment();

      return { voting, owner, alice, bob };
    }

    it("allows only allowlisted voters to register", async function () {
      const { voting, owner, alice, bob } = await deployLibrariesAndVoting();

      await voting.connect(owner).addVoters([alice.address], [true]);

      const commitment = 111n;
      await expect(voting.connect(bob).register(commitment)).to.be.revertedWithCustomError(
        voting,
        "Voting__NotAllowedToVote",
      );
    });

    it("prevents duplicate commitments", async function () {
      const { voting, owner, alice, bob } = await deployLibrariesAndVoting();

      await voting.connect(owner).addVoters([alice.address, bob.address], [true, true]);

      const duplicateCommitment = 222n;
      await expect(voting.connect(alice).register(duplicateCommitment)).to.not.be.reverted;
      await expect(voting.connect(bob).register(duplicateCommitment))
        .to.be.revertedWithCustomError(voting, "Voting__CommitmentAlreadyAdded")
        .withArgs(duplicateCommitment);
    });

    it("allows only one time registration per voter", async function () {
      const { voting, owner, alice } = await deployLibrariesAndVoting();

      await voting.connect(owner).addVoters([alice.address], [true]);

      await expect(voting.connect(alice).register(333n)).to.not.be.reverted;
      await expect(voting.connect(alice).register(444n)).to.be.revertedWithCustomError(
        voting,
        "Voting__NotAllowedToVote",
      );
    });

    it("leaf with commitment gets added to the tree", async function () {
      const { voting, owner, alice } = await deployLibrariesAndVoting();

      await voting.connect(owner).addVoters([alice.address], [true]);

      const [, , , , sizeBefore, , ,] = await (voting as any).getVotingData();
      expect(sizeBefore).to.equal(0n);

      const commitment = 555n;
      await voting.connect(alice).register(commitment);

      const [, , , , sizeAfter, , rootAfter] = await (voting as any).getVotingData();
      expect(sizeAfter).to.equal(1n);
      expect(rootAfter).to.equal(commitment);
    });

    it("emits correct NewLeaf event", async function () {
      const { voting, owner, alice } = await deployLibrariesAndVoting();

      await voting.connect(owner).addVoters([alice.address], [true]);

      const commitment = 666n;
      await expect(voting.connect(alice).register(commitment)).to.emit(voting, "NewLeaf").withArgs(0n, commitment);
    });
  });

  describe("Checkpoint6", function () {
    async function deployAll() {
      const [owner, alice, bob] = await ethers.getSigners();

      const PoseidonFactory = await ethers.getContractFactory("PoseidonT3");
      const poseidon = await PoseidonFactory.deploy();
      await poseidon.waitForDeployment();

      const LeanIMTFactory = await ethers.getContractFactory("LeanIMT", {
        libraries: { PoseidonT3: await poseidon.getAddress() },
      });
      const leanIMT = await LeanIMTFactory.deploy();
      await leanIMT.waitForDeployment();

      const VerifierMockFactory = await ethers.getContractFactory("VerifierMock");
      const verifier = await VerifierMockFactory.deploy();
      await verifier.waitForDeployment();

      const VotingFactory = await ethers.getContractFactory(contractArtifact, {
        libraries: { "@zk-kit/lean-imt.sol/LeanIMT.sol:LeanIMT": await leanIMT.getAddress() },
      });
      const voting = (await VotingFactory.deploy(owner.address, await verifier.getAddress(), "Question?")) as Voting;
      await voting.waitForDeployment();

      // allowlist and register a voter to set a non-zero root
      await voting.connect(owner).addVoters([alice.address], [true]);
      const commitment = 123n;
      await voting.connect(alice).register(commitment);
      const [, , , , , depthNum, rootNum] = await (voting as any).getVotingData();
      const rootAfter = ethers.zeroPadValue(ethers.toBeHex(rootNum), 32) as `0x${string}`;
      const depthAfter = ethers.zeroPadValue(ethers.toBeHex(depthNum), 32) as `0x${string}`;

      return { voting, verifier, owner, alice, bob, rootAfter, depthAfter };
    }

    it("prevents double voting via nullifier reuse", async function () {
      const { voting, verifier, alice, rootAfter, depthAfter } = await deployAll();

      const nullifier = ethers.ZeroHash as `0x${string}`; // bytes32 0x00..00 ok for test
      const yesVote = ethers.toBeHex(1, 32) as `0x${string}`;
      const dummyProof = ethers.randomBytes(32 * 440); // correct length for Honk proof

      await (verifier as any).setExpectedInputs(nullifier, rootAfter, yesVote, depthAfter);
      await (verifier as any).setShouldVerify(true);

      await expect((voting as any).connect(alice).vote(dummyProof, nullifier, rootAfter, yesVote, depthAfter)).to.emit(
        voting,
        "VoteCast",
      );

      await expect((voting as any).connect(alice).vote(dummyProof, nullifier, rootAfter, yesVote, depthAfter))
        .to.be.revertedWithCustomError(voting, "Voting__NullifierHashAlreadyUsed")
        .withArgs(nullifier);
    });

    it("reverts on invalid proof", async function () {
      const { voting, verifier, alice, rootAfter, depthAfter } = await deployAll();

      const nullifier = ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`;
      const yesVote = ethers.toBeHex(1, 32) as `0x${string}`;
      const dummyProof = ethers.randomBytes(32 * 440);

      await (verifier as any).setShouldVerify(false);

      await expect(
        (voting as any).connect(alice).vote(dummyProof, nullifier, rootAfter, yesVote, depthAfter),
      ).to.be.revertedWithCustomError(voting, "Voting__InvalidProof");
    });

    it("increments yes/no vote counts correctly", async function () {
      const { voting, verifier, owner, alice, bob, rootAfter, depthAfter } = await deployAll();

      await voting.connect(owner).addVoters([bob.address], [true]);
      await (voting as any).connect(bob).register(456n);
      const [, , , , , depthNum2, rootNum2] = await (voting as any).getVotingData();
      const root2 = ethers.zeroPadValue(ethers.toBeHex(rootNum2), 32) as `0x${string}`;
      const depth2 = ethers.zeroPadValue(ethers.toBeHex(depthNum2), 32) as `0x${string}`;

      const proof = ethers.randomBytes(32 * 440);
      const yes = ethers.toBeHex(1, 32) as `0x${string}`;
      const no = ethers.toBeHex(0, 32) as `0x${string}`;

      // First voter (alice) votes yes
      const n1 = ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`;
      await (verifier as any).setExpectedInputs(n1, rootAfter, yes, depthAfter);
      await (verifier as any).setShouldVerify(true);
      await (voting as any).connect(alice).vote(proof, n1, rootAfter, yes, depthAfter);

      // Second voter (bob) votes no against updated root
      const n2 = ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`;
      await (verifier as any).setExpectedInputs(n2, root2, no, depth2);
      await (voting as any).connect(bob).vote(proof, n2, root2, no, depth2);

      const [, , yesVotes, noVotes] = await (voting as any).getVotingData();
      expect(yesVotes).to.equal(1n);
      expect(noVotes).to.equal(1n);
    });

    it("emits VoteCast with correct fields and totals", async function () {
      const { voting, verifier, alice, rootAfter, depthAfter } = await deployAll();
      const proof = ethers.randomBytes(32 * 440);
      const yes = ethers.toBeHex(1, 32) as `0x${string}`;
      const nullifier = ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`;
      await (verifier as any).setExpectedInputs(nullifier, rootAfter, yes, depthAfter);

      await expect((voting as any).connect(alice).vote(proof, nullifier, rootAfter, yes, depthAfter))
        .to.emit(voting, "VoteCast")
        .withArgs(nullifier, alice.address, true, anyValue, 1n, 0n);
    });
  });
});
