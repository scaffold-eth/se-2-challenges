# AGENTS.md — Prediction Markets Challenge

## Challenge Overview

The learner builds an AMM-based prediction market where users bet on binary outcomes using ERC-20 outcome tokens. The challenge teaches prediction market mechanics, automated market maker pricing, ERC-20 token interactions, oracle reporting, and liquidity provision.

## Repository Structure

This is a Scaffold-ETH 2 **external extension**. The learner-editable code lives under `extension/`:

```
extension/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   ├── PredictionMarket.sol        # Skeleton — learner implements core logic
│   │   │   └── PredictionMarketToken.sol   # ERC-20 outcome tokens (provided)
│   │   ├── deploy/
│   │   │   └── 00_deploy_your_contract.ts
│   │   └── test/
│   │       └── PredictionMarket.ts         # Tests for Checkpoints 2–9
│   └── nextjs/
│       ├── app/
│       │   ├── liquidity-provider/         # LP management page
│       │   ├── oracle/                     # Oracle reporting page
│       │   └── user/                       # User betting page
│       └── components/
│           ├── race/                       # Race visualisation components
│           ├── liquidity-provider/         # LP UI components
│           ├── oracle/                     # Oracle UI components
│           └── user/                       # User UI components
```

## Contracts

### PredictionMarket.sol (Skeleton — Learner Implements)

The main contract implementing an AMM prediction market.

#### Constructor Parameters

- `liquidityProvider` — address of the LP who seeds the market
- `oracle` — address authorized to report the outcome
- `question` — the market question (e.g., "Will the green car win?")
- `initialTokenValue` — price of each token in ETH (e.g., 0.01 ETH)
- `initialProbability` — starting probability for YES outcome (e.g., 50%)
- `percentageLocked` — percentage of LP liquidity locked until resolution (e.g., 10%)

#### Three Roles

1. **Liquidity Provider (LP)** — Seeds the market with ETH, manages liquidity, resolves market
2. **Oracle** — Reports the true outcome after the event concludes
3. **User** — Buys/sells outcome tokens, redeems winnings

#### Functions to Implement

| Function | Description |
|---|---|
| `addLiquidity()` | LP adds ETH liquidity to the market |
| `removeLiquidity()` | LP removes unlocked liquidity |
| `report(Outcome)` | Oracle reports the final outcome (YES/NO) |
| `resolveMarketAndWithdraw()` | LP resolves market and withdraws remaining funds |
| `buyTokensWithETH(Outcome, uint256)` | User buys YES or NO tokens with ETH |
| `sellTokensForEth(Outcome, uint256)` | User sells tokens back for ETH |
| `redeemWinningTokens(uint256)` | User redeems winning tokens after resolution |
| `getBuyPriceInEth()` | View: returns current buy price for a token |
| `getSellPriceInEth()` | View: returns current sell price for a token |
| `getPrediction()` | View: returns current market prediction (probability) |

The contract uses **custom Solidity errors** for validation (unauthorized access, insufficient funds, invalid state transitions, market not resolved, etc.).

### PredictionMarketToken.sol (Provided)

- ERC-20 token representing YES or NO outcome shares.
- Only the PredictionMarket contract can mint and burn tokens.
- LP tokens cannot be transferred (transfer restrictions enforced).
- Each outcome (YES/NO) has its own token instance.

## Deploy Script

**Initial parameters:**
- Question: `"Will the green car win?"`
- Initial liquidity: `1 ETH`
- Token value: `0.01 ETH`
- Initial probability: `50%`
- Percentage locked: `10%`

## Test Suite (PredictionMarket.ts)

Tests are organized by checkpoints (2–9):

| Checkpoint | Coverage |
|---|---|
| 2 | Constructor initialization and state setup |
| 3 | Token deployment and configuration |
| 4 | Adding and removing liquidity |
| 5 | Oracle reporting the outcome |
| 6 | Market resolution and LP withdrawal |
| 7 | Buy/sell pricing (AMM math) |
| 8 | Buying and selling tokens |
| 9 | Redeeming winning tokens after resolution |

Run tests:

```bash
cd extension/packages/hardhat
npx hardhat test
```

## Frontend

### Pages

1. **`/liquidity-provider`** — LP dashboard to add/remove liquidity and resolve the market
2. **`/oracle`** — Oracle interface to report the outcome
3. **`/user`** — User interface to buy/sell tokens and redeem winnings

### Visualisation

- Race animation with green and red cars representing YES/NO outcome probabilities
- Car positions update in real-time based on market state

## Key Concepts

- **Prediction Markets** — Markets that let participants trade on the probability of future events.
- **AMM Pricing** — Automated market maker determines token prices based on supply/demand.
- **ERC-20 Outcome Tokens** — Fungible tokens representing shares in YES or NO outcomes.
- **Oracle Reporting** — A trusted oracle reports the real-world outcome to the contract.
- **Liquidity Provision** — LP seeds the market with ETH so users can trade; a percentage is locked until resolution.

## Development Tips

- Start by reading the test file to understand expected behavior for each checkpoint.
- Implement functions incrementally, checkpoint by checkpoint.
- Pay attention to custom error messages — tests check for specific reverts.
- The AMM pricing logic is the most math-intensive part; review the formulas carefully.
- Make sure state transitions are correct (e.g., cannot buy after market is resolved).

## Commands

| Action | Command |
|---|---|
| Compile contracts | `yarn hardhat compile` |
| Run tests | `npx hardhat test` |
| Deploy locally | `yarn deploy` |
| Start frontend | `yarn start` |
