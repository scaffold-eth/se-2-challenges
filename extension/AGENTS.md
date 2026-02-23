# AGENTS.md

## What is SpeedRunEthereum?

[SpeedRunEthereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the SpeedRunEthereum challenges.** It covers **Token Vendor**.

## Challenge Overview

The learner builds a decentralized token vending machine: an ERC-20 token (`YourToken`, named "Gold" / "GLD") and a `Vendor` contract that sells and buys back tokens at a fixed exchange rate. The goal is to understand ERC-20 basics, the `approve`/`transferFrom` pattern for token buybacks, and simple access control with `Ownable`.

The final deliverable: an app that lets users purchase ERC-20 tokens, transfer them, and sell them back to the vendor. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why Token Vending Matters

The Token Vendor pattern -- a smart contract that automatically buys and sells tokens at a fixed rate -- is the simplest form of an **automated market maker (AMM)**. Understanding this pattern is fundamental because it introduces the core mechanics that power DeFi's most important protocols.

What you learn building this vendor scales directly to real protocols:

- **Uniswap** started as a simple constant-product AMM -- conceptually, a more sophisticated version of your Vendor that uses a pricing curve instead of a fixed rate. Uniswap processes billions in daily volume with no order books and no intermediaries.
- **The ERC-20 approve pattern** you implement here (`approve` then `transferFrom`) is the universal mechanism for contract-to-contract token transfers across all of DeFi. Every DEX, lending protocol, and yield farm uses it.
- **Ownable withdraw** demonstrates the simplest access control pattern -- only the owner can withdraw ETH. This same concept extends to timelocks, multisigs, and DAO governance in production protocols.
- **Token economics**: By minting a fixed supply and selling through a vendor, you're implementing a simple token distribution mechanism. Real projects use bonding curves, auctions, and airdrops, but the core idea is the same.

**Key insight**: The Vendor is trustless -- users don't need to trust you, they verify the exchange rate in the contract code. Anyone can inspect it, anyone can trade. This is the foundation of DeFi: replacing trusted intermediaries (banks, brokers, exchanges) with transparent, auditable code.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with `create-eth`, it produces a monorepo:

```
packages/
  hardhat/
    contracts/
      YourToken.sol          # ERC-20 token (Gold / GLD)
      Vendor.sol             # Token vending machine
    deploy/
      00_deploy_your_token.ts
      01_deploy_vendor.ts    # Has SEND_TOKENS_TO_VENDOR toggle and FRONTEND_ADDRESS
    test/
      Vendor.ts              # Checkpoint-based grading tests
  nextjs/
    app/
      token-vendor/
        page.tsx             # Main UI (balances, buy/sell tokens)
      events/
        page.tsx             # BuyTokens / SellTokens event log
    utils/scaffold-eth/
      priceInWei.ts          # multiplyTo1e18, getTokenPrice helpers
```

## Common Commands

```bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000

# Redeploy fresh (useful after contract changes)
yarn deploy --reset

# Testing (checkpoint-based)
yarn test                       # Run all challenge tests
yarn test --grep "Checkpoint1"  # Test YourToken minting
yarn test --grep "Checkpoint2"  # Test buyTokens
yarn test --grep "Checkpoint3"  # Test withdraw (onlyOwner)
yarn test --grep "Checkpoint4"  # Test sellTokens (approve + sell flow)

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

### YourToken.sol

- **Standard**: ERC-20 (inherits from OpenZeppelin `ERC20`)
- **Token name/symbol**: "Gold" / "GLD"
- **Solidity version**: `0.8.20` (do **not** change, affects grading)
- **Learner task**: Mint **1000 tokens** (i.e. `1000 * 10**18` base units) to `msg.sender` in the constructor
- Hint: `1000 ether` in Solidity equals `1000 * 10**18`, which works for ERC-20 tokens with 18 decimals

### Vendor.sol

- **Inherits**: `Ownable` from OpenZeppelin
- **Holds**: an immutable reference to `YourToken`
- **Exchange rate**: `tokensPerEth = 100` (learner must define this constant)
- **Solidity version**: `0.8.20` (do **not** change)

#### Custom Errors (learner must define)

| Error | Purpose |
|-------|---------|
| `InvalidEthAmount()` | `buyTokens` called with 0 ETH |
| `InsufficientVendorTokenBalance(uint256 available, uint256 required)` | Vendor does not hold enough tokens to sell |
| `InvalidTokenAmount()` | `sellTokens` called with 0 tokens |
| `InsufficientVendorEthBalance(uint256 available, uint256 required)` | Vendor does not hold enough ETH to pay for bought-back tokens |
| `EthTransferFailed(address to, uint256 amount)` | Low-level ETH transfer failed |

#### Events (learner must define)

| Event | Fields |
|-------|--------|
| `BuyTokens(address indexed buyer, uint256 amountOfETH, uint256 amountOfTokens)` | Emitted in `buyTokens` |
| `SellTokens(address indexed seller, uint256 amountOfTokens, uint256 amountOfETH)` | Emitted in `sellTokens` |

#### Functions to Implement

1. **`buyTokens() external payable`** - Reject 0 ETH, calculate token amount (`msg.value * tokensPerEth`), check vendor balance, transfer tokens to caller, emit `BuyTokens`.
2. **`withdraw() external onlyOwner`** - Send the entire ETH balance of the Vendor to the owner using `call`. Revert with `EthTransferFailed` on failure.
3. **`sellTokens(uint256 amount) external`** - Reject 0 tokens, calculate ETH owed (`amount / tokensPerEth`), check vendor ETH balance, pull tokens from caller via `transferFrom`, send ETH to caller, emit `SellTokens`.

### Key Concept: ERC-20 Approve Pattern

Selling tokens back to the Vendor requires **two** transactions from the user:
1. `yourToken.approve(vendorAddress, amount)` - grants the Vendor permission to spend tokens
2. `vendor.sellTokens(amount)` - Vendor calls `yourToken.transferFrom(msg.sender, address(this), amount)`

## Deploy Scripts

- **`00_deploy_your_token.ts`** - Deploys `YourToken`.
- **`01_deploy_vendor.ts`** - Deploys `Vendor`. Has two toggles:
  - `SEND_TOKENS_TO_VENDOR` - when `true`, transfers 1000 tokens to the Vendor contract
  - `FRONTEND_ADDRESS` - when set, sends tokens to a frontend wallet for testing (only used when `SEND_TOKENS_TO_VENDOR` is `false`)

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- `useScaffoldReadContract` - NOT ~~useScaffoldContractRead~~
- `useScaffoldWriteContract` - NOT ~~useScaffoldContractWrite~~
- `useScaffoldEventHistory` - for reading past events
- `useScaffoldContract` - for getting the contract instance directly

### Main UI (token-vendor/page.tsx)

Displays:
- User's token balance and ETH balance
- Vendor's token balance and ETH balance
- Token transfer form (send tokens to another address)
- Buy tokens section (input ETH amount, preview token amount) - **learner must uncomment**
- Sell tokens section (approve + sell flow) - **learner must uncomment**

### Events Page (events/page.tsx)

Reads `BuyTokens` and `SellTokens` events using `useScaffoldEventHistory`. The `SellTokens` section must be **uncommented** by the learner.

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
- Some UI sections are intentionally commented out, the learner enables them as they implement each checkpoint
- `priceInWei.ts` provides `multiplyTo1e18(amount)` and `getTokenPrice(amount, tokensPerEth)` helper functions

## Testing

The grading tests (`packages/hardhat/test/Vendor.ts`) are organized into four checkpoints:

- **Checkpoint 1**: `YourToken` mints exactly 1000 tokens to the deployer
- **Checkpoint 2**: `buyTokens` works correctly: sends ETH, receives tokens, emits `BuyTokens`
- **Checkpoint 3**: `withdraw` is `onlyOwner`: non-owner reverts, owner receives ETH
- **Checkpoint 4**: `sellTokens` works: approve + sell flow, emits `SellTokens`, handles errors

Run with `yarn test` for all or `yarn test --grep "CheckpointN"` for specific checkpoints. These same tests are used by the SpeedRunEthereum autograder.

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
| `snake_case` | Hardhat deploy files (e.g., `00_deploy_your_token.ts`) |

## Key Warnings

- Do NOT use deprecated hook names (`useScaffoldContractRead`, `useScaffoldContractWrite`)
- Contract ABIs in `deployedContracts.ts` are auto-generated - do not edit manually
- Solidity version must stay `0.8.20`, do not change it
- Tests check for custom errors and events by name, define them exactly as specified
- Integer division truncation: use `amount / tokensPerEth` (not the other way around) when computing ETH from tokens
- Use `transfer` for `buyTokens` (Vendor sends its own tokens) but `transferFrom` for `sellTokens` (Vendor pulls user's tokens)
- The `SEND_TOKENS_TO_VENDOR` toggle in the deploy script must be `true` for Checkpoints 2–4
- Prefer `call` over `transfer` for sending ETH (avoids gas limit issues)
