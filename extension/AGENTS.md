# AGENTS.md

## What is SpeedRunEthereum?

[SpeedRunEthereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the SpeedRunEthereum challenges.** It covers **DEX**.

## Challenge Overview

The learner builds a simple decentralized exchange (DEX) using the **constant product formula** (`x * y = k`). The DEX allows swapping ETH for an ERC-20 token (Balloons / $BAL) and vice versa, plus adding and removing liquidity. The goal is to understand AMM mechanics, liquidity pools, pricing curves, swap fees, and LP token math.

The final deliverable: an app that allows users to seamlessly trade ERC-20 Balloons with ETH in a decentralized manner. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why DEXs Matter

Decentralized exchanges are the backbone of DeFi. By replacing order books and centralized matching engines with a simple mathematical formula (`x * y = k`), AMMs enable anyone to trade any token, anytime, without permission or intermediaries. The constant product formula you implement here is the same core mechanism that powers real DEXs handling billions in daily volume.

Why understanding AMMs is essential:

- **Uniswap** pioneered the constant product AMM and now processes more volume than many centralized exchanges. The V2 version uses the same `x * y = k` formula you're building. V3 and V4 add concentrated liquidity and hooks, but the foundation is identical.
- **Liquidity providing** is a core DeFi primitive. When you add liquidity to a pool, you become a market maker earning fees on every trade. Understanding how LP shares work, how impermanent loss occurs, and how the pricing curve shifts is fundamental to participating in DeFi.
- **Price discovery** on AMMs happens automatically through arbitrage. If the DEX price drifts from the market price, arbitrageurs trade until it realigns. This creates an emergent, decentralized price oracle that other protocols depend on.
- **Composability** -- DEX pools are building blocks. Other protocols can route trades through them, use them as price feeds, or build complex multi-hop swaps. Aggregators like [1inch](https://1inch.io/) and [Paraswap](https://www.paraswap.io/) split trades across multiple DEXs to find the best price.

**Key insight**: The `x * y = k` formula means every trade moves the price. Larger trades relative to pool size create more "slippage" (worse price). This is why liquidity depth matters -- and why real DEXs incentivize liquidity providers with trading fees.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with `create-eth`, it produces a monorepo:

```
packages/
  hardhat/
    contracts/
      Balloons.sol           # ERC-20 token (provided, DO NOT EDIT)
      DEX.sol                # Decentralized exchange (learner implements)
    deploy/
      00_deploy_your_contract.ts   # Deploys Balloons, DEX, seeds initial liquidity
    test/
      Challenge.ts           # Checkpoint-based grading tests
  nextjs/
    app/
      dex/
        page.tsx             # Swap UI with reserve graph
      events/
        page.tsx             # DEX event log
```

## Common Commands

```bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
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
```

## Smart Contracts

### Balloons.sol (Provided, DO NOT EDIT)

- Standard ERC-20 token.
- Mints **1000 tokens** to the deployer in the constructor.

### DEX.sol (Learner Implements)

The main AMM contract. Learner fills in the function bodies.

#### State Variables

- `token` - reference to the Balloons ERC-20 contract
- `totalLiquidity` - total LP shares outstanding
- `liquidity[address]` - per-user LP share balance

#### Events (learner must define)

| Event | Fields |
|-------|--------|
| `EthToTokenSwap(address swapper, uint256 tokenOutput, uint256 ethInput)` | ETH -> token swap |
| `TokenToEthSwap(address swapper, uint256 tokensInput, uint256 ethOutput)` | Token -> ETH swap |
| `LiquidityProvided(address provider, uint256 liquidityMinted, uint256 ethInput, uint256 tokenInput)` | Add liquidity |
| `LiquidityRemoved(address provider, uint256 liquidityAmount, uint256 tokenOutput, uint256 ethOutput)` | Remove liquidity |

#### Functions to Implement

1. **`init(uint256 tokens) public payable returns (uint256)`** - Initialize the pool with ETH + tokens. Sets initial liquidity equal to `msg.value`. Can only be called once (when `totalLiquidity == 0`). Transfers tokens from caller via `transferFrom`.
2. **`price(uint256 xInput, uint256 xReserves, uint256 yReserves) public pure returns (uint256)`** - Constant product price function with **0.3% fee**: `yOutput = (yReserves * xInput * 997) / (xReserves * 1000 + xInput * 997)`.
3. **`ethToToken() public payable returns (uint256)`** - Swap ETH for tokens. Use `address(this).balance - msg.value` as the ETH reserve (before the incoming ETH). Transfer tokens to caller.
4. **`tokenToEth(uint256 tokenInput) public returns (uint256)`** - Swap tokens for ETH. Pull tokens via `transferFrom`, send ETH to caller via `call`.
5. **`deposit() public payable returns (uint256)`** - Add liquidity proportionally. Mint LP shares based on `msg.value * totalLiquidity / ethReserve`. Token deposit: `msg.value * tokenReserve / ethReserve + 1`.
6. **`withdraw(uint256 amount) public returns (uint256, uint256)`** - Remove liquidity. Burn LP shares, return proportional ETH and tokens.
7. **`getLiquidity(address lp) public view returns (uint256)`** - Return the LP share balance of an address (needed for autograder submission).

#### Key Formula

```
yOutput = (yReserves * xInput * 997) / (xReserves * 1000 + xInput * 997)
```

The `997/1000` factor implements a **0.3% swap fee** that accrues to liquidity providers.

## Deploy Script

- **`00_deploy_your_contract.ts`** - Deploys `Balloons`, then `DEX`, then approves and calls `dex.init()` to seed the pool with initial liquidity (typically 5 ETH + 5 tokens). The learner must **uncomment** the init section.
- Also sends 10 Balloons to the frontend address for testing (learner must set `YOUR_FRONTEND_ADDRESS`).

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- `useScaffoldReadContract` - NOT ~~useScaffoldContractRead~~
- `useScaffoldWriteContract` - NOT ~~useScaffoldContractWrite~~
- `useScaffoldEventHistory` - for reading past events
- `useScaffoldContract` - for getting the contract instance directly

### Swap UI (dex/page.tsx)

- Swap interface for ETH <-> Balloons trades.
- Shows reserves, price curve visualization.
- Users can input swap amounts and see how the price is calculated.
- Chart displays how larger swaps result in more slippage and less output.

### Events Page (events/page.tsx)

Displays swap and liquidity events from the DEX contract.

### UI Components

Use `@scaffold-ui/components` for web3 UI:
- `Address` - display ETH addresses with ENS resolution and blockie avatars
- `AddressInput` - input with address validation and ENS resolution
- `Balance` - show ETH balance
- `EtherInput` - number input with ETH/USD toggle

### Styling

Use **DaisyUI** classes for components (cards, buttons, badges, tables). The project uses Tailwind CSS with DaisyUI.

## Architecture Notes

- **Next.js App Router** (not Pages Router) - pages are at `app/<route>/page.tsx`
- **Import alias**: use `~~` for nextjs package imports (e.g., `import { ... } from "~~/hooks/scaffold-eth"`)
- After `yarn deploy`, contract ABIs auto-generate to `packages/nextjs/contracts/deployedContracts.ts`
- Every time you trade Balloons (deposit, exchange), you must first call `approve()` on `Balloons.sol` to authorize the DEX to handle your tokens
- The `init()` section in the deploy script must be uncommented for the DEX to start with liquidity
- In the `DEX` tab, token amounts are auto-converted (amount * 10^18) for user convenience; in `Debug Contracts` tab you must multiply manually

## Testing

The grading tests (`packages/hardhat/test/Challenge.ts`) cover:

- **Init**: Pool initialization with correct reserves
- **Pricing**: `price()` returns correct outputs with 0.3% fee
- **ETH -> Token**: `ethToToken()` swaps correctly, emits events
- **Token -> ETH**: `tokenToEth()` swaps correctly, emits events
- **Deposit**: `deposit()` mints proportional LP shares
- **Withdraw**: `withdraw()` returns proportional assets

Run with `yarn test`. These same tests are used by the SpeedRunEthereum autograder.

## Deployment Checklist (Testnet)

1. Set `defaultNetwork` to `sepolia` in `packages/hardhat/hardhat.config.ts` (or use `--network sepolia`)
2. `yarn generate` to create deployer account
3. Fund deployer with testnet ETH from a faucet
4. `yarn deploy` to deploy contracts
5. Set `targetNetwork` to `chains.sepolia` in `packages/nextjs/scaffold.config.ts`
6. `yarn vercel` to deploy frontend
7. `yarn verify --network sepolia` to verify contracts on Etherscan

## Code Style

| Style | Category |
|-------|----------|
| `UpperCamelCase` | Components, types, interfaces, contracts |
| `lowerCamelCase` | Variables, functions, parameters |
| `CONSTANT_CASE` | Constants, enum values |
| `snake_case` | Hardhat deploy files (e.g., `00_deploy_your_contract.ts`) |

## Key Warnings

- Do NOT use deprecated hook names (`useScaffoldContractRead`, `useScaffoldContractWrite`)
- Contract ABIs in `deployedContracts.ts` are auto-generated - do not edit manually
- Forgetting the 0.3% fee in the price function (using `1000` instead of `997`) will fail tests
- Not requiring `totalLiquidity == 0` in `init()` allows re-initialization
- Integer division rounding, always multiply before dividing
- Tokens require user to `approve` the DEX before any `transferFrom` call (swaps, deposits)
- In `ethToToken()`, use `address(this).balance - msg.value` as the ETH reserve to get the balance *before* the incoming ETH
- LP share calculation in `deposit()` must use the pre-deposit ETH reserve
- Implement `getLiquidity()` getter, the autograder checks for it
