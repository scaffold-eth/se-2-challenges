# AGENTS.md — DEX Challenge

## Challenge Overview

The learner builds a decentralised exchange (DEX) using the **constant product formula** (`x * y = k`). The DEX allows swapping ETH for an ERC-20 token (`Balloons`) and vice versa, plus adding/removing liquidity. Core learning goals are AMM mechanics, liquidity pools, pricing curves, and LP token math.

## Repository Structure

This is a Scaffold-ETH 2 **external extension**. The learner-editable code lives under `extension/`:

```
extension/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   ├── Balloons.sol      # ERC-20 token (provided)
│   │   │   └── DEX.sol           # Decentralised exchange (learner implements)
│   │   ├── deploy/
│   │   │   └── 00_deploy_your_contract.ts
│   │   └── test/
│   │       └── Challenge.ts      # Checkpoint-based test suite
│   └── nextjs/
│       └── app/
│           ├── dex/
│           │   └── page.tsx       # Swap UI
│           └── events/
│               └── page.tsx       # DEX event log
```

## Contracts

### Balloons.sol (Provided — DO NOT EDIT)

- Standard ERC-20 token.
- Mints **1000 tokens** to the deployer in the constructor.

### DEX.sol (Learner Implements)

The main AMM contract. Learner fills in the function bodies.

#### State

- `token` — reference to the Balloons ERC-20.
- `totalLiquidity` — total LP shares outstanding.
- `liquidity[address]` — per-user LP share balance.

#### Events (learner must define)

| Event | Fields |
|---|---|
| `EthToTokenSwap(address swapper, uint256 tokenOutput, uint256 ethInput)` | ETH → token swap |
| `TokenToEthSwap(address swapper, uint256 tokensInput, uint256 ethOutput)` | Token → ETH swap |
| `LiquidityProvided(address provider, uint256 liquidityMinted, uint256 ethInput, uint256 tokenInput)` | Add liquidity |
| `LiquidityRemoved(address provider, uint256 liquidityAmount, uint256 tokenOutput, uint256 ethOutput)` | Remove liquidity |

#### Functions to Implement

1. **`init(uint256 tokens) public payable returns (uint256)`** — Initialise the pool with ETH + tokens. Sets initial liquidity equal to `msg.value`. Can only be called once (when `totalLiquidity == 0`).
2. **`price(uint256 xInput, uint256 xReserves, uint256 yReserves) public pure returns (uint256)`** — Constant product price function with **0.3% fee**: `yOutput = (yReserves * xInput * 997) / (xReserves * 1000 + xInput * 997)`.
3. **`ethToToken() public payable returns (uint256)`** — Swap ETH for tokens using the price function.
4. **`tokenToEth(uint256 tokenInput) public returns (uint256)`** — Swap tokens for ETH using the price function.
5. **`deposit() public payable returns (uint256)`** — Add liquidity proportionally. Mint LP shares based on `msg.value / ethReserve * totalLiquidity`.
6. **`withdraw(uint256 amount) public returns (uint256, uint256)`** — Remove liquidity. Burn LP shares, return proportional ETH and tokens.

#### Key Formula

```
yOutput = (yReserves * xInput * 997) / (xReserves * 1000 + xInput * 997)
```

The `997/1000` factor implements a **0.3% swap fee** that accrues to LPs.

## Deploy Script

- **`00_deploy_your_contract.ts`** — Deploys `Balloons`, then `DEX`, then approves and calls `dex.init()` to seed the pool with initial liquidity (typically 5 ETH + 5 tokens).

## Test Suite (Challenge.ts)

Tests cover:

| Area | What It Verifies |
|---|---|
| **Init** | Pool initialisation with correct reserves |
| **Pricing** | `price()` returns correct outputs with 0.3% fee |
| **ETH → Token** | `ethToToken()` swaps correctly, emits events |
| **Token → ETH** | `tokenToEth()` swaps correctly, emits events |
| **Deposit** | `deposit()` mints proportional LP shares |
| **Withdraw** | `withdraw()` returns proportional assets |

Run tests with:

```bash
cd extension/packages/hardhat
yarn hardhat test
```

## Frontend

- **`dex/page.tsx`** — Swap interface for ETH ↔ Balloons trades, shows reserves, price curve.
- **`events/page.tsx`** — Displays swap and liquidity events.

## Key Concepts

- **Constant Product AMM** — `x * y = k` ensures the pool always has liquidity; larger trades cause more slippage.
- **0.3% Fee** — Applied on every swap via the `997/1000` factor; fees accrue to liquidity providers.
- **Liquidity Shares** — LP tokens represent proportional ownership of the pool; deposit/withdraw must maintain the ratio.
- **Slippage** — Large trades relative to pool size result in worse prices.

## Common Pitfalls

- Forgetting the 0.3% fee in the price function (using `1000` instead of `997`).
- Not requiring `totalLiquidity == 0` in `init()` (allows re-initialisation).
- Integer division rounding — multiply before dividing.
- Not transferring tokens using `transferFrom` (requires user to `approve` the DEX first).
- LP share calculation errors when pool is not empty.

## Commands

| Action | Command |
|---|---|
| Compile contracts | `yarn hardhat compile` |
| Run tests | `yarn hardhat test` |
| Deploy locally | `yarn deploy` |
| Start frontend | `yarn start` |
| Deploy to testnet | `yarn deploy --network sepolia` *(interactive password — cannot be run by agents)* |
| Verify contract | `yarn verify --network sepolia` *(interactive password — cannot be run by agents)* |
| Generate deployer account | `yarn generate` *(interactive password — cannot be run by agents)* |
| View deployer balances | `yarn account` *(interactive password — cannot be run by agents)* |
| Deploy frontend | `yarn vercel` |
| Deploy frontend (prod) | `yarn vercel --prod` |
