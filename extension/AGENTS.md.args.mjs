// If this is passed it will override the full content of the AGENTS.md file
export const fullContentOverride = `# AGENTS.md

## What is SpeedRunEthereum?

[SpeedRunEthereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the SpeedRunEthereum challenges.** It covers **ZK Voting**.

## Challenge Overview

The learner builds a privacy-preserving voting system using zero-knowledge proofs. Voters register commitments to a Lean Incremental Merkle Tree, generate ZK proofs (Noir circuits) proving membership without revealing identity, and cast votes through burner wallets for full anonymity. The system includes a \`Voting\` contract (the core contract the learner implements across multiple checkpoints), a Noir circuit for ZK proof generation, a \`Verifier\` interface, and frontend components for commitment creation, proof generation, and vote submission.

The final deliverable: an app that lets users register as voters, generate ZK proofs of eligibility, and cast anonymous votes. Deploy contracts to a testnet (Sepolia), ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why ZK Voting Matters

Zero-knowledge proofs enable the seemingly impossible: proving you have the right to do something without revealing who you are. In voting, this solves the fundamental tension between verifiability (anyone can check votes were counted correctly) and privacy (no one can see how you voted). This technology extends far beyond voting into identity, compliance, and scalability.

Real-world examples of the concepts in this challenge:

- **Semaphore** -- A generic ZK membership protocol built on Ethereum. Users join groups by adding commitments to a Merkle tree, then prove membership via ZK proofs without revealing their identity. This challenge's Lean IMT + nullifier pattern is directly inspired by Semaphore's design.
- **MACI (Minimum Anti-Collusion Infrastructure)** -- A voting protocol designed by the Ethereum Foundation that uses ZK proofs to prevent bribery and collusion. Voters encrypt their votes so even the coordinator can't link votes to voters until tallying.
- **Tornado Cash** -- A privacy protocol that uses the same commitment to nullifier pattern as this challenge. Users deposit ETH with a commitment, then withdraw with a ZK proof and nullifier to prevent double-spending -- exactly analogous to this challenge's register to vote flow.
- **zkSync / Scroll / Polygon zkEVM** -- ZK rollups that use zero-knowledge proofs for Ethereum scalability. While this challenge focuses on privacy applications, the same underlying math (Merkle trees, hash functions, circuit compilation) powers L2 scaling solutions.
- **Zupass** -- A ZK-based identity and ticketing system used at Devconnect and Zuzalu. Demonstrates how ZK proofs enable privacy-preserving credentials beyond just voting.

**Key insight**: The commitment scheme (hash of nullifier + secret) is the cryptographic foundation. The nullifier prevents double-actions (double-voting), the secret prevents identity theft, and the Merkle tree provides efficient set membership proofs. Together, they create a system where you can prove "I am an eligible voter" without revealing "I am Alice." This pattern -- commitments, Merkle trees, nullifiers -- appears across privacy protocols, and this challenge teaches you to build it from scratch.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with \`create-eth\`, it produces a monorepo:

\`\`\`
packages/
  circuits/
    Nargo.toml               # Noir project configuration
    src/
      main.nr                # ZK circuit for membership proof (LEARNER IMPLEMENTS - Checkpoints 3-4)
  hardhat/
    contracts/
      Voting.sol             # Core voting contract (LEARNER IMPLEMENTS - Checkpoints 2, 6)
      Verifier.sol           # IVerifier interface (provided)
      mocks/
        VerifierMock.sol     # Mock verifier for testing (provided)
    deploy/
      00_deploy_your_voting_contract.ts  # Deploy script (LEARNER MODIFIES - Checkpoints 2, 6)
    test/
      Voting.ts              # Checkpoint-based grading tests
  nextjs/
    app/
      voting/
        page.tsx             # Main voting page
        _challengeComponents/
          CreateCommitment.tsx      # Generate commitment & register (LEARNER IMPLEMENTS - Checkpoint 7)
          GenerateProof.tsx         # Generate ZK proof (LEARNER IMPLEMENTS - Checkpoint 8)
          VoteWithBurnerHardhat.tsx # Submit vote on Hardhat (LEARNER IMPLEMENTS - Checkpoint 9)
          VoteWithBurnerSepolia.tsx # Submit vote on Sepolia with smart accounts (LEARNER IMPLEMENTS - Checkpoint 10)
        _components/
          AddVotersModal.tsx       # Owner modal to add/revoke voters
          ClearStorageButton.tsx   # Clear localStorage data
          LogStorageButton.tsx     # Debug localStorage data
          ShowVotersButton.tsx     # Display all voters and their status
          VoteChoice.tsx           # Yes/No vote toggle
          VotingStats.tsx          # Vote counts and progress bar
      api/
        circuit/
          route.ts           # API endpoint serving circuit data
    services/
      store/
        challengeStore.ts    # Zustand store for commitment, proof, and vote state
    utils/
      proofStorage.ts        # localStorage utilities for proofs, commitments, burner wallets
\`\`\`

## Common Commands

\`\`\`bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000

# Redeploy fresh (useful after contract changes)
yarn deploy --reset

# Testing
yarn test           # Run all challenge tests

# Circuit compilation (requires Nargo CLI)
cd packages/circuits
nargo compile       # Compile Noir circuit
nargo test          # Run circuit tests

# Verifier generation (run after circuit changes to regenerate HonkVerifier contract)
cd packages/circuits
nargo compile
bb write_vk --oracle_hash keccak -b ./target/circuits.json -o ./target/
bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol

# Code quality
yarn lint           # Lint both packages
yarn format         # Format both packages

# Deploy to testnet (requires interactive password prompt, cannot be run by agents)
yarn deploy --network sepolia

# Contract verification (requires interactive password prompt, cannot be run by agents)
yarn verify --network sepolia

# Account management (requires interactive password prompt, cannot be run by agents)
yarn generate       # Generate deployer account (encrypted private key)
yarn account        # View deployer account balances

# Frontend deployment
yarn vercel         # Deploy frontend to Vercel
yarn vercel --prod  # Redeploy to production URL
\`\`\`

## Smart Contracts

### Voting.sol (Learner Implements)

The core ZK voting contract. Inherits \`Ownable\`. Manages voter allowlist, commitment registration via Lean IMT, and anonymous vote verification through ZK proofs.

- **Solidity version**: \`>=0.8.0 <0.9.0\` (do **not** change, affects grading)
- **Imports**: \`Ownable\`, \`LeanIMT\` / \`LeanIMTData\` from \`@zk-kit/lean-imt.sol\`
- **Dependencies**: \`@zk-kit/lean-imt.sol\` (^2.0.1)

#### State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| \`s_question\` | \`string\` | The voting question |
| \`s_voters\` | \`mapping(address => bool)\` | Allowlist of voting-eligible addresses |
| \`s_yesVotes\` | \`uint256\` | Count of yes votes |
| \`s_noVotes\` | \`uint256\` | Count of no votes |
| \`s_hasRegistered\` | \`mapping(address => bool)\` | Tracks which addresses have registered (Checkpoint 2, learner adds) |
| \`s_commitments\` | \`mapping(uint256 => bool)\` | Tracks used commitments to prevent duplicates (Checkpoint 2, learner adds) |
| \`s_tree\` | \`LeanIMTData\` | Lean Incremental Merkle Tree for commitments (Checkpoint 2, learner adds) |
| \`s_nullifierHashes\` | \`mapping(bytes32 => bool)\` | Tracks used nullifiers to prevent double-voting (Checkpoint 6, learner adds) |
| \`s_verifier\` | \`IVerifier\` | Reference to ZK proof verifier contract (Checkpoint 6, learner adds) |

#### Custom Errors (pre-defined, do not modify)

| Error | Purpose |
|-------|---------|
| \`Voting__CommitmentAlreadyAdded(uint256 commitment)\` | Duplicate commitment |
| \`Voting__NullifierHashAlreadyUsed(bytes32 nullifierHash)\` | Double-voting attempt |
| \`Voting__InvalidProof()\` | ZK proof verification failed |
| \`Voting__NotAllowedToVote()\` | Non-allowlisted or already registered voter |
| \`Voting__EmptyTree()\` | Voting with zero root (no registrations) |
| \`Voting__InvalidRoot()\` | Root doesn't match tree root |

#### Events (pre-defined, do not modify)

| Event | Fields |
|-------|--------|
| \`VoterAdded(address indexed voter)\` | When voter added to allowlist |
| \`NewLeaf(uint256 index, uint256 value)\` | When commitment inserted into tree |
| \`VoteCast(bytes32 indexed nullifierHash, address indexed voter, bool vote, uint256 timestamp, uint256 totalYes, uint256 totalNo)\` | When vote is cast |

#### Functions to Implement (by Checkpoint)

**Checkpoint 2 -- Registration:**
1. **\`register(uint256 _commitment) public\`** -- Called by allowlisted voters to register their commitment. Must check: voter is allowlisted and hasn't already registered (revert with \`Voting__NotAllowedToVote\`), commitment is unique (revert with \`Voting__CommitmentAlreadyAdded\`). Insert commitment into LeanIMT via \`s_tree._insert(_commitment)\`, mark voter as registered, mark commitment as used, emit \`NewLeaf\` with the tree index and commitment value.

**Checkpoint 6 -- Voting:**
2. **\`vote(bytes memory _proof, bytes32 _nullifierHash, bytes32 _root, bytes32 _vote, bytes32 _depth) public\`** -- Verify ZK proof via \`s_verifier.verify()\`. Public inputs order passed to verifier: \`[_nullifierHash, _root, _vote, _depth]\`. Check: root is not \`bytes32(0)\` (revert with \`Voting__EmptyTree\`), root matches \`bytes32(s_tree.root())\` (revert with \`Voting__InvalidRoot\`), nullifier not already used (revert with \`Voting__NullifierHashAlreadyUsed\`), proof is valid (revert with \`Voting__InvalidProof\`). Mark nullifier as used. Increment \`s_yesVotes\` if \`_vote == bytes32(uint256(1))\`, otherwise increment \`s_noVotes\`. Emit \`VoteCast\` with nullifier hash, \`msg.sender\`, boolean vote, \`block.timestamp\`, and updated vote counts.

#### Provided Functions (DO NOT EDIT)

- **\`addVoters(address[] calldata voters, bool[] calldata statuses) public onlyOwner\`** -- Batch add/revoke voters on the allowlist
- **\`getVotingData() public view\`** -- Returns question, owner, vote counts, tree size/depth/root
- **\`getVoterData(address _voter) public view\`** -- Returns voter allowlist and registration status

### Verifier.sol (Interface, DO NOT EDIT)

\`\`\`solidity
interface IVerifier {
    function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool);
}
\`\`\`

### VerifierMock.sol (Testing Mock, DO NOT EDIT)

- Implements \`IVerifier\` with configurable behavior
- \`shouldVerify\` toggle controls whether \`verify()\` returns true or false
- \`setExpectedInputs(nullifier, root, vote, depth)\` for testing specific public input ordering
- \`enforceExpectedInputs\` flag to optionally validate exact public inputs
- Used by grading tests to simulate verifier behavior without real ZK proofs

## Noir Circuit

### main.nr (Learner Implements -- Checkpoints 3-4)

The ZK circuit proves a voter knows a commitment in the Merkle tree without revealing which one.

**Dependencies** (from \`Nargo.toml\`):
- \`binary_merkle_root\` from \`@zk-kit.noir\` (tag: \`binary-merkle-root-v0.0.1\`)
- \`std::hash::poseidon::bn254\` for \`hash_1\` (single input) and \`hash_2\` (two inputs)

**Checkpoint 3 -- Nullifier Hash Assertion:**
- Public input: \`nullifier_hash\`
- Private inputs: \`nullifier\`, \`secret\`
- Assert that \`nullifier_hash == hash_1(nullifier)\` (Poseidon BN254 hash of single field)

**Checkpoint 4 -- Merkle Proof Verification:**
- Add public inputs: \`root: pub Field\`, \`vote: pub bool\`, \`depth: pub u32\`
- Add private inputs: \`index: Field\`, \`siblings: [Field; 16]\`
- Compute commitment as \`hash_2([nullifier, secret])\` (Poseidon BN254 hash of two fields)
- Compute Merkle root using \`binary_merkle_root::compute_merkle_root(commitment, index, siblings, depth)\`
- Assert computed root matches provided \`root\`

## Deploy Script

**\`00_deploy_your_voting_contract.ts\`** -- Deploys the Voting contract with constructor arguments: owner address, verifier address, and question string.

**Checkpoint 2 modifications:**
- Deploy \`PoseidonT3\` library
- Deploy \`LeanIMT\` library linked to PoseidonT3
- Link LeanIMT library to Voting contract deployment (replace placeholder address)

**Checkpoint 6 modifications:**
- Deploy \`HonkVerifier\` contract (compiled from Noir circuit) instead of placeholder verifier address

Deploy order: PoseidonT3 -> LeanIMT (linked to PoseidonT3) -> HonkVerifier -> Voting (linked to LeanIMT, passed HonkVerifier address)

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- \`useScaffoldReadContract\` -- NOT ~~useScaffoldContractRead~~
- \`useScaffoldWriteContract\` -- NOT ~~useScaffoldContractWrite~~
- \`useScaffoldEventHistory\` -- for reading past events
- \`useScaffoldContract\` -- for getting the contract instance directly
- \`useTargetNetwork\` -- for detecting current network (hardhat vs sepolia)

### Main Page (voting/page.tsx)

Central voting interface orchestrating all challenge components. Fetches \`NewLeaf\` events via \`useScaffoldEventHistory\` and passes them to child components. Detects network (hardhat vs sepolia) via \`useTargetNetwork\` and renders the appropriate voting submission component (\`VoteWithBurnerHardhat\` or \`VoteWithBurnerSepolia\`).

Layout order: ShowVotersButton + AddVotersModal -> VotingStats -> CreateCommitment -> VoteSelector -> GenerateProof -> VoteWithBurner (network-dependent) -> LogStorageButton + ClearStorageButton

### Challenge Components (Learner Implements)

1. **CreateCommitment.tsx (Checkpoint 7)** -- Generate commitment from nullifier + secret using Poseidon hash, register on-chain via \`register()\`, save commitment data to localStorage
2. **GenerateProof.tsx (Checkpoint 8)** -- Fetch circuit data from \`/api/circuit\`, build Merkle tree from on-chain \`NewLeaf\` events, generate ZK proof using Noir.js and UltraHonkBackend, save proof to localStorage
3. **VoteWithBurnerHardhat.tsx (Checkpoint 9)** -- Create/load burner wallet from localStorage, submit vote transaction on local Hardhat network using burner for anonymity
4. **VoteWithBurnerSepolia.tsx (Checkpoint 10)** -- Create ERC-4337 smart account via permissionless.js + Pimlico, submit gasless vote on Sepolia for anonymity

### Helper Components (Provided)

- **VoteChoice.tsx** -- Yes/No toggle using Zustand store (\`voteChoice\`)
- **VotingStats.tsx** -- Displays question, vote counts, visual progress bar via \`getVotingData()\`
- **AddVotersModal.tsx** -- Owner-only form to add/revoke voters via \`addVoters()\`
- **ShowVotersButton.tsx** -- Display all voters with allowlist and registration status
- **LogStorageButton.tsx** -- Debug: log all zk-voting localStorage to console
- **ClearStorageButton.tsx** -- Clear all zk-voting localStorage

### State Management (challengeStore.ts -- Zustand)

Manages three pieces of state:
- \`commitmentData\` -- \`{ commitment, nullifier, secret, index? }\` -- set after commitment creation
- \`proofData\` -- \`{ proof: Uint8Array, publicInputs: any[] }\` -- set after proof generation
- \`voteChoice\` -- \`boolean | null\` -- set by VoteChoice toggle

### API Route

- **\`/api/circuit/route.ts\`** -- Serves compiled Noir circuit data to the frontend for client-side proof generation

### Storage Utilities (proofStorage.ts)

localStorage utilities scoped by contract address + user address:
- \`SerializableProofData\` -- proof bytes (as number array), public inputs, timestamp, contract address, vote choice
- \`SerializableCommitmentData\` -- commitment, nullifier, secret, index, timestamp, contract address, user address
- Key prefix: \`zk-voting-proof-data\`

### UI & Styling

- Use \`@scaffold-ui/components\` for web3 UI (\`Address\`, \`AddressInput\`, \`Balance\`, \`EtherInput\`)
- Use **DaisyUI** classes for components (cards, buttons, badges, tables) with Tailwind CSS

## Architecture Notes

- **Next.js App Router** (not Pages Router) -- pages are at \`app/<route>/page.tsx\`
- **Import alias**: use \`~~\` for nextjs package imports (e.g., \`import { ... } from "~~/hooks/scaffold-eth"\`)
- After \`yarn deploy\`, contract ABIs auto-generate to \`packages/nextjs/contracts/deployedContracts.ts\`
- **Commitment scheme**: \`commitment = poseidon_hash(nullifier, secret)\`. The nullifier is public (used to prevent double-voting via its hash), the secret is private (prevents others from computing your commitment)
- **Lean Incremental Merkle Tree (LeanIMT)**: An append-only Merkle tree where each leaf is a voter's commitment. The ZK circuit proves a commitment exists in the tree without revealing which one. Uses \`@zk-kit/lean-imt.sol\` with \`LeanIMTData\` struct and \`_insert()\` method
- **Nullifier pattern**: Each voter's nullifier hash is recorded on-chain when they vote. This prevents double-voting without revealing the voter's identity
- **Burner wallets**: To prevent linking a vote to a voter's registered address, votes are submitted from disposable burner wallets (Hardhat) or ERC-4337 smart accounts (Sepolia)
- **Circuit to Verifier flow**: Noir circuit is compiled to a verifier contract (HonkVerifier). The frontend generates proofs client-side using Noir.js + UltraHonkBackend, which are verified on-chain via \`IVerifier.verify()\`
- **localStorage persistence**: Commitment data, proofs, and burner wallet keys are stored in localStorage scoped by contract address + user address
- **Public inputs ordering**: The verifier expects public inputs as \`[nullifierHash, root, vote, depth]\` -- this order must match between the circuit, frontend proof generation, and on-chain verification

## Testing

The grading tests (\`packages/hardhat/test/Voting.ts\`) cover the following areas:

- **Checkpoint 2 (Registration)** -- Allows only allowlisted voters to register, prevents duplicate commitments (\`Voting__CommitmentAlreadyAdded\`), prevents double registration (\`Voting__NotAllowedToVote\`), verifies leaf insertion into tree (size and root), emits correct \`NewLeaf\` event
- **Checkpoint 6 (Voting)** -- Prevents double voting via nullifier reuse (\`Voting__NullifierHashAlreadyUsed\`), reverts on invalid proof (\`Voting__InvalidProof\`), increments yes/no vote counts correctly, emits \`VoteCast\` with correct fields, reverts on empty root (\`Voting__EmptyTree\`), reverts on invalid root (\`Voting__InvalidRoot\`)

Tests use \`VerifierMock\` with configurable verification behavior. The mock's \`setExpectedInputs(nullifier, root, vote, depth)\` validates the exact public inputs array passed to \`verify()\`.

Run with \`yarn test\`. These same tests are used by the SpeedRunEthereum autograder.

## Deployment Checklist (Testnet)

1. Compile the Noir circuit with \`nargo compile\` and generate the HonkVerifier contract
2. Set \`defaultNetwork\` to \`sepolia\` in \`packages/hardhat/hardhat.config.ts\` (or use \`--network sepolia\`)
3. \`yarn generate\` to create deployer account
4. Fund deployer with testnet ETH from a faucet
5. \`yarn deploy\` to deploy contracts (PoseidonT3 -> LeanIMT -> HonkVerifier -> Voting)
6. Set \`targetNetwork\` to \`chains.sepolia\` in \`packages/nextjs/scaffold.config.ts\`
7. \`yarn vercel\` to deploy frontend
8. \`yarn verify --network sepolia\` to verify contracts on Etherscan

## Code Style

| Style | Category |
|-------|----------|
| \`UpperCamelCase\` | Components, types, interfaces, contracts |
| \`lowerCamelCase\` | Variables, functions, parameters |
| \`CONSTANT_CASE\` | Constants, enum values |
| \`snake_case\` | Hardhat deploy files (e.g., \`00_deploy_your_voting_contract.ts\`), Noir variables |

## Key Warnings

- Do NOT edit \`Verifier.sol\` or \`VerifierMock.sol\` -- these are provided as-is
- Do NOT use deprecated hook names (\`useScaffoldContractRead\`, \`useScaffoldContractWrite\`)
- Contract ABIs in \`deployedContracts.ts\` are auto-generated -- do not edit manually
- Solidity version must stay compatible with \`@zk-kit/lean-imt.sol\` -- do not change it
- Tests check for custom errors and events by name -- they are pre-defined in the contract, do not rename them
- **Checkpoint 2 requires adding state variables**: \`s_hasRegistered\`, \`s_commitments\`, and \`s_tree\` (using \`LeanIMTData\` with \`using LeanIMT for LeanIMTData\`) must be added to Voting.sol
- **Checkpoint 6 requires adding state variables**: \`s_nullifierHashes\` and \`s_verifier\` must be added to Voting.sol; also uncomment the \`IVerifier\` import and set \`s_verifier\` in the constructor
- **Public inputs order matters**: The verifier expects \`[nullifierHash, root, vote, depth]\` in that exact order
- **Vote value encoding**: \`bytes32(uint256(1))\` means yes, any other value means no -- use \`bytes32\` comparison
- **Root validation**: Must check both that root is not \`bytes32(0)\` AND that it matches \`bytes32(s_tree.root())\`
- **Deploy script modifications**: Checkpoint 2 needs PoseidonT3 + LeanIMT library deployment (linked to Voting); Checkpoint 6 needs HonkVerifier deployment (replace placeholder verifier address)
- **Noir circuit**: Uses Poseidon BN254 hash functions (\`hash_1\` for single input, \`hash_2\` for two inputs) -- these are NOT the same as keccak256
- **Siblings array**: The circuit uses a fixed-size array of 16 siblings for Merkle proofs regardless of actual tree depth
- **getVotingData uncomment**: After implementing Checkpoint 2, uncomment the \`s_tree.size\`, \`s_tree.depth\`, and \`s_tree.root()\` lines in \`getVotingData()\`
- **getVoterData uncomment**: After implementing Checkpoint 2, uncomment the \`s_hasRegistered[_voter]\` line in \`getVoterData()\`
- \`proofStorage.ts\` scopes all localStorage by contract address + user address -- ensure correct scoping when testing
- The deploy script uses nonce-based deployment -- if you add or remove deployments, ensure library linking is correct
`;
