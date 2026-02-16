# AGENTS.md — Token Vendor Challenge

## Challenge Overview

The learner builds a token vending machine: an ERC-20 token (`YourToken`) and a `Vendor` contract that sells and buys back tokens at a fixed exchange rate. The core learning goals are ERC-20 basics, the approve/transferFrom pattern, and simple access control.

## Repository Structure

This is a Scaffold-ETH 2 **external extension**. The learner-editable code lives under `extension/`:

```
extension/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   ├── YourToken.sol      # ERC-20 token (Gold / GLD)
│   │   │   └── Vendor.sol         # Token vending machine
│   │   ├── deploy/
│   │   │   ├── 00_deploy_your_token.ts
│   │   │   └── 01_deploy_vendor.ts
│   │   └── test/
│   │       └── Vendor.ts          # Checkpoint-based test suite
│   └── nextjs/
│       ├── app/token-vendor/
│       │   └── page.tsx            # Main UI (balances, buy/sell)
│       ├── app/events/
│       │   └── page.tsx            # BuyTokens / SellTokens event log
│       └── utils/scaffold-eth/
│           └── priceInWei.ts       # multiplyTo1e18, getTokenPrice helpers
```

## Contracts

### YourToken.sol

- Inherits `ERC20` from OpenZeppelin.
- Token name: **Gold**, symbol: **GLD**.
- Solidity version: `0.8.20` (do **not** change — affects grading).
- **Learner task:** Mint **1000 tokens** (i.e. `1000 * 10**18` base units) to `msg.sender` inside the constructor.

### Vendor.sol

- Inherits `Ownable` from OpenZeppelin.
- Holds an immutable reference to `YourToken`.
- **Exchange rate:** `tokensPerEth = 100` (learner must define this constant).
- Solidity version: `0.8.20` (do **not** change).

#### Custom Errors (learner must define)

| Error | Purpose |
|---|---|
| `InvalidEthAmount()` | `buyTokens` called with 0 ETH |
| `InsufficientVendorTokenBalance()` | Vendor does not hold enough tokens to sell |
| `InsufficientVendorEthBalance()` | Vendor does not hold enough ETH to pay for bought-back tokens |
| `InvalidTokenAmount()` | `sellTokens` called with 0 tokens |
| `EthTransferFailed()` | Low-level ETH transfer to seller failed |

#### Events (learner must define)

| Event | Fields |
|---|---|
| `BuyTokens(address buyer, uint256 amountOfEth, uint256 amountOfTokens)` | Emitted in `buyTokens` |
| `SellTokens(address seller, uint256 amountOfTokens, uint256 amountOfEth)` | Emitted in `sellTokens` |

#### Functions to Implement

1. **`buyTokens() external payable`** — Accept ETH, calculate token amount (`msg.value * tokensPerEth`), validate, transfer tokens to caller, emit `BuyTokens`.
2. **`withdraw() public onlyOwner`** — Send the entire ETH balance of the Vendor to the owner.
3. **`sellTokens(uint256 amount) public`** — Accept tokens back from the caller, calculate ETH owed (`amount / tokensPerEth`), validate, transfer tokens from caller to Vendor, send ETH to caller, emit `SellTokens`. Requires the caller to have called `yourToken.approve(vendorAddress, amount)` first.

### Key Concept: ERC-20 Approve Pattern

Selling tokens back to the Vendor requires two transactions from the user:
1. `yourToken.approve(vendorAddress, amount)` — grants the Vendor permission.
2. `vendor.sellTokens(amount)` — Vendor calls `yourToken.transferFrom(msg.sender, address(this), amount)`.

## Deploy Scripts

- **`00_deploy_your_token.ts`** — Deploys `YourToken`.
- **`01_deploy_vendor.ts`** — Deploys `Vendor`, optionally transfers 1000 tokens to the Vendor (controlled by `SEND_TOKENS_TO_VENDOR` toggle), and optionally sends tokens to a `FRONTEND_ADDRESS` for testing.

## Test Suite (Vendor.ts)

Tests are organised into four checkpoints:

| Checkpoint | What It Verifies |
|---|---|
| **1** | `YourToken` mints exactly 1000 tokens to deployer |
| **2** | `buyTokens` works correctly — sends ETH, receives tokens, emits `BuyTokens` |
| **3** | `withdraw` is `onlyOwner` — non-owner reverts, owner receives ETH |
| **4** | `sellTokens` works — approve + sell flow, emits `SellTokens`, handles errors |

Run tests with:

```bash
cd extension/packages/hardhat
yarn hardhat test
```

## Frontend

- **`token-vendor/page.tsx`** — Shows user & vendor token balances, a token transfer form, and buy/sell token sections (some parts are commented out for the learner to enable).
- **`events/page.tsx`** — Displays `BuyTokens` and `SellTokens` contract events.
- **`utils/scaffold-eth/priceInWei.ts`** — Helpers: `multiplyTo1e18(amount)` converts a human-readable number to wei-scale, `getTokenPrice(amount, tokensPerEth)` returns the ETH price for a given token amount.

## Common Pitfalls

- Forgetting to mint tokens in the `YourToken` constructor.
- Using `transfer` instead of `transferFrom` in `sellTokens`.
- Not defining custom errors or events (tests check for them by name).
- Changing the Solidity version from `0.8.20`.
- Integer division truncation when computing ETH from tokens — use `amount / tokensPerEth`, not the other way around.

## Commands

| Action | Command |
|---|---|
| Compile contracts | `yarn hardhat compile` |
| Run tests | `yarn hardhat test` |
| Deploy locally | `yarn deploy` |
| Start frontend | `yarn start` |
