// If this is passed it will override the full content of the AGENTS.md file
export const fullContentOverride = `# AGENTS.md

## What is Speedrun Ethereum?

[Speedrun Ethereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the Speedrun Ethereum challenges.** It covers **Dice Game**.

## Challenge Overview

The learner explores on-chain pseudo-randomness by interacting with a dice game contract (\`DiceGame\`) and building an attacker contract (\`RiggedRoll\`) that predicts the randomness and only rolls when guaranteed to win. The goal is to understand why \`block.prevrandao\`-based randomness is exploitable, and how to build (and break) simple game mechanics.

The final deliverable: an app that demonstrates the dice game exploit. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why the Dice Game Matters

Randomness on a public, deterministic blockchain is one of the hardest unsolved UX problems in crypto. Every validator and every node executes the same transactions in the same order and must arrive at the same result -- so where does "random" come from? This challenge teaches you why naive approaches fail and why secure randomness requires external infrastructure.

Why this matters beyond dice:

- **NFT minting fairness** -- Many NFT drops need fair, unbiased random assignment. Projects like [Bored Ape Yacht Club](https://boredapeyachtclub.com/) had to carefully design reveal mechanics. Without secure randomness, insiders or miners could cherry-pick rare traits.
- **DeFi liquidation ordering** -- Some protocols randomize liquidation priority to prevent MEV (Miner Extractable Value) bots from front-running. Understanding how block-level values can be predicted is essential for designing MEV-resistant systems.
- **Gaming and lotteries** -- [PoolTogether](https://pooltogether.com/) is a no-loss savings protocol that uses randomness to select winners. They rely on [Chainlink VRF](https://chain.link/vrf) (Verifiable Random Function) -- an oracle that provides provably fair randomness that can't be predicted or manipulated.
- **Governance and jury selection** -- Fair random selection for DAOs, dispute resolution (like [Kleros](https://kleros.io/)), and validator selection all require randomness that no single party can influence.

**Key insight**: \`block.prevrandao\` (formerly \`block.difficulty\`) looks random but is entirely predictable within the same transaction. Any contract can compute the same "random" value before calling yours. This is why the \`RiggedRoll\` exploit works -- and why production systems use commit-reveal schemes, VRF oracles, or other external randomness sources.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with \`create-eth\`, it produces a monorepo:

\`\`\`
packages/
  hardhat/
    contracts/
      DiceGame.sol           # House dice game contract (DO NOT EDIT)
      RiggedRoll.sol         # Attacker contract (learner implements)
    deploy/
      00_deploy_dice_game.ts       # Deploys DiceGame, funds with 0.05 ETH
      01_deploy_rigged_roll.ts     # Deploys RiggedRoll (learner must uncomment)
    test/
      RiggedRoll.ts          # Checkpoint-based grading tests
  nextjs/
    app/
      dice/
        page.tsx             # Main dice game UI
        _components/
          DiceGameBoard.tsx  # Game board component
\`\`\`

## Common Commands

\`\`\`bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000

# Redeploy fresh
yarn deploy --reset

# Testing (checkpoint-based)
yarn test                       # Run all challenge tests
yarn test --grep "Checkpoint2"  # Test RiggedRoll prediction logic
yarn test --grep "Checkpoint3"  # Test withdraw function

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

### DiceGame.sol (Provided, DO NOT EDIT)

- Accepts exactly **0.002 ETH** per roll via \`rollTheDice()\`.
- Generates a pseudo-random number: \`uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), address(this), nonce))) % 16\`
- If the roll is **0, 1, 2, 3, 4, or 5** (out of 0–15), the player wins the current prize amount.
- 40% of each roll fee is added to the prize; 60% stays in the contract.
- Prize resets to 10% of contract balance after each win.
- Public state: \`nonce\` (increments each roll), \`prize\` (current prize amount).
- Emits \`Roll(address player, uint256 amount, uint256 roll)\` on every roll.
- Emits \`Winner(address winner, uint256 amount)\` on a winning roll.

### RiggedRoll.sol (Learner Implements)

The learner must write a contract that **predicts** the dice roll before calling \`DiceGame.rollTheDice()\`.

#### Custom Errors (learner must define)

| Error | Purpose |
|-------|---------|
| \`NotEnoughETH(uint256 required, uint256 available)\` | Contract doesn't have 0.002 ETH to roll |
| \`NotWinningRoll(uint256 roll)\` | Predicted roll is not a winner (> 5) |
| \`InsufficientBalance(uint256 requested, uint256 available)\` | Withdraw amount exceeds balance |

#### Functions to Implement

1. **\`riggedRoll() external\`** - Replicate the DiceGame randomness calculation using the same \`blockhash\`, \`address(diceGame)\`, and \`diceGame.nonce()\`. If the predicted roll is 0–5 (winner), call \`diceGame.rollTheDice{value: 0.002 ether}()\`. Otherwise revert with \`NotWinningRoll\`.
2. **\`withdraw(address _addr, uint256 _amount) external onlyOwner\`** - Allow the owner to withdraw winnings from the contract. Revert with \`InsufficientBalance\` if amount exceeds balance.
3. **\`receive() external payable\`** - Accept ETH (winnings from DiceGame and faucet funding).

#### Key Insight

Because \`blockhash(block.number - 1)\` and \`address(diceGame)\` are known at call time, and the nonce is public, the attacker can compute the exact same hash the DiceGame will compute, and only proceed when the result is a winning number.

## Deploy Scripts

- **\`00_deploy_dice_game.ts\`** - Deploys \`DiceGame\` and funds it with **0.05 ETH**.
- **\`01_deploy_rigged_roll.ts\`** - Deploys \`RiggedRoll\` with the DiceGame address. The learner must **uncomment** the relevant lines in this file. The owner should be set to the frontend address so the UI can call \`withdraw\`.

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- \`useScaffoldReadContract\` - NOT ~~useScaffoldContractRead~~
- \`useScaffoldWriteContract\` - NOT ~~useScaffoldContractWrite~~
- \`useScaffoldEventHistory\` - for reading past events
- \`useScaffoldContract\` - for getting the contract instance directly

### Main UI (dice/page.tsx)

- Interactive dice game UI: shows the contract balance, recent rolls, a roll button, and win/lose animations.
- Displays event history using \`useScaffoldEventHistory\`.
- The learner can **uncomment** a riggedRoll button and RiggedRoll contract balance display.

### UI Components

Use \`@scaffold-ui/components\` for web3 UI:
- \`Address\` - display ETH addresses with ENS resolution and blockie avatars
- \`Balance\` - show ETH balance

### Styling

Use **DaisyUI** classes for components (cards, buttons, badges, tables). The project uses Tailwind CSS with DaisyUI.

## Architecture Notes

- **Next.js App Router** (not Pages Router) - pages are at \`app/<route>/page.tsx\`
- **Import alias**: use \`~~\` for nextjs package imports (e.g., \`import { ... } from "~~/hooks/scaffold-eth"\`)
- After \`yarn deploy\`, contract ABIs auto-generate to \`packages/nextjs/contracts/deployedContracts.ts\`
- Fund the RiggedRoll contract from the faucet before attempting \`riggedRoll()\`, it needs 0.002 ETH
- The frontend dice displays hexadecimal characters (A–F = 10–15) but the contract uses integers
- \`hardhat/console.sol\` can be imported for debugging, output appears in \`yarn chain\` terminal

## Testing

The grading tests (\`packages/hardhat/test/RiggedRoll.ts\`) are organized into checkpoints:

- **Checkpoint 2**: \`RiggedRoll\` can predict outcomes and only rolls on winning numbers; reverts with \`NotWinningRoll\` on losing predictions
- **Checkpoint 3**: \`RiggedRoll\` owner can withdraw funds; non-owner is rejected; \`InsufficientBalance\` on over-withdraw

Run with \`yarn test\` for all or \`yarn test --grep "CheckpointN"\` for specific checkpoints. These same tests are used by the Speedrun Ethereum autograder.

## Deployment Checklist (Testnet)

1. Set \`defaultNetwork\` to \`sepolia\` in \`packages/hardhat/hardhat.config.ts\` (or use \`--network sepolia\`)
2. \`yarn generate\` to create deployer account
3. Fund deployer with testnet ETH from a faucet
4. \`yarn deploy\` to deploy contracts
5. Set \`targetNetwork\` to \`chains.sepolia\` in \`packages/nextjs/scaffold.config.ts\`
6. \`yarn vercel\` to deploy frontend
7. \`yarn verify --network sepolia\` to verify contracts on Etherscan

## Code Style

| Style | Category |
|-------|----------|
| \`UpperCamelCase\` | Components, types, interfaces, contracts |
| \`lowerCamelCase\` | Variables, functions, parameters |
| \`CONSTANT_CASE\` | Constants, enum values |
| \`snake_case\` | Hardhat deploy files (e.g., \`00_deploy_dice_game.ts\`) |

## Key Warnings

- Do NOT edit \`DiceGame.sol\`, it is provided as-is and must not be modified
- Do NOT use deprecated hook names (\`useScaffoldContractRead\`, \`useScaffoldContractWrite\`)
- Contract ABIs in \`deployedContracts.ts\` are auto-generated - do not edit manually
- The RiggedRoll must send exactly 0.002 ETH when calling \`rollTheDice()\`
- Forgetting the \`receive()\` function means the contract cannot receive winnings
- Use \`address(diceGame)\` (not \`address(this)\` or \`msg.sender\`) when replicating the hash, DiceGame uses \`msg.sender\` which will be the RiggedRoll contract's address
- The \`01_deploy_rigged_roll.ts\` deploy script lines must be uncommented before deploying
- On-chain pseudo-randomness is **not** secure, this challenge demonstrates the vulnerability

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
