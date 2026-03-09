# AGENTS.md

## What is SpeedRunEthereum?

[SpeedRunEthereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the SpeedRunEthereum challenges.** It covers **Stablecoins**.

## Challenge Overview

The learner builds a decentralized stablecoin engine: an ETH-collateralized stablecoin (`MyUSD`) that maintains a $1 USD peg through over-collateralization, interest rate mechanics, and liquidation. The system includes a `MyUSDEngine` (the core contract the learner implements), a `DEX` for swapping, an `Oracle` for price feeds, a `MyUSDStaking` contract for earning yield, and a `RateController` for peg maintenance.

The final deliverable: an app with a dashboard that lets users deposit ETH as collateral, mint MyUSD, stake for yield, and liquidate unsafe positions. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why Stablecoins Matter

Stablecoins are the backbone of DeFi -- they provide a stable unit of account that enables lending, trading, and payments without the volatility of raw crypto assets. Understanding how they maintain their peg is essential to understanding decentralized finance.

Real-world examples of the concepts in this challenge:

- **MakerDAO / DAI** -- The original crypto-backed stablecoin. Users lock ETH (and other assets) as collateral and mint DAI against it at a minimum 150% collateralization ratio. This challenge's MyUSD engine is directly inspired by single-collateral DAI's design.
- **Liquity / LUSD** -- A governance-free, immutable stablecoin protocol with a 110% collateralization ratio and instant liquidations. Demonstrates how different collateral ratios trade off capital efficiency vs. safety.
- **Aave and Compound** -- Lending protocols that use share-based accounting (similar to this challenge's debt shares and staking shares) to track interest accrual efficiently across thousands of users without iterating over each position.
- **Ethena / USDe** -- A newer stablecoin that uses delta-neutral hedging instead of over-collateralization, showing that there are multiple architectural approaches to maintaining a peg.
- **MakerDAO's DSR (DAI Savings Rate)** -- Exactly the pattern implemented in this challenge's `MyUSDStaking` contract. The savings rate creates buy pressure for the stablecoin, while the borrow rate creates sell pressure resistance. Together they form a monetary policy toolkit for peg maintenance.

**Key insight**: A crypto-backed stablecoin's peg is maintained through economic incentives. The borrow rate makes having a debt position expensive (which encourages people to repay their debt - reducing the supply) while the savings rate makes holding attractive (reducing sell pressure). Liquidation ensures the system always remains solvent. This challenge teaches you to build all three mechanisms.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with `create-eth`, it produces a monorepo:

```
packages/
  hardhat/
    contracts/
      MyUSDEngine.sol        # Core stablecoin engine (LEARNER IMPLEMENTS)
      MyUSD.sol              # ERC-20 stablecoin token (provided)
      DEX.sol                # Constant-product AMM for ETH/MyUSD (provided)
      Oracle.sol             # Price feed from DEX (provided)
      MyUSDStaking.sol       # Share-based staking for yield (provided)
      RateController.sol     # Proxy for setting borrow/savings rates (provided)
    deploy/
      00_deploy_contracts.ts # Single deploy script with nonce-based address prediction
    test/
      MyUSDEngine.ts         # Checkpoint-based grading tests
    scripts/
      fetchPriceFromUniswap.ts     # Fetches real ETH/DAI price from Uniswap V2 mainnet
      interestRateController.ts    # Automated rate controller for peg maintenance
      marketSimulator.ts           # Terminal UI simulating borrowers and stakers
  nextjs/
    app/
      dashboard/
        page.tsx             # Main dashboard page
      _components/
        CollateralOperations.tsx   # Add/withdraw ETH collateral (side panel)
        MintOperations.tsx         # Mint MyUSD / repay debt (side panel)
        StakeOperations.tsx        # Stake/withdraw MyUSD (side panel)
        SideButtons.tsx            # Hover-activated side panel buttons
        RateControls.tsx           # Edit borrow and savings rates
        PriceGraph.tsx             # MyUSD price chart (Recharts)
        SupplyGraph.tsx            # Total and staked supply chart
        UserPositionsTable.tsx     # All user positions with liquidation buttons
        UserPosition.tsx           # Individual position row
        StakersTable.tsx           # All stakers and their staked amounts
        TokenActions.tsx           # MyUSD wallet widget (balance, price, send/swap)
        RatioChange.tsx            # Position ratio change preview
        TooltipInfo.tsx            # Info tooltip component
        Modals/
          TokenSwapModal.tsx       # Swap MyUSD <-> ETH via DEX
          TokenTransferModal.tsx   # Send MyUSD to another address
    utils/
      constant.ts            # tokenName = "MyUSD", collateralRatio = 150
      helpers.ts             # getRatioColorClass(), calculatePositionRatio(), formatDisplayValue()
```

## Common Commands

```bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000

# Redeploy fresh (useful after contract changes)
yarn deploy --reset

# Testing
yarn test           # Run all challenge tests

# Simulation scripts (run after yarn chain + yarn deploy)
yarn simulate                  # Launch market simulator with terminal UI
yarn interest-rate-controller  # Launch automated rate controller

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

### MyUSDEngine.sol (Learner Implements)

The core stablecoin engine. Inherits `Ownable`. All function bodies are empty -- the learner must implement them across checkpoints 2-7.

- **Solidity version**: `^0.8.20` (do **not** change, affects grading)
- **Imports**: `Ownable`, `MyUSD`, `Oracle`, `MyUSDStaking`

#### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `COLLATERAL_RATIO` | `150` | 150% over-collateralization required |
| `LIQUIDATOR_REWARD` | `10` | 10% bonus collateral for liquidators |
| `SECONDS_PER_YEAR` | `365 days` | Used for interest calculation |
| `PRECISION` | `1e18` | Fixed-point math precision |

#### State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `i_myUSD` | `MyUSD` | Reference to the stablecoin token |
| `i_oracle` | `Oracle` | Reference to the price oracle |
| `i_staking` | `MyUSDStaking` | Reference to the staking contract |
| `i_rateController` | `address` | Address authorized to change borrow rate |
| `borrowRate` | `uint256` | Annual interest rate in basis points (1% = 100) |
| `totalDebtShares` | `uint256` | Total debt shares across all borrowers |
| `debtExchangeRate` | `uint256` | Exchange rate between shares and MyUSD (1e18 precision) |
| `lastUpdateTime` | `uint256` | Timestamp of last interest accrual |
| `s_userCollateral` | `mapping(address => uint256)` | User's ETH collateral in wei |
| `s_userDebtShares` | `mapping(address => uint256)` | User's debt shares |

#### Custom Errors (pre-defined, do not modify)

| Error | Purpose |
|-------|---------|
| `Engine__InvalidAmount()` | Zero amount operations |
| `Engine__UnsafePositionRatio()` | Position below 150% collateralization |
| `Engine__NotLiquidatable()` | Attempting to liquidate a safe position |
| `Engine__InvalidBorrowRate()` | Borrow rate set below savings rate |
| `Engine__NotRateController()` | Non-rate-controller calling `setBorrowRate` |
| `Engine__InsufficientCollateral()` | Withdrawing more collateral than deposited |
| `Engine__TransferFailed()` | ETH transfer failed |

#### Events (pre-defined, do not modify)

| Event | Fields |
|-------|--------|
| `CollateralAdded(address indexed user, uint256 indexed amount, uint256 price)` | Emitted when collateral deposited |
| `CollateralWithdrawn(address indexed withdrawer, uint256 indexed amount, uint256 price)` | Emitted when collateral withdrawn |
| `BorrowRateUpdated(uint256 newRate)` | Emitted when borrow rate changes |
| `DebtSharesMinted(address indexed user, uint256 amount, uint256 shares)` | Emitted when MyUSD minted |
| `DebtSharesBurned(address indexed user, uint256 amount, uint256 shares)` | Emitted when debt repaid |
| `Liquidation(address indexed user, address indexed liquidator, uint256 amountForLiquidator, uint256 liquidatedUserDebt, uint256 price)` | Emitted on liquidation |

#### Functions to Implement (by Checkpoint)

**Checkpoint 2 -- Depositing Collateral & Understanding Value:**
1. **`addCollateral() public payable`** -- Accept ETH, update `s_userCollateral[msg.sender]`, emit `CollateralAdded` with the current oracle price.
2. **`calculateCollateralValue(address user) public view returns (uint256)`** -- Return the USD value of the user's ETH collateral using `i_oracle.getETHMyUSDPrice()`.

**Checkpoint 3 -- Interest Calculation System (share-based debt tracking):**
3. **`_getCurrentExchangeRate() internal view returns (uint256)`** -- Calculate the current debt exchange rate including accrued interest since `lastUpdateTime`. Uses `borrowRate`, `SECONDS_PER_YEAR`, and `PRECISION`.
4. **`_accrueInterest() internal`** -- Update `debtExchangeRate` to `_getCurrentExchangeRate()` and set `lastUpdateTime` to `block.timestamp`.
5. **`_getMyUSDToShares(uint256 amount) internal view returns (uint256)`** -- Convert a MyUSD amount to debt shares using the current exchange rate.

**Checkpoint 4 -- Minting MyUSD & Position Health:**
6. **`getCurrentDebtValue(address user) public view returns (uint256)`** -- Calculate total debt including accrued interest. Uses `s_userDebtShares[user]` and `_getCurrentExchangeRate()`.
7. **`calculatePositionRatio(address user) public view returns (uint256)`** -- Return `(collateralValue * 100) / debtValue`. Returns `type(uint256).max` if no debt.
8. **`_validatePosition(address user) internal view`** -- Revert with `Engine__UnsafePositionRatio` if position ratio < `COLLATERAL_RATIO`.
9. **`mintMyUSD(uint256 mintAmount) public`** -- Accrue interest, convert amount to shares, update `s_userDebtShares` and `totalDebtShares`, mint tokens via `i_myUSD.mintTo()`, validate position, emit `DebtSharesMinted`.

**Checkpoint 5 -- Accruing Interest & Managing Borrow Rates:**
10. **`setBorrowRate(uint256 newRate) external onlyRateController`** -- Accrue interest, validate `newRate >= i_staking.savingsRate()` (revert with `Engine__InvalidBorrowRate` if not), update `borrowRate`, emit `BorrowRateUpdated`.

**Checkpoint 6 -- Repaying Debt & Withdrawing Collateral:**
11. **`repayUpTo(uint256 amount) public`** -- Accrue interest, handle overpayment gracefully (cap at actual debt), convert to shares, burn tokens via `i_myUSD.burnFrom()`, update shares, emit `DebtSharesBurned`.
12. **`withdrawCollateral(uint256 amount) external`** -- Validate sufficient collateral (revert with `Engine__InsufficientCollateral`), reduce `s_userCollateral`, validate position still safe, transfer ETH, emit `CollateralWithdrawn`.

**Checkpoint 7 -- Liquidation:**
13. **`isLiquidatable(address user) public view returns (bool)`** -- Return `true` if position ratio < `COLLATERAL_RATIO` and user has debt.
14. **`liquidate(address user) external`** -- Verify position is liquidatable (revert with `Engine__NotLiquidatable`), accrue interest, calculate debt value, burn liquidator's tokens to cover debt, calculate collateral to seize (debt value + `LIQUIDATOR_REWARD`%), transfer collateral to liquidator, clear user's debt shares and collateral, emit `Liquidation`.

### MyUSD.sol (Provided, DO NOT EDIT)

- **Standard**: ERC-20 (inherits `ERC20`, `ERC20Burnable`, `Ownable`)
- **Token name/symbol**: "MyUSD" / "MyUSD"
- **`mintTo(address, uint256)`** -- Only callable by the engine contract
- **`burnFrom(address, uint256)`** -- Only callable by the engine contract
- **Virtual balances**: Overrides `balanceOf()`, `_update()`, and `totalSupply()` so transfers to/from the staking contract result in mints/burns (staked value is tracked via shares, not actual token balance)

### DEX.sol (Provided, DO NOT EDIT)

Simple constant-product AMM for ETH/MyUSD swaps (no fee):
- **`init(uint256 tokens) payable`** -- Initialize with liquidity
- **`swap(uint256 inputAmount) payable`** -- Swap ETH for MyUSD (send ETH) or MyUSD for ETH (send token amount)
- **`deposit() payable`** / **`withdraw(uint256)`** -- LP operations
- **`price(uint256, uint256, uint256)`** -- `x * y / (x_reserve + x)` pricing
- **`currentPrice()`** -- Current ETH price in MyUSD
- Emits `PriceUpdated` after every swap and init

### Oracle.sol (Provided, DO NOT EDIT)

- **`getETHMyUSDPrice()`** -- Returns price from DEX (or `defaultPrice` if no liquidity)
- **`getETHUSDPrice()`** -- Returns fixed `defaultPrice` (set at deploy from Uniswap mainnet fork)

### MyUSDStaking.sol (Provided, DO NOT EDIT)

Share-based staking system (same exchange rate pattern as the engine's debt tracking):
- **`stake(uint256 amount)`** -- Stake MyUSD, receive shares proportional to current exchange rate
- **`withdraw()`** -- Withdraw all staked MyUSD + accrued interest
- **`setSavingsRate(uint256 newRate) onlyRateController`** -- Must be `<= engine.borrowRate()`
- **`getBalance(address)`** / **`getSharesValue(uint256)`** -- View functions for current value
- Interest accrues via `_accrueInterest()` updating `exchangeRate`

### RateController.sol (Provided, DO NOT EDIT)

Proxy contract that anyone can call to set rates:
- **`setBorrowRate(uint256 newRate)`** -- Calls `engine.setBorrowRate()`, reverts if invalid
- **`setSavingsRate(uint256 newRate)`** -- Calls `staking.setSavingsRate()`, reverts if invalid

## Deploy Script

**`00_deploy_contracts.ts`** -- Single deploy script that handles all 6 contracts.

Uses nonce-based address prediction (`ethers.getCreateAddress`) to solve circular dependencies:
- RateController needs engine + staking addresses
- MyUSD needs engine + staking addresses
- MyUSDStaking needs engine address
- MyUSDEngine needs all other addresses

Deploy order: RateController -> MyUSD -> DEX -> Oracle -> MyUSDStaking -> MyUSDEngine

On localhost: sets deployer balance to a large amount, deposits ETH collateral, mints MyUSD, and initializes the DEX with liquidity so the system is ready to use immediately.

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- `useScaffoldReadContract` -- NOT ~~useScaffoldContractRead~~
- `useScaffoldWriteContract` -- NOT ~~useScaffoldContractWrite~~
- `useScaffoldEventHistory` -- for reading past events
- `useScaffoldContract` -- for getting the contract instance directly

### Dashboard (dashboard/page.tsx)

Single-page dashboard layout with:
- **RateControls** -- Input fields to set borrow rate and savings rate via `RateController`
- **PriceGraph** -- Line chart (Recharts) showing MyUSD price over time from DEX `PriceUpdated` events
- **SupplyGraph** -- Tracks total and staked MyUSD supply over time
- **UserPositionsTable** -- Lists all users with collateral, debt, position ratio, and liquidation buttons
- **StakersTable** -- Shows all stakers and their staked amounts
- **TokenActions** -- Fixed wallet widget showing MyUSD balance and price, with send/swap buttons
- **SideButtons** -- Hover-activated side panel with 3 operation panels:
  - **CollateralOperations** -- Add/withdraw ETH collateral
  - **MintOperations** -- Mint MyUSD / repay debt with ratio preview
  - **StakeOperations** -- Stake/withdraw MyUSD

### Modals

- **TokenSwapModal** -- Swap MyUSD <-> ETH via DEX contract
- **TokenTransferModal** -- Send MyUSD to another address

### UI & Styling

- Use `@scaffold-ui/components` for web3 UI (`Address`, `AddressInput`, `Balance`, `EtherInput`)
- Use **DaisyUI** classes for components (cards, buttons, badges, tables) with Tailwind CSS
- Custom teal/cyan theme with Space Grotesk font

## Architecture Notes

- **Next.js App Router** (not Pages Router) -- pages are at `app/<route>/page.tsx`
- **Import alias**: use `~~` for nextjs package imports (e.g., `import { ... } from "~~/hooks/scaffold-eth"`)
- After `yarn deploy`, contract ABIs auto-generate to `packages/nextjs/contracts/deployedContracts.ts`
- **Share-based accounting**: Both the engine (debt) and staking contract use exchange rates to track interest without iterating over users. Shares represent a proportional claim on an ever-growing pool.
- **Virtual balances**: MyUSD overrides `_update()` so transfers to/from the staking contract result in mints/burns rather than actual transfers. The staking contract's "balance" is computed from its total shares.
- **Rate controller as peg mechanism**: Borrow rate creates sell pressure resistance (expensive to mint). Savings rate creates buy pressure (attractive to hold). The constraint `borrowRate >= savingsRate` ensures the system remains sustainable.
- **Nonce-based address prediction**: The deploy script pre-calculates contract addresses using `getCreateAddress` with future nonces to resolve circular dependencies between contracts.
- **Simulation scripts**: `yarn simulate` launches a terminal UI (blessed/blessed-contrib) with 5 simulated borrowers and 5 stakers performing leveraged borrowing and yield farming. `yarn interest-rate-controller` runs an automated binary-search algorithm to find optimal rates for peg maintenance.

## Testing

The grading tests (`packages/hardhat/test/MyUSDEngine.ts`) cover the following areas:

- **Deployment** -- Verifies initial state: owner, DEX liquidity, oracle price, zero rates
- **Collateral Operations** -- Add/withdraw collateral, events, insufficient collateral errors
- **Borrowing Operations** -- Mint when collateralized, prevent over-borrowing, `DebtSharesMinted` event
- **Repayment Operations** -- Full/partial repay, overpay handling, `DebtSharesBurned` event
- **Liquidation** -- Unsafe positions liquidatable (after ETH price drop via DEX swap), safe positions protected, `Liquidation` event
- **Borrow Rate Management** -- Rate controller access, rate >= savings rate constraint, `BorrowRateUpdated` event
- **Interest Accrual** -- Zero rate (no interest), 10% annual, partial periods (6 months), multiple rate changes
- **Savings Rate Management** -- Rate controller access, rate <= borrow rate constraint, `SavingsRateUpdated` event
- **Staking Operations** -- Stake/withdraw MyUSD, events, zero amount / insufficient balance / insufficient allowance errors, multiple stakes
- **Withdrawal Operations** -- Withdraw staked tokens, events, no balance error, withdrawal after partial time with no interest
- **Savings Interest Accrual** -- Zero rate, 8% annual, partial periods, multiple rate changes

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
| `snake_case` | Hardhat deploy files (e.g., `00_deploy_contracts.ts`) |

## Key Warnings

- Do NOT edit any contract except `MyUSDEngine.sol` -- all other contracts are provided as-is
- Do NOT use deprecated hook names (`useScaffoldContractRead`, `useScaffoldContractWrite`)
- Contract ABIs in `deployedContracts.ts` are auto-generated -- do not edit manually
- Solidity version must stay `^0.8.20`, do not change it
- Tests check for custom errors and events by name -- they are pre-defined in the contract, do not rename them
- **Share-based math precision**: Use `PRECISION` (1e18) consistently. When converting MyUSD to shares: `(amount * PRECISION) / exchangeRate`. When converting shares to MyUSD: `(shares * exchangeRate) / PRECISION`.
- **Interest accrual must happen before state changes**: Always call `_accrueInterest()` at the start of `mintMyUSD`, `repayUpTo`, `setBorrowRate`, and `liquidate`
- **Rate constraint**: `borrowRate` must always be `>=` `savingsRate`. The engine enforces `borrowRate >= savingsRate`; the staking contract enforces `savingsRate <= borrowRate`
- The `repayUpTo` function must handle overpayment gracefully -- if the user tries to repay more than their debt, only burn what they actually owe
- **Liquidation reward**: The liquidator receives the user's collateral value equal to their debt plus a `LIQUIDATOR_REWARD`% bonus (10%)
- The deploy script uses nonce prediction -- if you add or remove deployments, the predicted addresses will be wrong
- `yarn simulate` and `yarn interest-rate-controller` require contracts to be deployed first (`yarn chain` + `yarn deploy`)
