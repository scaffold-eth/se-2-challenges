# AGENTS.md

## Challenge Overview

This is a SpeedRunEthereum challenge. The learner builds an AMM-based prediction market where users bet on binary outcomes (e.g., "Will the green car win the race?") using ERC-20 outcome tokens. The challenge teaches prediction market mechanics, automated market maker pricing, ERC-20 token interactions, oracle reporting, and liquidity provision. The learner takes on three roles: Liquidity Provider, Oracle, and User.

The final deliverable: an app that allows users to buy/sell outcome tokens, with an oracle to settle the result and a liquidity provider to seed the market. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with `create-eth`, it produces a monorepo:

```
packages/
  hardhat/
    contracts/
      PredictionMarket.sol        # Main contract skeleton (learner implements)
      PredictionMarketToken.sol   # ERC-20 outcome tokens (provided — DO NOT EDIT)
    deploy/
      00_deploy_your_contract.ts  # Deploys PredictionMarket with initial params
    test/
      PredictionMarket.ts         # Checkpoint-based grading tests (Checkpoints 2–9)
  nextjs/
    app/
      liquidity-provider/
        page.tsx                  # LP management page
      oracle/
        page.tsx                  # Oracle reporting page
      user/
        page.tsx                  # User betting page (buy/sell/redeem)
```

## Common Commands

```bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000

# Redeploy fresh
yarn deploy --reset

# Testing (checkpoint-based)
yarn test                       # Run all challenge tests
yarn test --grep "Checkpoint2"  # Test constructor + state variables
yarn test --grep "Checkpoint3"  # Test token deployment + minting
yarn test --grep "Checkpoint4"  # Test add/remove liquidity
yarn test --grep "Checkpoint5"  # Test oracle reporting
yarn test --grep "Checkpoint6"  # Test market resolution + LP withdrawal
yarn test --grep "Checkpoint7"  # Test pricing/probability calculations
yarn test --grep "Checkpoint8"  # Test buy/sell tokens
yarn test --grep "Checkpoint9"  # Test redeeming winning tokens

# Code quality
yarn lint           # Lint both packages
yarn format         # Format both packages

# Deploy to testnet (requires interactive password prompt — cannot be run by agents)
yarn deploy --network sepolia

# Contract verification (requires interactive password prompt — cannot be run by agents)
yarn verify --network sepolia

# Account management (requires interactive password prompt — cannot be run by agents)
yarn generate       # Generate deployer account (encrypted private key)
yarn account        # View deployer account balances

# Frontend deployment
yarn vercel         # Deploy frontend to Vercel
yarn vercel --prod  # Redeploy to production URL
```

## Smart Contracts

### PredictionMarket.sol (Skeleton — Learner Implements)

The main contract implementing an AMM prediction market.

#### Constructor Parameters

| Parameter | Purpose |
|-----------|---------|
| `_liquidity_provider` | Owner address (passed into `Ownable`) |
| `_oracle` | Address authorized to report the outcome |
| `_question` | The prediction question (e.g., "Will the green car win?") |
| `_initialTokenValue` | ETH value a winning token pays out (e.g., 0.01 ETH) |
| `_initialYesProbability` | Starting YES probability (e.g., 50 for 50%) |
| `_percentageToLock` | Percentage of tokens locked to simulate initial probability |

#### Three Roles

1. **Liquidity Provider (LP)** — Seeds the market with ETH, manages liquidity, resolves market
2. **Oracle** — Reports the true outcome after the event concludes
3. **User** — Buys/sells outcome tokens, redeems winnings

#### State Variables

- `i_oracle`, `i_initialTokenValue`, `i_percentageLocked`, `i_initialYesProbability` — immutable config
- `i_yesToken`, `i_noToken` — the two ERC-20 outcome token contracts
- `s_question` — the market question
- `s_ethCollateral` — total ETH backing the tokens (prize pool)
- `s_lpTradingRevenue` — fees earned from trading
- `s_winningToken` — set after oracle reports
- `s_isReported` — whether the outcome has been reported

#### Functions to Implement (by Checkpoint)

| Checkpoint | Function | Description |
|------------|----------|-------------|
| 2 | Constructor | Initialize state, validate params, store ETH collateral |
| 3 | Constructor (cont.) | Deploy YES/NO token contracts, mint tokens, lock initial tokens to simulate probability |
| 4 | `addLiquidity()` | LP adds ETH, mints proportional YES/NO tokens |
| 4 | `removeLiquidity(uint256)` | LP removes ETH, burns proportional tokens |
| 5 | `report(Outcome)` | Oracle reports final outcome (YES/NO), sets `s_winningToken` |
| 6 | `resolveMarketAndWithdraw()` | LP resolves market, burns winning tokens, withdraws ETH + trading revenue |
| 7 | `getBuyPriceInEth()` / `getSellPriceInEth()` | Calculate token prices using average probability |
| 7 | `_calculatePriceInEth()` / `_getCurrentReserves()` / `_calculateProbability()` | Internal pricing helpers |
| 8 | `buyTokensWithETH(Outcome, uint256)` | User buys YES/NO tokens with exact ETH |
| 8 | `sellTokensForEth(Outcome, uint256)` | User sells tokens back for ETH |
| 9 | `redeemWinningTokens(uint256)` | User redeems winning tokens for ETH after resolution |

#### Pricing Formula

```
price = initialTokenValue * probabilityAvg * tradingAmount
```

- `probabilityAvg = (probabilityBefore + probabilityAfter) / 2`
- Probability = `tokensSold / totalTokensSold` (for the chosen outcome)
- YES + NO token prices always sum to `initialTokenValue`

#### Modifiers

- `predictionNotReported` — prevents actions after outcome is reported (used on buy/sell/addLiquidity/removeLiquidity)
- `predictionReported` — requires outcome to be reported (used on resolve/redeem)
- `notOwner` — prevents LP from buying/selling tokens
- `amountGreaterThanZero` — validates non-zero amounts

### PredictionMarketToken.sol (Provided — DO NOT EDIT)

- ERC-20 token representing YES or NO outcome shares.
- Only the PredictionMarket contract can mint and burn tokens.
- LP tokens cannot be transferred (transfer restrictions enforced for market owner).

## Deploy Script

**Initial parameters:**
- Question: `"Will the green car win?"`
- Initial liquidity: `1 ETH`
- Token value: `0.01 ETH`
- Initial probability: `50%`
- Percentage locked: `10%`

The oracle address is set to the same as the LP by default for easier testing.

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- `useScaffoldReadContract` - NOT ~~useScaffoldContractRead~~
- `useScaffoldWriteContract` - NOT ~~useScaffoldContractWrite~~
- `useScaffoldEventHistory` - for reading past events
- `useScaffoldContract` - for getting the contract instance directly

### Pages

1. **`/liquidity-provider`** — LP dashboard to add/remove liquidity, view market state, resolve market and withdraw
2. **`/oracle`** — Oracle interface to report the outcome (YES or NO)
3. **`/user`** — User interface to buy/sell tokens and redeem winnings

### Race Visualization

- Race animation with green and red cars representing YES/NO outcome probabilities
- Car positions update in real-time based on market state

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
- The `getPrediction()` function has sections that must be **uncommented** after Checkpoints 3 and 5
- Make sure you're connected with the correct oracle address when reporting (check deploy script)
- Use a different account than the LP when buying/selling tokens (LP is restricted from trading)
- The `PRECISION` constant (1e18) is used throughout for fixed-point math

## Testing

The grading tests (`packages/hardhat/test/PredictionMarket.ts`) are organized by checkpoints:

- **Checkpoint 2**: Constructor initialization and state setup
- **Checkpoint 3**: Token deployment and configuration
- **Checkpoint 4**: Adding and removing liquidity
- **Checkpoint 5**: Oracle reporting the outcome
- **Checkpoint 6**: Market resolution and LP withdrawal
- **Checkpoint 7**: Buy/sell pricing (AMM math)
- **Checkpoint 8**: Buying and selling tokens
- **Checkpoint 9**: Redeeming winning tokens after resolution

Run with `yarn test` for all or `yarn test --grep "CheckpointN"` for specific checkpoints. These same tests are used by the SpeedRunEthereum autograder.

## Deployment Checklist (Testnet)

1. Adjust ETH amounts in `00_deploy_your_contract.ts` (default: 1 ETH initial liquidity, 0.01 ETH token value)
2. Set `defaultNetwork` to `sepolia` in `packages/hardhat/hardhat.config.ts` (or use `--network sepolia`)
3. `yarn generate` to create deployer account
4. Fund deployer with testnet ETH from a faucet
5. `yarn deploy` to deploy contracts
6. Set `targetNetwork` to `chains.sepolia` in `packages/nextjs/scaffold.config.ts`
7. `yarn vercel` to deploy frontend
8. `yarn verify --network sepolia` to verify contracts on Etherscan

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
- Tests check for specific custom errors — use the exact error names from the contract's error section
- The LP (market owner) cannot buy or sell tokens — use a different account for testing trades
- Uncomment `getPrediction()` sections after Checkpoints 3 and 5 or the frontend won't show data
- When using an `enum` as a function parameter, invalid values cause an immediate revert (no custom error possible)
- `i_<variableName>` indicates immutable; `s_<variableName>` indicates mutable state
- Implement functions incrementally, checkpoint by checkpoint — each builds on the previous
- Before deploying to testnet, reduce the initial ETH amount in the deploy script to match your budget
