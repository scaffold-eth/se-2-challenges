# AGENTS.md — Over-Collateralized Lending Challenge

## Challenge Overview

The learner builds an over-collateralized lending protocol. Users deposit ETH as collateral and borrow an ERC-20 token (Corn) against it. The system enforces a minimum collateral ratio and supports liquidation of under-collateralized positions. Core learning goals are DeFi lending mechanics, price oracles, collateral management, and liquidation incentives.

## Repository Structure

This is a Scaffold-ETH 2 **external extension**. The learner-editable code lives under `extension/`:

```
extension/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   ├── Corn.sol            # ERC-20 token with owner-only mint
│   │   │   ├── CornDEX.sol         # Constant product AMM & price oracle
│   │   │   ├── Lending.sol         # Main lending contract (learner implements)
│   │   │   └── MovePrice.sol       # Price manipulation helper for testing
│   │   ├── deploy/
│   │   │   └── 00_deploy_contracts.ts
│   │   └── test/
│   │       └── Challenge.ts        # Checkpoint-based test suite
│   └── nextjs/
│       └── app/dashboard/
│           └── page.tsx            # Main lending dashboard UI
```

## Contracts

### Corn.sol (Provided)

- ERC-20 token inheriting from OpenZeppelin.
- `mint(address to, uint256 amount)` — **owner-only**; used by the deploy script and Lending contract.
- The Lending contract must be set as an authorised minter so it can mint Corn when users borrow.

### CornDEX.sol (Provided)

- Constant product AMM (x * y = k) for ETH/Corn trading.
- Acts as the **price oracle** — the Lending contract reads the current price from the DEX reserves.
- Functions: `addLiquidity()`, `removeLiquidity()`, `swapETHForCorn()`, `swapCornForETH()`, `getPrice()`.

### Lending.sol (Learner Implements)

This is the primary contract the learner must complete.

#### Constants

| Constant | Value | Purpose |
|---|---|---|
| Collateral Ratio | **120%** (1.2e18) | Minimum collateral-to-debt ratio |
| Liquidator Reward | **10%** (0.1e18) | Bonus collateral awarded to liquidators |

#### Functions to Implement

1. **`addCollateral() external payable`** — Accept ETH deposit, increase the caller's collateral balance.
2. **`withdrawCollateral(uint256 amount) external`** — Allow user to withdraw collateral, but only if their position remains valid (above 120% ratio) after withdrawal.
3. **`calculateCollateralValue(uint256 ethAmount) public view returns (uint256)`** — Convert an ETH amount to its Corn-denominated value using the DEX oracle price.
4. **`_calculatePositionRatio(address user) internal view returns (uint256)`** — Compute the user's collateral ratio: `(collateral value in Corn) * 1e18 / debt`. Returns `type(uint256).max` if debt is zero.
5. **`isLiquidatable(address user) public view returns (bool)`** — Return `true` if the user's position ratio is below the required collateral ratio.
6. **`_validatePosition(address user) internal view`** — Revert if the user's position is under-collateralised (used as a guard in withdraw/borrow).
7. **`borrowCorn(uint256 amount) external`** — Mint Corn to the caller, increase their debt, validate position afterwards.
8. **`repayCorn(uint256 amount) external`** — Accept Corn repayment (burn or transfer), reduce user's debt.
9. **`liquidate(address user) external`** — If the target is liquidatable, repay their debt on behalf, seize their collateral, and award the 10% liquidator reward.

#### Key Precision Note

All ratio and value calculations use **1e18 fixed-point arithmetic**. Multiply before dividing to avoid precision loss.

### MovePrice.sol (Provided)

- Helper contract used in tests to manipulate the CornDEX price.
- Swaps large amounts to move the oracle price, making positions liquidatable for testing purposes.

## Deploy Script (00_deploy_contracts.ts)

The deploy script performs the following in order:
1. Deploy `Corn` token.
2. Deploy `CornDEX` with the Corn token address.
3. Deploy `Lending` with Corn and CornDEX addresses.
4. Deploy `MovePrice` helper.
5. Mint initial Corn supply and add initial liquidity to the DEX.
6. Transfer Corn ownership (or minter role) to the Lending contract.

## Test Suite (Challenge.ts)

Tests cover:

| Area | What It Verifies |
|---|---|
| **Collateral** | `addCollateral` deposits ETH, `withdrawCollateral` enforces ratio |
| **Borrowing** | `borrowCorn` mints tokens, enforces 120% ratio |
| **Repayment** | `repayCorn` reduces debt, frees collateral |
| **Liquidation** | `liquidate` works when under-collateralised, awards 10% reward, reverts on healthy positions |

Run tests with:

```bash
cd extension/packages/hardhat
yarn hardhat test
```

## Frontend

The dashboard (`app/dashboard/page.tsx`) includes components for:

- Deposit / withdraw ETH collateral
- Borrow / repay Corn
- Swap, approve, and transfer Corn
- View all open lending positions
- Visualisation of collateral ratios
- Interact with CornDEX price

## Side Quests

### Flash Loans

Implement `IFlashLoanRecipient` interface to enable flash loans from the Lending contract.

### Maximum Leverage

Build an iterative borrow-swap-deposit loop to maximise leverage near the 120% limit.

## Key Concepts

- **Over-collateralisation** — Borrowers must always maintain collateral worth more than their debt (120% minimum).
- **Liquidation** — When a position drops below 120%, anyone can liquidate it, repaying the debt and receiving the collateral plus a 10% reward.
- **Price Oracle** — The CornDEX reserves determine the ETH/Corn exchange rate used for collateral valuation.
- **1e18 Precision** — All ratios and intermediate calculations use 18-decimal fixed-point math to avoid rounding errors.

## Common Pitfalls

- Forgetting to use 1e18 scaling in ratio calculations.
- Not validating position after withdrawal or borrowing.
- Returning `0` instead of `type(uint256).max` when debt is zero in `_calculatePositionRatio`.
- Allowing liquidation on healthy positions (ratio >= 120%).
- Not transferring Corn ownership to the Lending contract during deployment.

## Commands

| Action | Command |
|---|---|
| Compile contracts | `yarn hardhat compile` |
| Run tests | `yarn hardhat test` |
| Deploy locally | `yarn deploy` |
| Start frontend | `yarn start` |
| Run market simulator | `yarn simulate` |
| Deploy to testnet | `yarn deploy --network sepolia` *(interactive password — cannot be run by agents)* |
| Verify contract | `yarn verify --network sepolia` *(interactive password — cannot be run by agents)* |
| Generate deployer account | `yarn generate` *(interactive password — cannot be run by agents)* |
| View deployer balances | `yarn account` *(interactive password — cannot be run by agents)* |
| Deploy frontend | `yarn vercel` |
| Deploy frontend (prod) | `yarn vercel --prod` |
