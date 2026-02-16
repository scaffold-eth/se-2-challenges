# AGENTS.md — Dice Game Challenge

## Challenge Overview

The learner builds a dice game where users roll against the house. The contract uses on-chain "randomness" derived from `block.prevrandao` and `msg.sender`. The core learning goals are understanding pseudo-randomness on Ethereum, why it is exploitable, and how to build (and break) simple game mechanics.

## Repository Structure

This is a Scaffold-ETH 2 **external extension**. The learner-editable code lives under `extension/`:

```
extension/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   ├── DiceGame.sol           # House dice game contract
│   │   │   └── RiggedRoll.sol         # Attacker contract (learner implements)
│   │   ├── deploy/
│   │   │   ├── 00_deploy_dice_game.ts
│   │   │   └── 01_deploy_rigged_roll.ts
│   │   └── test/
│   │       └── Challenge.ts           # Checkpoint-based test suite
│   └── nextjs/
│       └── app/dice-game/
│           ├── page.tsx               # Main dice game UI
│           └── _components/
│               └── DiceGameBoard.tsx  # Game board component
```

## Contracts

### DiceGame.sol (Provided — DO NOT EDIT)

- Accepts exactly **0.002 ETH** per roll.
- Generates a pseudo-random number using `keccak256(abi.encodePacked(block.prevrandao, address(this), nonce))`.
- If the roll is **0 or 1** (out of 0–15), the player wins the entire contract balance.
- Emits `Roll(address player, uint256 amount, uint256 roll)` on every roll.
- Emits `Winner(address winner, uint256 amount)` on a winning roll.

### RiggedRoll.sol (Learner Implements)

The learner must write a contract that **predicts** the dice roll before calling `DiceGame.rollTheDice()`.

#### Functions to Implement

1. **`riggedRoll() public payable`** — Replicate the DiceGame randomness calculation, predict the outcome, and only call `rollTheDice()` if the predicted roll is 0 or 1. Must send 0.002 ETH with the call. Should revert if the predicted roll would lose.
2. **`withdraw(address _addr, uint256 _amount) public`** — Allow the owner to withdraw winnings from the contract.
3. **`receive() external payable`** — Accept ETH (winnings from DiceGame).

#### Key Insight

Because `block.prevrandao` and `address(this)` are known at call time, and the nonce is public, the attacker can compute the exact same hash the DiceGame will compute — and only proceed when the result is a winning number.

## Deploy Scripts

- **`00_deploy_dice_game.ts`** — Deploys `DiceGame` and funds it with **0.05 ETH**.
- **`01_deploy_rigged_roll.ts`** — Deploys `RiggedRoll` with the DiceGame address.

## Test Suite (Challenge.ts)

Tests are organised into checkpoints:

| Checkpoint | What It Verifies |
|---|---|
| **1** | `DiceGame` deploys and is funded with 0.05 ETH |
| **2** | `RiggedRoll` can predict outcomes and only rolls on winning numbers |
| **3** | `RiggedRoll` successfully extracts funds from the DiceGame |

Run tests with:

```bash
cd extension/packages/hardhat
yarn hardhat test
```

## Frontend

- **`dice-game/page.tsx`** — Main page that renders the `DiceGameBoard` component.
- **`DiceGameBoard.tsx`** — Interactive dice game UI: shows the contract balance, recent rolls, a roll button, and win/lose animations. Displays event history using `useScaffoldEventHistory`.

## Key Concepts

- **On-chain pseudo-randomness is exploitable** — miners/validators and same-block contracts can predict `block.prevrandao`.
- **Re-entrancy is not the attack here** — the exploit is prediction, not re-entrancy.
- **Secure randomness** requires off-chain oracles (e.g., Chainlink VRF) or commit-reveal schemes.

## Common Pitfalls

- Not sending exactly 0.002 ETH when calling `rollTheDice()`.
- Forgetting the `receive()` function (contract cannot receive winnings).
- Using `msg.sender` instead of `address(this)` in the hash — the DiceGame uses `msg.sender` which will be the RiggedRoll contract's address.
- Not reverting when the predicted roll is a losing number.

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
