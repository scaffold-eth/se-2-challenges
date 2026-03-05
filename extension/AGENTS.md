# AGENTS.md

## What is SpeedRunEthereum?

[SpeedRunEthereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the SpeedRunEthereum challenges.** It covers **Crowdfunding**.

## Challenge Overview

The learner builds a **crowdfunding dApp** where users can coordinate a group funding effort using two smart contracts: `CrowdFund` and `FundingRecipient`. If enough ETH is contributed before a deadline, funds are forwarded to the recipient. If not, contributors can withdraw their funds. The users only have to trust the code, not each other.

The final deliverable: a dApp that lets users contribute ETH, tracks balances, executes funding on deadline, and handles withdrawals. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why Crowdfunding Matters

Crowdfunding is one of the most intuitive applications of smart contracts because it solves a real coordination problem: **how do you pool money from strangers without trusting a middleman?**

Traditional crowdfunding (Kickstarter, GoFundMe) requires trusting a platform to hold funds, enforce deadlines, and process refunds. A smart contract replaces that trust with code: the rules are public, immutable, and self-enforcing. Contributors only have to trust the code, not each other or a company.

Real-world examples of onchain crowdfunding and coordination:

- **Gitcoin Grants** - Quadratic funding for public goods. Smart contracts distribute matching funds based on the number of unique contributors, not just the amount raised. This mechanism gives small donors outsized influence.
- **Juicebox** - A protocol for funding projects with programmable treasuries. Projects like ConstitutionDAO used Juicebox to raise $47M in ETH from 17,000+ contributors, with automatic refunds when the bid failed.
- **Nouns DAO** - Daily NFT auctions fund a community treasury governed by token holders. The treasury has funded public goods, art installations, and open-source software, all via onchain votes.
- **Mirror** - Publishing platform where writers can crowdfund essays and projects. Backers receive NFTs representing their contribution, creating a composable record of patronage.

**Key insight**: The power of onchain crowdfunding isn't just replacing Kickstarter, it's that the funding rules become **composable primitives**. A crowdfunding contract can be plugged into governance systems, paired with token distributions, or composed with DeFi protocols. The same pattern (pool funds → check condition → distribute or refund) underlies DAOs, insurance pools, and prediction markets.

**The trust model**: In this challenge, the `CrowdFund` contract enforces two guarantees: (1) if the threshold is met by the deadline, funds go to the recipient, and (2) if not, every contributor can withdraw their exact contribution. No admin key, no platform fee, no trust required.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with `create-eth`, it produces a monorepo:

```
packages/
  hardhat/
    contracts/
      CrowdFund.sol            # Main contract - learner fills in the logic
      FundingRecipient.sol     # Simple recipient contract (DO NOT edit)
    deploy/
      00_deploy_funding_recipient.ts  # Deploys FundingRecipient first
      01_deploy_crowdfund.ts          # Deploys CrowdFund with FundingRecipient address
    test/
      CrowdFund.ts             # Checkpoint-based grading tests
  nextjs/
    app/
      crowdfund/               # Main crowdfund UI page
        page.tsx
        _components/
          ContributeContractInteraction.tsx  # Contribute, execute, withdraw UI
          EthToPrice.tsx                     # ETH price display helper
      contributions/
        page.tsx               # Shows all Contribution events
```

## Common Commands

```bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000

# Testing (checkpoint-based)
yarn test                       # Run all challenge tests
yarn test --grep "Checkpoint1"  # Test just contributing
yarn test --grep "Checkpoint2"  # Test just withdrawing
yarn test --grep "Checkpoint3"  # Test state machine / timing
yarn test --grep "Checkpoint4"  # Test receive function

# Redeploy fresh (resets deadline timer)
yarn deploy --reset

# Deploy to testnet (requires interactive password prompt, cannot be run by agents)
yarn deploy --network sepolia

# Contract verification (requires interactive password prompt, cannot be run by agents)
yarn verify --network sepolia

# Account management (requires interactive password prompt, cannot be run by agents)
yarn generate       # Generate deployer account
yarn account        # View deployer account balances

# Frontend deployment
yarn vercel         # Deploy frontend to Vercel
yarn vercel --prod  # Redeploy to production URL
```

## Smart Contracts

### CrowdFund.sol (Main Contract - Learner Implements)

The contract is provided as a **skeleton with empty functions**. The learner fills in logic progressively through checkpoints.

**Constructor**: Takes a `FundingRecipient` address and stores it.

**State variables the learner must add:**
- `mapping(address => uint256) public balances` - tracks individual contributions
- `bool public openToWithdraw` - defaults to false, set true when funding fails
- `uint256 public deadline` - set to `block.timestamp + 30 seconds` (or longer for testnet)
- `uint256 public constant threshold` - set to `1 ether`

**Events the learner must add:**
- `event Contribution(address, uint256)` - emitted on each contribution

**Custom errors the learner must add:**
- `error NotOpenToWithdraw()` - thrown when withdraw called before allowed
- `error WithdrawTransferFailed(address to, uint256 amount)` - thrown on failed ETH transfer
- `error TooEarly(uint256 deadline, uint256 currentTimestamp)` - thrown when execute called before deadline

**Functions the learner must implement:**

| Function | Purpose |
|----------|---------|
| `contribute()` | payable, updates `balances[msg.sender]`, emits `Contribution` |
| `withdraw()` | checks `openToWithdraw`, sends balance back, zeros out user's balance |
| `execute()` | after deadline: if threshold met, calls `fundingRecipient.complete{value: balance}()`; otherwise sets `openToWithdraw = true` |
| `timeLeft()` | view, returns `deadline - block.timestamp` or 0 if past deadline |
| `receive()` | calls `contribute()` when ETH sent directly to contract |

**Modifier (side quest):**
- `notCompleted()` - checks `fundingRecipient.completed()` is false, reverts with custom error if true. Applied to `contribute`, `withdraw`, and `execute` to prevent trapped funds.

**Key pattern - Checks-Effects-Interactions in withdraw():**
```solidity
uint256 balance = balances[msg.sender];
balances[msg.sender] = 0;  // Zero out BEFORE sending
(bool success,) = msg.sender.call{value: balance}("");
```

### FundingRecipient.sol (DO NOT EDIT)

Simple contract with:
- `bool public completed` - tracks if funding was received
- `function complete() public payable` - sets `completed = true`, receives ETH

**Deploy order matters**: FundingRecipient deploys first (script `00_`), CrowdFund deploys second (script `01_`) with FundingRecipient's address as constructor arg.

## Frontend Architecture

### Scaffold-ETH 2 Hooks

Use the correct hook names: `useScaffoldReadContract`, `useScaffoldWriteContract`, `useScaffoldEventHistory`, `useDeployedContractInfo`. Do NOT use deprecated names (`useScaffoldContractRead`, `useScaffoldContractWrite`).

### Frontend Flows

- **Main UI** (`ContributeContractInteraction.tsx`): Displays time left, user's contribution balance, total contract balance vs threshold (with ETH-to-USD price), completion status. Buttons: Execute, Withdraw, Contribute 0.5 ETH.
- **Contributions page**: Shows all `Contribution` events via `useScaffoldEventHistory`. Event args accessed by index (`event.args?.[0]`, `event.args?.[1]`). If learner uses named event params, update references to match.

### UI & Styling

- Use **DaisyUI** classes for components (cards, buttons, badges, tables) with Tailwind CSS

## Architecture Notes

- **Next.js App Router** (not Pages Router) - pages are at `app/<route>/page.tsx`
- **Import alias**: use `~~` for nextjs package imports (e.g., `import { ... } from "~~/hooks/scaffold-eth"`)
- After `yarn deploy`, contract ABIs auto-generate to `packages/nextjs/contracts/deployedContracts.ts`
- `yarn deploy --reset` is useful to reset the 30-second deadline timer during development
- `hardhat/console.sol` is already imported, use `console.log()` in Solidity for debugging (output appears in `yarn chain` terminal)

## Testing

Tests are checkpoint-based in `packages/hardhat/test/CrowdFund.ts`:

- **Checkpoint 1**: `contribute()` updates balances, emits events, accumulates correctly, tracks per-contributor
- **Checkpoint 2**: `withdraw()` reverts when not open, sends correct balance, zeros out balance, prevents double-withdraw
- **Checkpoint 3**: `execute()` reverts before deadline (TooEarly), `timeLeft()` decreases, execute triggers `complete()` when threshold met, enables withdraw when threshold not met
- **Checkpoint 4**: Sending ETH directly to contract behaves like `contribute()`

Tests use `evm_increaseTime` and `evm_mine` to simulate time passing. Run `yarn test` for all or `yarn test --grep "CheckpointN"` for specific checkpoints.

## Deployment Checklist (Testnet)

1. Set `deadline` to a longer duration (e.g., `block.timestamp + 2 hours`) for testnet
2. Set `defaultNetwork` to `sepolia` in `packages/hardhat/hardhat.config.ts`
3. `yarn generate` to create deployer account
4. Fund deployer with testnet ETH
5. `yarn deploy` to deploy contracts
6. Set `targetNetwork` to `chains.sepolia` in `packages/nextjs/scaffold.config.ts`
7. `yarn vercel` to deploy frontend
8. `yarn verify --network sepolia` to verify contracts

## Code Style

| Style | Category |
|-------|----------|
| `UpperCamelCase` | Components, types, interfaces, contracts |
| `lowerCamelCase` | Variables, functions, parameters |
| `CONSTANT_CASE` | Constants, enum values |
| `snake_case` | Hardhat deploy files |

## Key Warnings

- Do NOT edit `FundingRecipient.sol`, it can break autograding
- Contract ABIs in `deployedContracts.ts` are auto-generated, do not edit manually
- The `contribute()` function must be `payable`
- Use custom errors (gas efficient) instead of `require` with string messages
- Zero out balances BEFORE sending ETH in `withdraw()` (checks-effects-interactions pattern)
- `yarn deploy --reset` resets the deadline; regular `yarn deploy` only redeploys if contract changed
- If using named event params, update `contributions/page.tsx` to match
- Solidity version must stay `0.8.20`, do not change it
