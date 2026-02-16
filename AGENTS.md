# AGENTS.md — SVG NFT Challenge

## Challenge Overview

The learner builds a fully on-chain SVG NFT collection called **"Optimistic Loogies"** where all metadata and artwork live directly on the blockchain — no IPFS or external storage required. Core learning goals are on-chain SVG generation, Base64 encoding, dynamic pricing, deterministic trait generation, and composable NFT rendering.

## Repository Structure

This is a Scaffold-ETH 2 **external extension**. The learner-editable code lives under `extension/`:

```
extension/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   ├── YourCollectible.sol    # Main ERC-721 NFT contract
│   │   │   ├── HexStrings.sol         # uint256 to hex string utility
│   │   │   └── ToColor.sol            # bytes3 to hex color string utility
│   │   └── deploy/
│   │       └── 00_deploy_your_collectible.ts
│   └── nextjs/
│       └── app/
│           ├── loogies/               # Gallery of all minted NFTs
│           └── your-loogies/          # Connected user's NFTs
```

## Contracts

### YourCollectible.sol

- **ERC-721** token named `"OptimisticLoogies"` with symbol `"OPLOOG"`.
- **Max supply**: 3728 tokens.
- **Dynamic pricing**: Starts at `0.001 ETH`, increases by `0.2%` per mint (`price = price * 10002 / 10000`).
- **On-chain traits** stored per token:
  - `color` (`bytes3`) — random hex color
  - `chubbiness` (`uint256`, range 35–90) — width of the Loogie body
  - `mouthLength` (`uint256`) — calculated from chubbiness

#### Key Functions

| Function | Description |
|---|---|
| `mintItem()` | Payable. Generates traits via deterministic randomness, mints the NFT, updates price. |
| `tokenURI(uint256 id)` | Returns a Base64-encoded JSON data URI with the SVG image embedded. |
| `renderTokenById(uint256 id)` | Public. Returns the raw SVG string for a given token. Designed for composability. |

#### Randomness

Traits are generated deterministically using:

```solidity
keccak256(abi.encodePacked(tokenId, blockhash(block.number - 1), msg.sender, address(this)))
```

This is **not** cryptographically secure — it is predictable and suitable only for non-adversarial NFT trait generation.

### HexStrings.sol

- Library that converts a `uint256` to its hex string representation.
- Used internally for building SVG attributes.

### ToColor.sol

- Library that converts `bytes3` to a 6-character hex color string (e.g., `"a3f2b1"`).
- Used to render the Loogie's color in SVG.

## Dependencies

- **base64-sol**: On-chain Base64 encoding library used to encode the JSON metadata and SVG into a data URI (`data:application/json;base64,...`).
- **OpenZeppelin**: ERC-721 and related contracts.

## Frontend

### `/loogies` Page

- Displays all minted NFTs in a gallery view with pagination.
- Includes a **Mint** button that calls `mintItem()` with the current price.

### `/your-loogies` Page

- Shows only the NFTs owned by the currently connected wallet.

### Token URI Decoding

The frontend decodes the Base64-encoded `tokenURI` to extract metadata and the SVG:

```typescript
atob(tokenURI.substring(29))
```

The `substring(29)` strips the `data:application/json;base64,` prefix before decoding.

## Key Concepts

1. **Fully on-chain SVG/metadata** — All NFT artwork and metadata are stored and generated on-chain with no external dependencies (no IPFS, no off-chain servers).
2. **Deterministic trait generation** — Token traits are derived from a hash of the token ID, block hash, sender, and contract address.
3. **Dynamic pricing curve** — Each mint increases the price by 0.2%, creating a bonding-curve-like mechanism.
4. **Composable SVG rendering** — `renderTokenById()` is public, allowing other contracts to compose Loogies into larger SVG scenes.

## Development Notes

- **No test files** are included in this challenge.
- **Hardhat optimizer** is disabled.
- Deployment is handled by `00_deploy_your_collectible.ts`.

## Commands

| Action | Command |
|---|---|
| Compile contracts | `yarn hardhat compile` |
| Deploy locally | `yarn deploy` |
| Start frontend | `yarn start` |
| Deploy to testnet | `yarn deploy --network sepolia` *(interactive password — cannot be run by agents)* |
| Verify contract | `yarn verify --network sepolia` *(interactive password — cannot be run by agents)* |
| Generate deployer account | `yarn generate` *(interactive password — cannot be run by agents)* |
| View deployer balances | `yarn account` *(interactive password — cannot be run by agents)* |
| Deploy frontend | `yarn vercel` |
| Deploy frontend (prod) | `yarn vercel --prod` |
