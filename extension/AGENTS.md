# AGENTS.md

## What is SpeedRunEthereum?

[SpeedRunEthereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the SpeedRunEthereum challenges.** It covers **Multisig**.

## Challenge Overview

The learner builds a multi-signature wallet (`MetaMultiSigWallet`) that requires multiple owners to approve transactions before execution. Signatures are collected **off-chain** using ECDSA and submitted together on-chain. The goal is to understand multi-sig security patterns, off-chain ECDSA signatures, meta-transactions, nonce management, and a pool server for signature coordination.

The final deliverable: a multisig wallet where you can propose adding/removing signers, transferring funds, and updating the signature threshold. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why Multisig Matters

Multisig wallets are one of the most critical security primitives in crypto. A single private key is a single point of failure -- if it's compromised, stolen, or lost, all funds are gone. Multisig eliminates this by requiring multiple parties to agree before any transaction executes, creating a shared custody model enforced by code.

Why understanding multisig is essential:

- **Gnosis Safe (now Safe)** is the most widely used multisig, securing over $100B in assets. It's the standard for DAO treasuries, protocol admin keys, and team wallets. The architecture -- propose, collect signatures, execute -- is the same pattern you're building.
- **Protocol governance** -- Most DeFi protocols use multisigs to control upgrades and parameter changes. When Uniswap, Aave, or Compound need to update their contracts, a multisig of core contributors must approve. This prevents any single person from unilaterally changing the protocol.
- **Off-chain signatures** -- Your challenge collects ECDSA signatures off-chain and submits them together on-chain. This is a meta-transaction pattern that saves gas (only one on-chain transaction regardless of how many signers) and is used extensively in account abstraction and gasless transactions.
- **Social recovery** -- Multisig is the foundation for wallet recovery schemes. Vitalik Buterin has advocated for social recovery wallets where a group of trusted contacts (guardians) can help recover access if you lose your key, using the same m-of-n signature pattern.

**Key insight**: The multisig pattern separates *proposing* from *executing*. Anyone can propose a transaction, but it only executes when enough signers agree. This separation of concerns is the building block for all onchain governance -- from simple team wallets to complex DAO voting systems.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with `create-eth`, it produces a monorepo:

```
packages/
  hardhat/
    contracts/
      MetaMultiSigWallet.sol       # Main multisig contract
    deploy/
      00_deploy_meta_multisig_wallet.ts
  nextjs/
    app/
      create/
        page.tsx                   # Create new transaction proposals
      multisig/
        page.tsx                   # View & execute pending transactions
      owners/
        page.tsx                   # Manage wallet owners
      pool/
        page.tsx                   # Off-chain signature pool
    utils/
      getPoolServerUrl.ts
      methods.ts                   # Signature helpers
  backend-local/
    index.ts                       # Express pool server for signatures
    package.json
```

## Common Commands

```bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000
yarn backend-local  # Start local pool server (required on localhost only)

# Redeploy fresh
yarn deploy --reset

# Testing
yarn test           # Run all challenge tests

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

## Smart Contract: MetaMultiSigWallet.sol

A multi-signature wallet where N-of-M owners must sign off-chain before a transaction can be executed on-chain.

### Key State

- `signaturesRequired` - minimum number of signatures needed to execute a transaction
- `isOwner[address]` - mapping of authorized signers
- `nonce` - incremented on each successful execution to prevent replay attacks

### Functions

1. **`executeTransaction(address to, uint256 value, bytes calldata data, bytes[] calldata signatures)`** - Verify that enough valid owner signatures are provided for the transaction hash, then execute the call via `call()`. Increment nonce on success.
2. **`getTransactionHash(uint256 _nonce, address to, uint256 value, bytes calldata data)`** - Compute the hash: `keccak256(abi.encodePacked(address(this), chainId, _nonce, to, value, data))`.
3. **`recover(bytes32 _hash, bytes calldata _signature)`** - Recover the signer address from an ECDSA signature. Uses `_hash.toEthSignedMessageHash()` for Ethereum signed message prefix.
4. **`addSigner(address newSigner, uint256 newSignaturesRequired)`** - Add a new owner (restricted to `onlySelf`).
5. **`removeSigner(address oldSigner, uint256 newSignaturesRequired)`** - Remove an owner (restricted to `onlySelf`).
6. **`updateSignaturesRequired(uint256 newSignaturesRequired)`** - Update the threshold (restricted to `onlySelf`).
7. **`transferFunds(address payable to, uint256 value)`** - Transfer ETH from the wallet (restricted to `onlySelf`).
8. **`receive() external payable`** - Accept ETH deposits.

### Key Security Pattern: `onlySelf` Modifier

Owner management functions (`addSigner`, `removeSigner`, `updateSignaturesRequired`, `transferFunds`) can only be called by the wallet contract itself. This means they must go through the full multi-sig approval flow: propose, collect signatures, then `executeTransaction` calls `this.addSigner(...)` via `call()`.

### Off-Chain Signature Flow

1. An owner **creates** a transaction proposal (to, value, data) on the frontend.
2. The proposal is sent to the **pool server** (Express backend).
3. Other owners **sign** the transaction hash off-chain and submit signatures to the pool.
4. Once enough signatures are collected, any owner calls `executeTransaction` with all signatures.

## Deploy Script

- **`00_deploy_meta_multisig_wallet.ts`** - Deploys `MetaMultiSigWallet` with initial owner(s) and `signaturesRequired = 1` (for development). Funds the wallet with some ETH.
- Set your frontend address as the first signer in the deploy script.

## Backend Pool Server

**Location:** `packages/backend-local/index.ts`

- Express server that stores pending transaction proposals and their collected signatures.
- Required when running locally (`yarn backend-local` in a separate terminal).
- On testnet, the deployed backend at `https://multisigs.buidlguidl.com:49832/` is used automatically.

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- `useScaffoldReadContract` - NOT ~~useScaffoldContractRead~~
- `useScaffoldWriteContract` - NOT ~~useScaffoldContractWrite~~
- `useScaffoldEventHistory` - for reading past events
- `useScaffoldContract` - for getting the contract instance directly

### Pages

1. **`/create`** - Form to propose a new transaction (recipient, value, calldata). Creating a transaction also signs it.
2. **`/pool`** - View the off-chain signature pool, sign pending transactions.
3. **`/multisig`** - View executed transactions and wallet state.
4. **`/owners`** - View current owners and signatures required. Buttons to add/remove owners populate the create transaction form with the correct calldata.

### Utils

- **`methods.ts`** - Helper functions for signing transaction hashes and interacting with the pool server.
- **`getPoolServerUrl.ts`** - Returns the pool server URL based on environment (local vs deployed).

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
- Signing transactions is **gasless**, only executing costs gas
- Open multiple browsers/incognito tabs to simulate different signers
- The pool server is all off-chain, pending transactions are not stored on the blockchain
- `yarn backend-local` is only required for localhost; testnet uses the deployed backend automatically

## Testing

Run with `yarn test`. These tests verify the core multisig functionality.

## Deployment Checklist (Testnet)

1. Set your deployer address as the first signer in the deploy script
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
| `snake_case` | Hardhat deploy files (e.g., `00_deploy_meta_multisig_wallet.ts`) |

## Key Warnings

- Do NOT use deprecated hook names (`useScaffoldContractRead`, `useScaffoldContractWrite`)
- Contract ABIs in `deployedContracts.ts` are auto-generated - do not edit manually
- Forgetting to increment the nonce after execution allows replay attacks
- Must use `toEthSignedMessageHash()` before `ecrecover`, mismatched hash format breaks signature recovery
- Do not allow duplicate signatures from the same owner to count toward the threshold
- `addSigner`/`removeSigner`/`updateSignaturesRequired` must be restricted to `onlySelf`
- Forgetting the `receive()` function means the wallet cannot accept ETH
- The pool server must be running locally (`yarn backend-local`) for the frontend to work on localhost
- Set your frontend address as the first signer in the deploy script, then `yarn deploy --reset`
