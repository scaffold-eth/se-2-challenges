// If this is passed it will override the full content of the AGENTS.md file
export const fullContentOverride = ({solidityFramework}) => `# AGENTS.md

## What is Speedrun Ethereum?

[Speedrun Ethereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the Speedrun Ethereum challenges.** It covers **Oracles**.

## Challenge Overview

The learner explores three fundamental oracle architectures: **Whitelist Oracle**, **Staking Oracle**, and **Optimistic Oracle**. Each design represents a different approach to solving the oracle problem: How can we trust data from outside the blockchain, and how do we securely bring it on-chain?

The final deliverable: a comprehensive understanding of oracle architectures through hands-on implementation. Deploy the optimistic oracle contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why Oracles Matter

Oracles are bridges between blockchains and the external world. Smart contracts can only access data that exists on the blockchain, but most real-world data (prices, weather, sports scores, etc.) exists off-chain.

Why understanding oracles is essential:

- **DeFi Protocols**: Need accurate price feeds for lending, trading, and liquidation. Chainlink, Pyth, and UMA are critical infrastructure.
- **Trust and Security**: A single faulty oracle can crash protocols. Understanding oracle design is understanding protocol security.
- **Incentive Design**: Staking, slashing, dispute resolution -- these mechanisms align oracle behavior with protocol needs.
- **Trade-offs**: Whitelist (simple but centralized), Staking (decentralized but complex), Optimistic (strong guarantees but higher latency).

**Key insight**: There is no single "best" oracle design. Each approach trades off between decentralization, speed, cost, and security. Real-world systems often combine multiple approaches.

## Project Structure

This is a Scaffold-ETH 2 extension. When instantiated with \`create-eth\`, it produces a monorepo with either Hardhat or Foundry as the smart contract framework.

This project uses **${solidityFramework === "hardhat" ? "Hardhat" : "Foundry"}** as the smart contract framework.

\`\`\`
packages/
  ${solidityFramework}/
    contracts/
      00_Whitelist/
        SimpleOracle.sol           # Individual oracle node (provided)
        WhitelistOracle.sol        # Aggregator with whitelist management (learner implements)
      01_Staking/
        OracleToken.sol            # ORA ERC-20 token for staking (provided)
        StakingOracle.sol          # Staking-based oracle with slashing (learner implements)
      02_Optimistic/
        Decider.sol                # Dispute resolver contract (provided)
        OptimisticOracle.sol       # Optimistic oracle with dispute flow (learner implements)
      utils/
        StatisticsUtils.sol        # Sorting and median calculation library (provided)
${solidityFramework === "hardhat" ? `    deploy/
      00_deploy_whitelist.ts       # Deploys WhitelistOracle + creates SimpleOracles
      01_deploy_staking.ts         # Deploys ORA token + StakingOracle
      02_deploy_optimistic.ts      # Deploys OptimisticOracle + Decider
    test/
      WhitelistOracle.ts           # Checkpoint 1 tests
      StakingOracle.ts             # Checkpoint 2 tests
      OptimisticOracle.ts          # Checkpoint 4-6 tests` : `    script/
      DeployWhitelist.s.sol        # Deploys WhitelistOracle + creates SimpleOracles
      DeployStaking.s.sol          # Deploys ORA token + StakingOracle
      DeployOptimistic.s.sol       # Deploys OptimisticOracle + Decider
    test/
      WhitelistOracle.t.sol        # Checkpoint 1 tests
      StakingOracle.t.sol          # Checkpoint 2 tests
      OptimisticOracle.t.sol       # Checkpoint 4-6 tests`}
  nextjs/
    app/
      whitelist-oracle/            # Whitelist Oracle UI
      staking-oracle/              # Staking Oracle UI
      optimistic-oracle/           # Optimistic Oracle UI
\`\`\`

## Common Commands

\`\`\`bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000

# Redeploy fresh
yarn deploy --reset

# Testing
yarn test           # Run all challenge tests

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

### Whitelist Oracle System

#### SimpleOracle.sol (Provided, DO NOT EDIT)
- Individual oracle node that stores a single price.
- Owner can update the price via \`setPrice()\`.

#### WhitelistOracle.sol (Learner Implements)
- Manages a whitelist of SimpleOracle instances.
- \`addOracle(address _owner)\` — Creates and registers a new SimpleOracle.
- \`removeOracle(uint256 index)\` — Removes by swap-and-pop pattern.
- \`getPrice()\` — Returns median price from all active (non-stale) oracles.
- \`getActiveOracleNodes()\` — Returns addresses of oracles updated within \`STALE_DATA_WINDOW\` (24 seconds).
- Uses \`StatisticsUtils\` for sorting and median calculation.

### Staking Oracle System

#### OracleToken.sol (ORA) (Provided, DO NOT EDIT)
- ERC-20 token for staking. Fixed rate: 1 ETH = 200 ORA.
- Owner can \`mint()\`, anyone can \`burn()\` and \`buy()\`.

#### StakingOracle.sol (Learner Implements)
- Nodes register by staking ORA tokens (minimum 100 ORA).
- \`registerNode(uint256 amount)\` — Register with initial stake.
- \`reportPrice(uint256 price)\` — Report price in current bucket (one report per bucket per node).
- \`recordBucketMedian(uint256 bucketNumber)\` — Finalize median for a past bucket.
- \`slashNode(...)\` — Slash node whose price deviated >10% from bucket median.
- \`exitNode(uint256 index)\` — Exit after waiting period, receive effective stake.
- \`claimReward()\` — Claim 1 ORA per report.
- Bucket system: 24 blocks per bucket, nodes report once per bucket.
- Inactivity penalty: 1 ORA per missed bucket.
- Misreport penalty: 100 ORA (10% goes to slasher).

### Optimistic Oracle System

#### Decider.sol (Provided, DO NOT EDIT)
- Settlement contract for disputed assertions.
- \`settleDispute(uint256 assertionId, bool resolvedValue)\` — Resolves disputes.

#### OptimisticOracle.sol (Learner Implements)
- Assertion lifecycle: Assert → Propose → (optionally) Dispute → Settle/Expire.
- \`assertEvent(string description, uint256 startTime, uint256 endTime)\` — Create assertion with ETH reward.
- \`proposeOutcome(uint256 assertionId, bool outcome)\` — Propose with bond (2x reward).
- \`disputeOutcome(uint256 assertionId)\` — Dispute with matching bond.
- \`claimUndisputedReward(uint256 assertionId)\` — Claim after dispute window (3 min).
- \`claimDisputedReward(uint256 assertionId)\` — Claim after decider settlement.
- \`claimRefund(uint256 assertionId)\` — Refund asserter if no proposals by deadline.
- \`settleAssertion(uint256 assertionId, bool resolvedOutcome)\` — Only decider can call.
- \`getState(uint256 assertionId)\` — Returns: Invalid, Asserted, Proposed, Disputed, Settled, Expired.

## Deploy Scripts

${solidityFramework === "hardhat" ? `- **\`00_deploy_whitelist.ts\`** — Deploys WhitelistOracle, creates 10 SimpleOracle instances, sets initial prices.
- **\`01_deploy_staking.ts\`** — Deploys ORA token and StakingOracle, transfers ORA ownership to StakingOracle.
- **\`02_deploy_optimistic.ts\`** — Deploys OptimisticOracle with pre-computed Decider address, then deploys Decider.` : `- **\`DeployWhitelist.s.sol\`** — Deploys WhitelistOracle, creates 3 SimpleOracle instances.
- **\`DeployStaking.s.sol\`** — Deploys ORA token and StakingOracle, transfers ORA ownership to StakingOracle.
- **\`DeployOptimistic.s.sol\`** — Deploys OptimisticOracle with pre-computed Decider address, then deploys Decider.`}

## Oracle Bot Scripts (Hardhat only)

The challenge includes TypeScript bot scripts in \`packages/hardhat/scripts/\` that simulate oracle node behavior (price reporting, slashing, etc.). These scripts are hardhat-specific and not available in the Foundry setup.

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- \`useScaffoldReadContract\` — NOT ~~useScaffoldContractRead~~
- \`useScaffoldWriteContract\` — NOT ~~useScaffoldContractWrite~~
- \`useScaffoldEventHistory\` — for reading past events
- \`useScaffoldContract\` — for getting the contract instance directly

### UI Pages

- **Whitelist Oracle** — Add/remove oracles, set prices, view median and active nodes.
- **Staking Oracle** — Register nodes, stake ORA, report prices, view buckets, slash outliers.
- **Optimistic Oracle** — Assert events, propose outcomes, dispute, settle, claim rewards.

### UI Components

Use \`@scaffold-ui/components\` for web3 UI:
- \`Address\` — display ETH addresses with ENS resolution and blockie avatars
- \`AddressInput\` — input with address validation and ENS resolution
- \`Balance\` — show ETH balance
- \`EtherInput\` — number input with ETH/USD toggle

### Styling

Use **DaisyUI** classes for components (cards, buttons, badges, tables). The project uses Tailwind CSS with DaisyUI.

## Architecture Notes

- **Next.js App Router** (not Pages Router) — pages are at \`app/<route>/page.tsx\`
- **Import alias**: use \`~~\` for nextjs package imports (e.g., \`import { ... } from "~~/hooks/scaffold-eth"\`)
- After \`yarn deploy\`, contract ABIs auto-generate to \`packages/nextjs/contracts/deployedContracts.ts\`
- Tokens require user to \`approve\` the oracle/staking contract before any \`transferFrom\` call

## Testing

The grading tests (\`packages/${solidityFramework}/test/\`) cover:

- **Checkpoint 1 (WhitelistOracle)**: Add/remove oracles, median calculation, stale data filtering, active nodes.
- **Checkpoint 2 (StakingOracle)**: Registration, price reporting, rewards, buckets, slashing, exit, outlier detection.
- **Checkpoint 4-6 (OptimisticOracle)**: Assertions, proposals, disputes, time windows, reward claiming, settlement, state management.

Run with \`yarn test\`. These same tests are used by the Speedrun Ethereum autograder.

## Deployment Checklist (Testnet)

1. \`yarn generate\` to create deployer account
2. Fund deployer with testnet ETH from a faucet
3. ${solidityFramework === "hardhat" ? `Set \`defaultNetwork\` to \`sepolia\` in \`packages/hardhat/hardhat.config.ts\` and run \`yarn deploy\`, or use \`yarn deploy --network sepolia\`` : `\`yarn deploy --network sepolia\``}
4. Set \`targetNetwork\` to \`chains.sepolia\` in \`packages/nextjs/scaffold.config.ts\`
5. \`yarn vercel\` to deploy frontend
6. \`yarn verify --network sepolia\` to verify contracts on Etherscan

## Code Style

| Style | Category |
|-------|----------|
| \`UpperCamelCase\` | Components, types, interfaces, contracts |
| \`lowerCamelCase\` | Variables, functions, parameters |
| \`CONSTANT_CASE\` | Constants, enum values |
${solidityFramework === "hardhat" ? `| \`snake_case\` | Hardhat deploy files (e.g., \`00_deploy_whitelist.ts\`) |` : `| \`UpperCamelCase\` | Foundry script files (e.g., \`DeployWhitelist.s.sol\`) |`}

## Key Warnings

- Do NOT use deprecated hook names (\`useScaffoldContractRead\`, \`useScaffoldContractWrite\`)
- Contract ABIs in \`deployedContracts.ts\` are auto-generated — do not edit manually
- WhitelistOracle's \`removeOracle\` uses swap-and-pop — order is not preserved
- StakingOracle's bucket system requires understanding of \`block.number\`-based time windows
- Nodes must record previous bucket's median before reporting in a new bucket
- Effective stake accounts for inactivity penalties — nodes can be blocked from reporting if they miss too many buckets
- OptimisticOracle bonds are 2x the assertion reward
- Dispute window is 3 minutes — proposals can only be disputed within this window
- Only the decider contract can settle disputed assertions

# Speedrun Ethereum AI-Guided mode

This project has an interactive AI learning mode for blockchain development.

## Quick Start
Run \`/start\` to begin. The AI will guide you through building a smart contract interactively.

## Commands
- \`/start\` — Begin or resume the challenge
- \`/skip\` — Skip current coding task (AI writes + explains solution)
- \`hint\` — Get help anytime
- \`check\` — Validate your code (code-writing challenges)

## Key Files
- \`extension/.ai/CHALLENGE.yaml\` — Challenge definition
- \`.challenge-ai/progress.json\` — Your progress (auto-generated)
`;
