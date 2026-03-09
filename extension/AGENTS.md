# AGENTS.md

## What is SpeedRunEthereum?

[SpeedRunEthereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the SpeedRunEthereum challenges.** It covers **Oracles**.

## Challenge Overview

The learner builds three progressively more sophisticated oracle designs: a **WhitelistOracle** (aggregates prices from whitelisted SimpleOracle contracts using median), a **StakingOracle** (economic incentive-based oracle with staking, slashing, and time-bucketed reporting), and an **OptimisticOracle** (binary event oracle with assertion/proposal/dispute settlement). The system includes supporting contracts: `SimpleOracle` (basic price storage), `OracleToken` (ERC-20 staking token), `Decider` (dispute settler), and `StatisticsUtils` (sorting/median library).

The final deliverable: an app with three pages (whitelist, staking, optimistic) that let users interact with each oracle type. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why Oracles Matter

Oracles bridge the gap between on-chain smart contracts and off-chain real-world data. Without reliable oracles, DeFi protocols cannot price assets, trigger liquidations, or settle prediction markets. The "oracle problem" -- how to get trustworthy data on-chain -- is one of the most fundamental challenges in blockchain.

Real-world examples of the concepts in this challenge:

- **Chainlink** -- The dominant decentralized oracle network. Uses a network of independent node operators who stake LINK tokens and are rewarded for accurate data, slashed for inaccurate data. This challenge's StakingOracle directly mirrors Chainlink's economic security model.
- **Uniswap V2/V3 TWAPs** -- Time-weighted average price oracles built into the DEX itself. The WhitelistOracle's median aggregation is conceptually similar to aggregating multiple price sources.
- **UMA's Optimistic Oracle** -- A dispute-resolution based oracle where asserters propose outcomes, and disputers can challenge incorrect claims. This challenge's OptimisticOracle is directly inspired by UMA's design with assertion -> proposal -> dispute -> settlement flow.
- **Pyth Network** -- A high-frequency oracle publishing price feeds from first-party data providers (exchanges, market makers). Demonstrates that oracle design varies based on latency and trust requirements.
- **API3** -- First-party oracles where data providers operate their own nodes. The WhitelistOracle pattern (owner manages a list of trusted reporters) is similar to API3's approach.

**Key insight**: There is no single "correct" oracle design -- the right approach depends on the trust model, latency requirements, and economic guarantees needed. Whitelisted oracles are simple but centralized. Staking oracles use economic incentives for decentralized security. Optimistic oracles minimize on-chain cost by assuming honesty and only resolving disputes. This challenge teaches you to build all three patterns.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with `create-eth`, it produces a monorepo:

```
packages/
  hardhat/
    contracts/
      00_Whitelist/
        SimpleOracle.sol       # Basic oracle storing price+timestamp (provided, reference)
        WhitelistOracle.sol    # Aggregator with median calculation (LEARNER IMPLEMENTS - Checkpoint 1)
      01_Staking/
        OracleToken.sol        # ERC-20 token for staking (provided)
        StakingOracle.sol      # Economic incentive oracle (LEARNER IMPLEMENTS - Checkpoint 2)
      02_Optimistic/
        Decider.sol            # Dispute settler helper (provided)
        OptimisticOracle.sol   # Binary event oracle (LEARNER IMPLEMENTS - Checkpoints 4-6)
      utils/
        StatisticsUtils.sol    # Sorting and median library (provided)
    deploy/
      00_deploy_whitelist.ts   # Deploy WhitelistOracle + 10 SimpleOracles on localhost
      01_deploy_staking.ts     # Deploy OracleToken + StakingOracle
      02_deploy_optimistic.ts  # Deploy OptimisticOracle + Decider (nonce prediction)
    test/
      WhitelistOracle.ts       # Checkpoint 1 grading tests
      StakingOracle.ts         # Checkpoint 2 grading tests
      OptimisticOracle.ts      # Checkpoints 4-6 grading tests
    scripts/
      fetchPriceFromUniswap.ts       # Fetches real ETH/DAI price from Uniswap V2 mainnet
      runWhitelistOracleBots.ts      # Simulates whitelist oracle reporters
      runStakingOracleBots.ts        # Simulates staking oracle nodes
      runOptimisticBots.ts           # Simulates optimistic oracle participants
      oracle-bot/                    # Bot configuration and utilities
        config.json, balances.ts, price.ts, reporting.ts, types.ts, validation.ts
      utils.ts                       # Shared script utilities
  nextjs/
    app/
      whitelist/
        page.tsx               # Whitelist oracle dashboard
      staking/
        page.tsx               # Staking oracle dashboard
      optimistic/
        page.tsx               # Optimistic oracle dashboard
    components/
      oracle/
        PriceWidget.tsx              # Current median price display
        BucketCountdown.tsx          # Time until next staking bucket
        BuyOraWidget.tsx             # Buy ORA tokens interface
        ConfigSlider.tsx             # Configuration utility
        EditableCell.tsx             # Editable table cell (whitelist)
        HighlightedCell.tsx          # Price change highlighting
        NodeRow.tsx                  # Staking node table row
        NodesTable.tsx               # All staking nodes table
        SelfNodeReporter.tsx         # Self-report price UI
        SelfNodeRow.tsx              # Current user's node stats
        StakingEditableCell.tsx      # Staking table editable cell
        TimeAgo.tsx                  # Relative time display
        TotalSlashedWidget.tsx       # Total slashed statistics
        TooltipInfo.tsx              # Info tooltip component
        types.ts                     # TypeScript type definitions
        whitelist/
          WhitelistTable.tsx         # Oracle contracts table
          WhitelistRow.tsx           # Individual oracle row
          AddOracleButton.tsx        # Add new oracle button
        optimistic/
          AssertedTable.tsx          # Asserted events list
          AssertedRow.tsx            # Individual assertion row
          ProposedTable.tsx          # Proposed outcomes list
          ProposedRow.tsx            # Individual proposal row
          DisputedTable.tsx          # Disputed assertions list
          DisputedRow.tsx            # Individual dispute row
          SettledTable.tsx           # Settled assertions list
          SettledRow.tsx             # Individual settled row
          ExpiredTable.tsx           # Expired assertions list
          ExpiredRow.tsx             # Individual expired row
          EmptyRow.tsx               # Empty state placeholder
          LoadingRow.tsx             # Loading state placeholder
          AssertionModal.tsx         # Create new assertion form
          SubmitAssertionButton.tsx  # Submit assertion button
          TimeLeft.tsx               # Time remaining display
    services/
      store/
        challengeStore.ts      # Zustand store for UI state
    utils/
      constants.ts             # Shared constants
      helpers.ts               # Utility functions
      configUpdater.ts         # Configuration update utilities
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
yarn hardhat run scripts/runWhitelistOracleBots.ts    # Simulate whitelist oracle reporters
yarn hardhat run scripts/runStakingOracleBots.ts      # Simulate staking oracle nodes
yarn hardhat run scripts/runOptimisticBots.ts         # Simulate optimistic oracle participants

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

Note: The simulation bot scripts are defined in the hardhat package as `simulate:whitelist`, `simulate:staking`, and `simulate:optimistic`. Run them from the `packages/hardhat` directory or use the full `yarn hardhat run` commands shown above.

## Smart Contracts

### SimpleOracle.sol (Provided, DO NOT EDIT)

Basic oracle storing a single price and timestamp. Used as building blocks managed by WhitelistOracle.

- **Solidity version**: `>=0.8.0 <0.9.0`
- **`setPrice(uint256 _newPrice)`** -- Update the price and record timestamp (owner only, but owner check is disabled for testing)
- **`getPrice()`** -- Returns `(uint256 price, uint256 timestamp)`
- Each SimpleOracle is owned by a specific address set at construction

### WhitelistOracle.sol (Learner Implements -- Checkpoint 1)

Aggregator oracle managing a whitelist of SimpleOracle contracts, filtering stale data, and calculating median price.

- **Solidity version**: `>=0.8.0 <0.9.0`
- **Imports**: `SimpleOracle`, `StatisticsUtils`

#### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `STALE_DATA_WINDOW` | `24 seconds` | Staleness threshold for oracle data |

#### State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `owner` | `address` | Contract owner |
| `oracles` | `SimpleOracle[]` | Array of managed oracle contracts |

#### Custom Errors (pre-defined, do not modify)

| Error | Purpose |
|-------|---------|
| `OnlyOwner()` | Non-owner calling restricted function |
| `IndexOutOfBounds()` | Invalid array index |
| `NoOraclesAvailable()` | No active oracles for price calculation |

#### Events (pre-defined, do not modify)

| Event | Fields |
|-------|--------|
| `OracleAdded(address oracleAddress, address oracleOwner)` | Emitted when an oracle is added |
| `OracleRemoved(address oracleAddress)` | Emitted when an oracle is removed |

#### Functions to Implement

1. **`addOracle(address _owner) public onlyOwner`** -- Deploy a new SimpleOracle with given owner, add to oracles array, emit `OracleAdded`
2. **`removeOracle(uint256 index) public onlyOwner`** -- Remove oracle at index using swap-and-pop pattern, emit `OracleRemoved`. Revert with `IndexOutOfBounds` if index >= length.
3. **`getPrice() public view returns (uint256)`** -- Filter oracles with timestamps older than `STALE_DATA_WINDOW`, collect fresh prices, sort using `StatisticsUtils.sort()`, return median using `StatisticsUtils.getMedian()`. Revert with `NoOraclesAvailable` if no fresh data.
4. **`getActiveOracleNodes() public view returns (address[] memory)`** -- Return addresses of oracles with fresh (non-stale) data. Uses temporary array then right-sizes for gas optimization.

### OracleToken.sol (ORA -- Provided, DO NOT EDIT)

ERC-20 token for staking incentives. Inherits `ERC20`, `Ownable`.

- **Token name/symbol**: "Oracle Token" / "ORA"
- **Exchange rate**: 1 ETH = 200 ORA (constant `ORA_PER_ETH`)
- **`mint(address to, uint256 amount)`** -- Only callable by owner (StakingOracle after ownership transfer)
- **`burn(uint256 amount)`** -- Burn caller's tokens
- **`buy()` / `receive()`** -- Buy ORA at fixed rate by sending ETH
- **`quoteOra(uint256 ethAmountWei)`** -- View: returns ORA amount for given ETH
- Initial supply: 1,000,000,000,000 ORA minted to deployer

### StakingOracle.sol (Learner Implements -- Checkpoint 2)

Economic incentive-based oracle with staking, slashing, bucket-based reporting, and rewards.

- **Solidity version**: `>=0.8.0 <0.9.0`
- **Imports**: `ORA`, `StatisticsUtils`

#### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MINIMUM_STAKE` | `100 ether` (100 ORA) | Minimum stake to register a node |
| `BUCKET_WINDOW` | `24` | Blocks per reporting bucket |
| `SLASHER_REWARD_PERCENTAGE` | `10` | Percentage of slashed amount given to slasher |
| `REWARD_PER_REPORT` | `1 ether` (1 ORA) | Reward per price report |
| `INACTIVITY_PENALTY` | `1 ether` (1 ORA) | Penalty per missed bucket |
| `MISREPORT_PENALTY` | `100 ether` (100 ORA) | Penalty for >10% deviation from median |
| `MAX_DEVIATION_BPS` | `1000` | 10% deviation threshold in basis points |
| `WAITING_PERIOD` | `2` | Buckets before node can exit |

#### Data Structures

```solidity
struct OracleNode {
    uint256 stakedAmount;
    uint256 lastReportedBucket;
    uint256 reportCount;
    uint256 claimedReportCount;
    uint256 firstBucket;     // bucket when node registered
    bool active;
}

struct BlockBucket {
    mapping(address => bool) slashedOffenses;
    address[] reporters;
    uint256[] prices;
    uint256 medianPrice;
}
```

#### Custom Errors (pre-defined, do not modify)

| Error | Purpose |
|-------|---------|
| `NodeNotRegistered()` | Unregistered node calling restricted function |
| `InsufficientStake()` | Stake below minimum |
| `NodeAlreadyRegistered()` | Duplicate registration |
| `NoRewardsAvailable()` | No rewards to claim |
| `OnlyPastBucketsAllowed()` | Trying to finalize/slash current bucket |
| `NodeAlreadySlashed()` | Double-slash prevention |
| `AlreadyReportedInCurrentBucket()` | Duplicate report in same bucket |
| `NotDeviated()` | Node's price within acceptable range |
| `WaitingPeriodNotOver()` | Exit before waiting period |
| `InvalidPrice()` | Zero or invalid price |
| `IndexOutOfBounds()` | Invalid array index |
| `NodeNotAtGivenIndex()` | Node address doesn't match index |
| `TransferFailed()` | Token transfer failed |
| `MedianNotRecorded()` | Bucket median not yet finalized |
| `BucketMedianAlreadyRecorded()` | Bucket already finalized |
| `NodeDidNotReport()` | Node didn't report in specified bucket |

#### Events (pre-defined, do not modify)

| Event | Fields |
|-------|--------|
| `NodeRegistered(address indexed node, uint256 stakedAmount)` | Node registered |
| `PriceReported(address indexed node, uint256 price, uint256 bucketNumber)` | Price reported |
| `BucketMedianRecorded(uint256 indexed bucketNumber, uint256 medianPrice)` | Bucket finalized |
| `NodeSlashed(address indexed node, uint256 amount)` | Node slashed |
| `NodeRewarded(address indexed node, uint256 amount)` | Node reward claimed |
| `StakeAdded(address indexed node, uint256 amount)` | Stake increased |
| `NodeExited(address indexed node, uint256 amount)` | Node exited system |

#### Functions to Implement

1. **`registerNode(uint256 amount) public`** -- Register node with minimum stake, transfer ORA tokens from caller, create `OracleNode` struct, add to `nodeAddresses`, emit `NodeRegistered`. Revert with `InsufficientStake` or `NodeAlreadyRegistered`.
2. **`reportPrice(uint256 price) public onlyNode`** -- Report price in current bucket. One report per bucket per node. Requires sufficient effective stake. Enforces that previous report's bucket must have its median recorded before allowing new report. Emit `PriceReported`.
3. **`claimReward() public`** -- Claim accumulated ORA rewards (1 ORA per report). Calculate unclaimed reports (`reportCount - claimedReportCount`), mint ORA via `oracleToken.mint()`, emit `NodeRewarded`.
4. **`addStake(uint256 amount) public onlyNode`** -- Transfer additional ORA tokens to increase stake, emit `StakeAdded`.
5. **`recordBucketMedian(uint256 bucketNumber) public`** -- Finalize bucket's median price using `StatisticsUtils`. Can only be called for past buckets. Revert if already recorded or no reporters. Emit `BucketMedianRecorded`.
6. **`slashNode(address nodeToSlash, uint256 bucketNumber, uint256 reportIndex, uint256 nodeAddressesIndex) public`** -- Slash node that deviated >10% from bucket median. Only for past buckets with recorded median. Reward slasher with `SLASHER_REWARD_PERCENTAGE` of slashed amount. Remove node from `nodeAddresses` if stake reaches zero. Emit `NodeSlashed`.
7. **`exitNode(uint256 index) public onlyNode`** -- Withdraw stake after waiting period (`WAITING_PERIOD` buckets since last report). Return ORA tokens to caller, remove from `nodeAddresses`. Emit `NodeExited`.

#### View Functions to Implement

- **`getCurrentBucketNumber() public view returns (uint256)`** -- Already implemented: `(block.number / BUCKET_WINDOW) + 1`
- **`getNodeAddresses() public view returns (address[] memory)`** -- Return all registered node addresses
- **`getLatestPrice() public view returns (uint256)`** -- Median price of last finalized bucket. Revert with `MedianNotRecorded` if not available.
- **`getPastPrice(uint256 bucketNumber) public view returns (uint256)`** -- Historical bucket median. Revert with `MedianNotRecorded` if not recorded.
- **`getSlashedStatus(address nodeAddress, uint256 bucketNumber) public view returns (uint256 price, bool slashed)`** -- Node's reported price and slash status for a bucket
- **`getEffectiveStake(address nodeAddress) public view returns (uint256)`** -- Stake minus inactivity penalties: `stakedAmount - (missedBuckets * INACTIVITY_PENALTY)`, floored at 0
- **`getOutlierNodes(uint256 bucketNumber) public view returns (address[] memory)`** -- Nodes that deviated >10% from bucket median

#### Internal Functions

- **`_removeNode(address nodeAddress, uint256 index) internal`** -- Remove node from `nodeAddresses` array (swap-and-pop)
- **`_checkPriceDeviated(uint256 reportedPrice, uint256 medianPrice) internal pure returns (bool)`** -- Check if price deviation exceeds `MAX_DEVIATION_BPS` (10%)

### Decider.sol (Provided, DO NOT EDIT)

Simple contract that calls `OptimisticOracle.settleAssertion()`. Acts as the authorized dispute settler.

- **`settleDispute(uint256 assertionId, bool resolvedValue)`** -- Calls `oracle.settleAssertion()`, emits `DisputeSettled`
- **`setOracle(address newOracle)`** -- Owner can update oracle address
- **`receive()`** -- Can receive ETH

### OptimisticOracle.sol (Learner Implements -- Checkpoints 4-6)

Binary event oracle with assertion, proposal, dispute, and settlement flow.

- **Solidity version**: `>=0.8.0 <0.9.0`

#### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MINIMUM_ASSERTION_WINDOW` | `3 minutes` | Minimum assertion duration |
| `DISPUTE_WINDOW` | `3 minutes` | Dispute period after proposal |

#### State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `decider` | `address` | Address authorized to settle disputes |
| `owner` | `address` | Contract owner |
| `nextAssertionId` | `uint256` | Next assertion ID (starts at 1) |
| `assertions` | `mapping(uint256 => EventAssertion)` | All assertions by ID |

#### Data Structures

```solidity
enum State { Invalid, Asserted, Proposed, Disputed, Settled, Expired }

struct EventAssertion {
    address asserter;
    address proposer;
    address disputer;
    bool proposedOutcome;
    bool resolvedOutcome;
    uint256 reward;
    uint256 bond;           // bond = reward * 2
    uint256 startTime;
    uint256 endTime;
    bool claimed;
    address winner;
    string description;
}
```

#### Custom Errors (pre-defined, do not modify)

| Error | Purpose |
|-------|---------|
| `AssertionNotFound()` | Invalid assertion ID |
| `AssertionProposed()` | Already proposed |
| `InvalidValue()` | Invalid ETH amount |
| `InvalidTime()` | Invalid time parameters |
| `ProposalDisputed()` | Already disputed |
| `NotProposedAssertion()` | Not in proposed state |
| `AlreadyClaimed()` | Reward already claimed |
| `AlreadySettled()` | Already settled |
| `AwaitingDecider()` | Dispute not yet settled |
| `NotDisputedAssertion()` | Not in disputed state |
| `OnlyDecider()` | Non-decider calling settle |
| `OnlyOwner()` | Non-owner calling restricted function |
| `TransferFailed()` | ETH transfer failed |

#### Events (pre-defined, do not modify)

| Event | Fields |
|-------|--------|
| `EventAsserted(uint256 assertionId, address asserter, string description, uint256 reward)` | New assertion |
| `OutcomeProposed(uint256 assertionId, address proposer, bool outcome)` | Outcome proposed |
| `OutcomeDisputed(uint256 assertionId, address disputer)` | Outcome disputed |
| `AssertionSettled(uint256 assertionId, bool outcome, address winner)` | Dispute settled |
| `DeciderUpdated(address oldDecider, address newDecider)` | Decider changed |
| `RewardClaimed(uint256 assertionId, address winner, uint256 amount)` | Reward claimed |
| `RefundClaimed(uint256 assertionId, address asserter, uint256 amount)` | Refund claimed |

#### Functions to Implement

1. **`setDecider(address _decider) external onlyOwner`** -- Already implemented. Updates decider address, emits `DeciderUpdated`.
2. **`getAssertion(uint256 assertionId) external view returns (EventAssertion memory)`** -- Already implemented. Returns full assertion struct.
3. **`assertEvent(string description, uint256 startTime, uint256 endTime) external payable returns (uint256)`** -- Create new assertion with reward (`msg.value`). Bond = reward * 2. Sets default timestamps if 0. Validates time windows (endTime - startTime >= `MINIMUM_ASSERTION_WINDOW`). Emit `EventAsserted`.
4. **`proposeOutcome(uint256 assertionId, bool outcome) external payable`** -- Propose outcome with bond deposit (`msg.value == bond`). Must be within assertion time window. Sets dispute deadline. Emit `OutcomeProposed`.
5. **`disputeOutcome(uint256 assertionId) external payable`** -- Dispute proposed outcome with bond (`msg.value == bond`). Must be within dispute window. Emit `OutcomeDisputed`.
6. **`claimUndisputedReward(uint256 assertionId) external`** -- Claim reward after dispute window passes without dispute. Transfers reward + bond to proposer. Emit `RewardClaimed`.
7. **`claimDisputedReward(uint256 assertionId) external`** -- Claim reward after decider settlement. Pays decider fee, transfers remaining to winner. Emit `RewardClaimed`.
8. **`claimRefund(uint256 assertionId) external`** -- Asserter refund if no proposal made before deadline. Returns original reward. Emit `RefundClaimed`.
9. **`settleAssertion(uint256 assertionId, bool resolvedOutcome) external onlyDecider`** -- Decider settles disputed assertion. Sets resolved outcome, determines winner. Emit `AssertionSettled`.

#### View Functions to Implement

- **`getState(uint256 assertionId) external view returns (State)`** -- Return current state enum based on assertion lifecycle
- **`getResolution(uint256 assertionId) external view returns (bool)`** -- Return final boolean outcome (proposed outcome for undisputed, resolved outcome for disputed)

### StatisticsUtils.sol (Provided Library, DO NOT EDIT)

Library with sorting and median calculation utilities.

- **`sort(uint256[] memory arr)`** -- Selection sort in ascending order (modifies in-place)
- **`getMedian(uint256[] memory arr)`** -- Median of sorted array (average of two middle elements for even length). Reverts with `EmptyArray` if empty.
- Used by WhitelistOracle and StakingOracle for price aggregation

## Deploy Scripts

- **`00_deploy_whitelist.ts`** -- Deploys WhitelistOracle. On localhost: creates 10 SimpleOracle instances via `addOracle()`, fetches initial ETH price from Uniswap, sets prices on each oracle.
- **`01_deploy_staking.ts`** -- Deploys OracleToken + StakingOracle. Transfers ORA ownership to StakingOracle for reward minting.
- **`02_deploy_optimistic.ts`** -- Pre-calculates Decider address using `getCreateAddress` (nonce + 1), deploys OptimisticOracle with future Decider address, then deploys Decider with OptimisticOracle address.

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- `useScaffoldReadContract` -- NOT ~~useScaffoldContractRead~~
- `useScaffoldWriteContract` -- NOT ~~useScaffoldContractWrite~~
- `useScaffoldEventHistory` -- for reading past events
- `useScaffoldContract` -- for getting the contract instance directly

### Pages

1. **Whitelist Page (/whitelist)** -- PriceWidget showing current median, WhitelistTable displaying all oracle contracts with owners and prices, AddOracleButton for owner
2. **Staking Page (/staking)** -- BuyOraWidget (purchase ORA), BucketCountdown (time until next bucket), TotalSlashedWidget (slash stats), NodesTable (all nodes with stake/reports/rewards), SelfNodeReporter (report price)
3. **Optimistic Page (/optimistic)** -- SubmitAssertionButton + AssertionModal (create assertions), five state-based tables: AssertedTable, ProposedTable, DisputedTable, SettledTable, ExpiredTable

### State Management

- Zustand store (`challengeStore.ts`) for UI state
- API routes for configuration: `/api/config/price-variance`, `/api/config/skip-probability`, `/api/ora-faucet`

### UI & Styling

- Use `@scaffold-ui/components` for web3 UI (`Address`, `AddressInput`, `Balance`, `EtherInput`)
- Use **DaisyUI** classes for components (cards, buttons, badges, tables) with Tailwind CSS

## Architecture Notes

- **Next.js App Router** (not Pages Router) -- pages are at `app/<route>/page.tsx`
- **Import alias**: use `~~` for nextjs package imports (e.g., `import { ... } from "~~/hooks/scaffold-eth"`)
- After `yarn deploy`, contract ABIs auto-generate to `packages/nextjs/contracts/deployedContracts.ts`
- **Three oracle patterns**: The challenge teaches three fundamentally different approaches to the oracle problem -- trust-based (whitelist), incentive-based (staking), and dispute-based (optimistic)
- **Bucket-based reporting**: The StakingOracle groups reports into time buckets (24 blocks each). Median is calculated per bucket, and outliers are slashable only after the bucket finalizes
- **Bond economics**: In the OptimisticOracle, bond = 2x reward. This ensures rational actors don't dispute truthful assertions (they'd lose more than they gain)
- **Nonce-based address prediction**: The optimistic oracle deploy script pre-calculates the Decider contract address using `getCreateAddress` with future nonces to resolve circular dependencies

## Testing

The grading tests cover the following areas:

- **Checkpoint 1 (WhitelistOracle.ts)** -- ~15 tests: owner deployment, adding/removing oracles with events, median calculation (odd/even oracle counts), stale data filtering, active oracle nodes tracking, edge cases (empty array, all stale)
- **Checkpoint 2 (StakingOracle.ts)** -- ~40+ tests: node registration with validation, price reporting with bucket tracking, reward claiming, effective stake with inactivity penalties, bucket finalization (median recording), slashing mechanism (deviation detection >10%, reward distribution, node removal at zero stake, double-slash prevention, only past buckets), node exit with waiting period, outlier detection
- **Checkpoints 4-6 (OptimisticOracle.ts)** -- ~50+ tests: deployment and constants, event assertion with validation, outcome proposal with bonding, outcome dispute, time window validation, undisputed/disputed reward claiming, refund claiming, dispute settlement by decider, state transitions, resolution queries

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
| `snake_case` | Hardhat deploy files (e.g., `00_deploy_whitelist.ts`) |

## Key Warnings

- Do NOT edit contracts marked as provided (`SimpleOracle.sol`, `OracleToken.sol`, `Decider.sol`, `StatisticsUtils.sol`)
- Do NOT use deprecated hook names (`useScaffoldContractRead`, `useScaffoldContractWrite`)
- Contract ABIs in `deployedContracts.ts` are auto-generated -- do not edit manually
- Tests check for custom errors and events by name -- do not rename them
- **Median calculation**: Use `StatisticsUtils.getMedian()` -- do not implement your own sorting/median
- **Stale data filtering**: WhitelistOracle must filter out oracles whose data is older than `STALE_DATA_WINDOW` before calculating median
- **Bucket boundaries**: `getCurrentBucketNumber()` returns `(block.number / BUCKET_WINDOW) + 1` -- the +1 is important
- **Slashing constraints**: Nodes can only be slashed for past (finalized) buckets, not the current one. Double-slashing for the same offense is prevented via `slashedOffenses` mapping
- **Effective stake**: Calculated as `stakedAmount - (missedBuckets * INACTIVITY_PENALTY)`. A node with zero effective stake should be removable
- **Waiting period**: Nodes must wait `WAITING_PERIOD` buckets after their last report before exiting
- The deploy scripts use nonce prediction -- if you add or remove deployments, predicted addresses will be wrong
- Simulation bot scripts require contracts to be deployed first (`yarn chain` + `yarn deploy`)
