# AGENTS.md

## What is SpeedRunEthereum?

[SpeedRunEthereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the SpeedRunEthereum challenges.** It covers **Over-Collateralized Lending**.

## Challenge Overview

The learner builds an over-collateralized lending protocol where users deposit ETH as collateral and borrow an ERC-20 token (Corn) against it. The system enforces a minimum 120% collateral ratio and supports liquidation of under-collateralized positions with a 10% liquidator reward. The goal is to understand DeFi lending mechanics, price oracles, collateral management, and liquidation incentives.

The final deliverable: an app that allows anyone to take out a loan in Corn while making sure it is always backed by its value in ETH. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why Over-Collateralized Lending Matters

Lending is one of the largest sectors in DeFi, with protocols holding tens of billions in deposits. Over-collateralized lending solves a fundamental problem: **how do you lend to anonymous borrowers with no credit scores, no legal recourse, and no identity?** The answer is collateral -- borrowers lock up more value than they borrow, and smart contracts enforce the rules automatically.

Why understanding lending protocols is essential:

- **Aave** and **Compound** are the two largest lending protocols, collectively holding billions in deposits. They use the same core pattern you're building: deposit collateral, borrow against it, get liquidated if your ratio drops. Aave pioneered flash loans -- borrowing without collateral as long as you repay within the same transaction.
- **Liquidation mechanics** are how lending protocols stay solvent. When a borrower's collateral drops below the minimum ratio, anyone can repay the debt and claim the collateral plus a reward. This creates a self-correcting system where economic incentives replace legal enforcement.
- **Price oracles** are the critical dependency. Your challenge uses a DEX as a price feed, but production protocols use Chainlink oracles or TWAP (Time-Weighted Average Price) to prevent manipulation. Oracle failures have caused some of DeFi's largest exploits.
- **Leverage and composability** -- Borrowers can use their loans to buy more collateral (leveraged long), or borrow stablecoins against volatile assets to maintain exposure without selling. Flash loans enable atomic liquidations and arbitrage without upfront capital.

**Key insight**: The 120% collateral ratio with a 10% liquidator reward creates a self-reinforcing safety mechanism. Liquidators are economically motivated to close risky positions before the protocol accumulates bad debt. This game-theoretic design replaces the role of credit officers and legal systems in traditional finance.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with `create-eth`, it produces a monorepo:

```
packages/
  hardhat/
    contracts/
      Corn.sol               # ERC-20 token with owner-only mint
      CornDEX.sol            # Constant product AMM & price oracle
      Lending.sol            # Main lending contract (learner implements)
      MovePrice.sol          # Price manipulation helper for testing
    deploy/
      00_deploy_contracts.ts # Deploys all contracts and seeds liquidity
    test/
      Challenge.ts           # Checkpoint-based grading tests
    scripts/
      marketSimulator.ts     # Bot accounts that simulate market activity
  nextjs/
    app/
      dashboard/
        page.tsx             # Main lending dashboard UI
```

## Common Commands

```bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000

# Redeploy fresh (resets all contracts with new constructor params)
yarn deploy --reset

# Testing
yarn test           # Run all challenge tests

# Market simulation (bots that use your lending platform)
yarn simulate

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

### Corn.sol (Provided)

- ERC-20 token inheriting from OpenZeppelin.
- `mint(address to, uint256 amount)` - **owner-only**; used by the deploy script and Lending contract.
- The Lending contract must be set as an authorized minter (via ownership transfer) so it can mint Corn when users borrow.

### CornDEX.sol (Provided)

- Constant product AMM (x * y = k) for ETH/Corn trading.
- Acts as the **price oracle**: `currentPrice()` returns the current value of ETH in Corn.
- Also used by the MovePrice helper and the frontend to change the CORN price for testing.

### Lending.sol (Learner Implements)

This is the primary contract the learner must complete.

#### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `COLLATERAL_RATIO` | **120** (represents 120%) | Minimum collateral-to-debt ratio |
| `LIQUIDATOR_REWARD` | **10** (represents 10%) | Bonus collateral awarded to liquidators |

#### Custom Errors (provided in skeleton)

- `Lending__InvalidAmount()` - zero or insufficient amount
- `Lending__TransferFailed()` - ETH transfer failed
- `Lending__UnsafePositionRatio()` - position below 120% ratio
- `Lending__NotLiquidatable()` - trying to liquidate a healthy position
- `Lending__InsufficientLiquidatorCorn()` - liquidator doesn't have enough Corn
- `Lending__BorrowingFailed()` - token transfer failed during borrow
- `Lending__RepayingFailed()` - token transfer failed during repay

#### Functions to Implement

1. **`addCollateral() public payable`** - Accept ETH deposit, increase `s_userCollateral[msg.sender]`. Revert if `msg.value == 0`. Emit `CollateralAdded`.
2. **`withdrawCollateral(uint256 amount) public`** - Reduce collateral and send ETH back. Validate position afterwards (skip if no debt). Revert if amount is 0 or exceeds balance. Emit `CollateralWithdrawn`.
3. **`calculateCollateralValue(address user) public view returns (uint256)`** - Return `(s_userCollateral[user] * i_cornDEX.currentPrice()) / 1e18`.
4. **`_calculatePositionRatio(address user) internal view returns (uint256)`** - Return `(collateralValue * 1e18) / borrowedAmount`. Return `type(uint256).max` if debt is zero.
5. **`isLiquidatable(address user) public view returns (bool)`** - Return `true` if `(positionRatio * 100) < COLLATERAL_RATIO * 1e18`.
6. **`_validatePosition(address user) internal view`** - Revert with `Lending__UnsafePositionRatio` if `isLiquidatable(user)` returns true.
7. **`borrowCorn(uint256 borrowAmount) public`** - Add to `s_userBorrowed`, validate position, transfer Corn to user. Emit `AssetBorrowed`.
8. **`repayCorn(uint256 repayAmount) public`** - Subtract from `s_userBorrowed`, pull Corn back via `transferFrom`. Emit `AssetRepaid`.
9. **`liquidate(address user) public`** - Check `isLiquidatable`, verify liquidator has enough Corn, `transferFrom` Corn from liquidator, clear debt, calculate collateral to seize plus 10% reward (capped at user's total collateral), send ETH to liquidator. Emit `Liquidation`.

#### Key Precision Note

All ratio and value calculations use **1e18 fixed-point arithmetic**. Multiply before dividing to avoid precision loss.

### MovePrice.sol (Provided)

- Helper contract used to manipulate the CornDEX price via large swaps.
- The frontend uses + / - buttons to adjust CORN price for testing liquidation scenarios.

## Deploy Script (00_deploy_contracts.ts)

The deploy script performs the following in order:
1. Deploy `Corn` token.
2. Deploy `CornDEX` with the Corn token address.
3. Deploy `Lending` with Corn and CornDEX addresses.
4. Deploy `MovePrice` helper.
5. Mint initial Corn supply and add initial liquidity to the DEX.
6. Transfer Corn ownership to the Lending contract so it can mint Corn for borrowers.

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- `useScaffoldReadContract` - NOT ~~useScaffoldContractRead~~
- `useScaffoldWriteContract` - NOT ~~useScaffoldContractWrite~~
- `useScaffoldEventHistory` - for reading past events
- `useScaffoldContract` - for getting the contract instance directly

### Dashboard (dashboard/page.tsx)

The lending dashboard includes components for:
- Deposit / withdraw ETH collateral
- Borrow / repay Corn
- Swap, approve, and transfer Corn (via CornDEX)
- View all open lending positions
- Visualization of collateral ratios
- CORN price controls (+ / - buttons that move the DEX price)

### UI Components

Use `@scaffold-ui/components` for web3 UI:
- `Address` - display ETH addresses with ENS resolution and blockie avatars
- `Balance` - show ETH balance
- `EtherInput` - number input with ETH/USD toggle

### Styling

Use **DaisyUI** classes for components (cards, buttons, badges, tables). The project uses Tailwind CSS with DaisyUI.

## Architecture Notes

- **Next.js App Router** (not Pages Router) - pages are at `app/<route>/page.tsx`
- **Import alias**: use `~~` for nextjs package imports (e.g., `import { ... } from "~~/hooks/scaffold-eth"`)
- After `yarn deploy`, contract ABIs auto-generate to `packages/nextjs/contracts/deployedContracts.ts`
- `hardhat/console.sol` is available, use `console.log()` in Solidity for debugging (output in `yarn chain` terminal)
- Open a private browser tab to simulate multiple accounts (borrower + liquidator)
- Use the CORN price controls on the frontend to make positions liquidatable for testing
- `yarn simulate` runs bot accounts that interact with your lending platform

## Testing

The grading tests (`packages/hardhat/test/Challenge.ts`) cover:

- **Collateral**: `addCollateral` deposits ETH, `withdrawCollateral` enforces ratio after withdrawal
- **Borrowing**: `borrowCorn` mints tokens, enforces 120% ratio
- **Repayment**: `repayCorn` reduces debt, frees collateral
- **Liquidation**: `liquidate` works when under-collateralized, awards 10% reward, reverts on healthy positions

Run with `yarn test`. These same tests are used by the SpeedRunEthereum autograder.

## Side Quests

### Flash Loans

Implement `IFlashLoanRecipient` interface and a `flashLoan` function on the Lending contract. Create a `FlashLoanLiquidator` contract that liquidates positions without needing Corn upfront.

### Maximum Leverage

Build a `Leverage` contract with iterative borrow-swap-deposit loops to maximize ETH exposure near the 120% limit. Add `getMaxBorrowAmount()` and `getMaxWithdrawableCollateral()` helpers to Lending.

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
| `snake_case` | Hardhat deploy files (e.g., `00_deploy_contracts.ts`) |

## Key Warnings

- Do NOT use deprecated hook names (`useScaffoldContractRead`, `useScaffoldContractWrite`)
- Contract ABIs in `deployedContracts.ts` are auto-generated - do not edit manually
- Forgetting to use 1e18 scaling in ratio calculations causes precision loss
- Must validate position after `withdrawCollateral` and `borrowCorn`, not just before
- Return `type(uint256).max` (not `0`) when debt is zero in `_calculatePositionRatio`
- Do not allow liquidation on healthy positions (ratio >= 120%)
- Corn ownership must be transferred to the Lending contract in the deploy script
- Always approve the Lending contract before calling `repayCorn` (ERC-20 `transferFrom` pattern)
- Use `yarn deploy --reset` (not just `yarn deploy`) to get fresh contracts with correct constructor params
