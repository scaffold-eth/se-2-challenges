# AGENTS.md — Multisig Challenge

## Challenge Overview

The learner builds a multi-signature wallet (`MetaMultiSigWallet`) that requires multiple owners to approve transactions before execution. Signatures are collected **off-chain** using ECDSA and submitted together on-chain. Core learning goals are multi-sig security patterns, off-chain ECDSA signatures, EIP-712-style hashing, nonce management, and a pool server for signature coordination.

## Repository Structure

This is a Scaffold-ETH 2 **external extension**. The learner-editable code lives under `extension/`:

```
extension/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   └── MetaMultiSigWallet.sol  # Main multisig contract (learner implements)
│   │   └── deploy/
│   │       └── 00_deploy_meta_multisig_wallet.ts
│   ├── nextjs/
│   │   ├── app/
│   │   │   ├── create/page.tsx         # Create new transaction proposals
│   │   │   ├── multisig/page.tsx       # View & execute pending transactions
│   │   │   ├── owners/page.tsx         # Manage wallet owners
│   │   │   └── pool/page.tsx           # Off-chain signature pool
│   │   └── utils/
│   │       ├── getPoolServerUrl.ts
│   │       └── methods.ts              # Signature helpers
│   └── backend-local/
│       ├── index.ts                    # Express pool server for signatures
│       └── package.json
```

## Contracts

### MetaMultiSigWallet.sol (Learner Implements)

A multi-signature wallet where N-of-M owners must sign off-chain before a transaction can be executed.

#### Key State

- `signaturesRequired` — minimum number of signatures needed to execute a transaction.
- `isOwner[address]` — mapping of authorised signers.
- `nonce` — incremented on each successful execution to prevent replay attacks.

#### Functions to Implement

1. **`executeTransaction(address to, uint256 value, bytes calldata data, bytes[] calldata signatures)`** — Verify that enough valid owner signatures are provided for the transaction hash, then execute the call. Increment nonce.
2. **`getTransactionHash(uint256 _nonce, address to, uint256 value, bytes calldata data)`** — Compute the hash that signers must sign: `keccak256(abi.encodePacked(address(this), chainId, _nonce, to, value, data))`.
3. **`recover(bytes32 _hash, bytes calldata _signature)`** — Recover the signer address from an ECDSA signature using `ecrecover` (via OpenZeppelin's ECDSA library). Uses `_hash.toEthSignedMessageHash()` for Ethereum signed message prefix.
4. **`addSigner(address newSigner, uint256 newSignaturesRequired)`** — Add a new owner (only callable by the wallet itself via `executeTransaction`).
5. **`removeSigner(address oldSigner, uint256 newSignaturesRequired)`** — Remove an owner (only callable by the wallet itself).
6. **`updateSignaturesRequired(uint256 newSignaturesRequired)`** — Update the threshold (only callable by the wallet itself).
7. **`receive() external payable`** — Accept ETH deposits.

#### Key Security Pattern

Owner management functions (`addSigner`, `removeSigner`, `updateSignaturesRequired`) are restricted with `onlySelf` — they can only be called by the wallet contract itself, meaning they must go through the multi-sig approval flow.

## Off-Chain Signature Flow

1. An owner **creates** a transaction proposal (to, value, data) on the frontend.
2. The proposal is sent to the **pool server** (Express backend).
3. Other owners **sign** the transaction hash off-chain and submit signatures to the pool.
4. Once enough signatures are collected, any owner calls `executeTransaction` with all signatures.

## Backend Pool Server

**Location:** `extension/packages/backend-local/index.ts`

- Express server that stores pending transaction proposals and their collected signatures.
- Runs locally alongside the frontend.
- Provides API endpoints for creating proposals, adding signatures, and retrieving pending transactions.

## Deploy Script

- **`00_deploy_meta_multisig_wallet.ts`** — Deploys `MetaMultiSigWallet` with initial owner(s) and `signaturesRequired = 1` (for development). Funds the wallet with some ETH.

## Frontend

### Pages

1. **`/create`** — Form to propose a new transaction (recipient, value, calldata).
2. **`/multisig`** — View pending transactions, see collected signatures, execute when threshold is met.
3. **`/owners`** — View current owners and signatures required.
4. **`/pool`** — View the off-chain signature pool, sign pending transactions.

### Utils

- **`methods.ts`** — Helper functions for signing transaction hashes and interacting with the pool server.
- **`getPoolServerUrl.ts`** — Returns the pool server URL based on environment.

## Key Concepts

- **Multi-sig Security** — No single owner can move funds; requires M-of-N approval.
- **Off-chain Signatures** — ECDSA signatures are collected off-chain to save gas; only the final execution is on-chain.
- **Nonce Replay Protection** — Each executed transaction increments a nonce, preventing signature reuse.
- **Self-only Modifications** — Owner management must go through the multi-sig flow itself, preventing a single compromised key from taking over.
- **EIP-191 Signed Messages** — Uses `\x19Ethereum Signed Message:\n32` prefix for signature recovery.

## Common Pitfalls

- Forgetting to increment the nonce after execution (allows replay attacks).
- Not using `toEthSignedMessageHash()` before `ecrecover` (mismatched hash format).
- Allowing duplicate signatures from the same owner to count toward the threshold.
- Not restricting `addSigner`/`removeSigner` to `onlySelf`.
- Forgetting the `receive()` function (wallet cannot accept ETH).

## Commands

| Action | Command |
|---|---|
| Compile contracts | `yarn hardhat compile` |
| Run tests | `yarn hardhat test` |
| Deploy locally | `yarn deploy` |
| Start frontend | `yarn start` |
| Start pool server | `cd extension/packages/backend-local && npx ts-node index.ts` |
