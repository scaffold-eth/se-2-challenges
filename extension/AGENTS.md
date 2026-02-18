# AGENTS.md

## What is SpeedRunEthereum?

[SpeedRunEthereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept — from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the SpeedRunEthereum challenges.** It covers **SVG NFT**.

## Challenge Overview

The learner builds a fully on-chain SVG NFT collection called **"Optimistic Loogies"** where all metadata and artwork live directly on the blockchain — no IPFS or external storage required. The goal is to understand on-chain SVG generation, Base64 encoding, dynamic pricing, deterministic trait generation, and composable NFT rendering.

The final deliverable: an app that allows users to mint their own dynamic SVG NFTs with unique traits. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with `create-eth`, it produces a monorepo:

```
packages/
  hardhat/
    contracts/
      YourCollectible.sol    # Main ERC-721 NFT contract (learner edits)
      HexStrings.sol         # uint256 to hex string utility library
      ToColor.sol            # bytes3 to hex color string utility library
    deploy/
      00_deploy_your_collectible.ts
  nextjs/
    app/
      loogies/
        page.tsx             # Gallery of all minted NFTs
      your-loogies/
        page.tsx             # Connected user's NFTs
```

## Common Commands

```bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000

# Redeploy fresh
yarn deploy --reset

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

## Smart Contract: YourCollectible.sol

The main ERC-721 contract that generates dynamic SVG NFTs entirely on-chain.

- **Standard**: ERC-721 (inherits from OpenZeppelin `ERC721`)
- **Token name/symbol**: "OptimisticLoogies" / "OPLOOG"
- **Max supply**: 3728 tokens
- **Dynamic pricing**: Starts at `0.001 ETH`, increases by **0.2%** per mint (`price = price * 10002 / 10000`)
- **Payment recipient**: ETH is forwarded to a designated recipient address on each mint

### On-Chain Traits (stored per token)

| Trait | Type | Description |
|-------|------|-------------|
| `color` | `bytes3` | Random hex color for the Loogie body |
| `chubbiness` | `uint256` | Width of the Loogie body (range 35–90) |
| `mouthLength` | `uint256` | Calculated from chubbiness |

### Key Functions

| Function | Description |
|----------|-------------|
| `mintItem()` | Payable. Generates traits via deterministic randomness, mints the NFT, forwards payment, increases price for next mint. |
| `tokenURI(uint256 id)` | Returns a Base64-encoded JSON data URI with the SVG image embedded (`data:application/json;base64,...`). |
| `renderTokenById(uint256 id)` | **Public.** Returns the raw SVG string for a given token. Designed for composability — other contracts can call this to compose Loogies into larger SVG scenes. |

### Deterministic Randomness

Traits are generated using:

```solidity
keccak256(abi.encodePacked(tokenId, blockhash(block.number - 1), msg.sender, address(this)))
```

This is **not** cryptographically secure — it is predictable and suitable only for non-adversarial NFT trait generation.

### Helper Libraries

- **HexStrings.sol** — Converts a `uint256` to its hex string representation. Used internally for SVG attributes.
- **ToColor.sol** — Converts `bytes3` to a 6-character hex color string (e.g., `"a3f2b1"`). Used to render the Loogie's color in SVG.

### Dependencies

- **base64-sol**: On-chain Base64 encoding library used to encode JSON metadata and SVG into a data URI.
- **OpenZeppelin**: ERC-721 and related contracts.

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- `useScaffoldReadContract` - NOT ~~useScaffoldContractRead~~
- `useScaffoldWriteContract` - NOT ~~useScaffoldContractWrite~~
- `useScaffoldEventHistory` - for reading past events
- `useScaffoldContract` - for getting the contract instance directly

### Gallery Page (/loogies)

- Displays all minted NFTs in a gallery view with pagination.
- Includes a **Mint** button that calls `mintItem()` with the current price.

### Your Loogies Page (/your-loogies)

- Shows only the NFTs owned by the currently connected wallet.

### Token URI Decoding

The frontend decodes the Base64-encoded `tokenURI` to extract metadata and SVG:

```typescript
atob(tokenURI.substring(29))
```

The `substring(29)` strips the `data:application/json;base64,` prefix before decoding.

### UI Components

Use `@scaffold-ui/components` for web3 UI:
- `Address` - display ETH addresses with ENS resolution and blockie avatars
- `Balance` - show ETH balance

### Styling

Use **DaisyUI** classes for components (cards, buttons, badges, tables). The project uses Tailwind CSS with DaisyUI.

## Architecture Notes

- **Next.js App Router** (not Pages Router) - pages are at `app/<route>/page.tsx`
- **Import alias**: use `~~` for nextjs package imports (e.g., `import { ... } from "~~/hooks/scaffold-eth"`)
- After `yarn deploy`, contract ABIs auto-generate to `packages/nextjs/contracts/deployedContracts.ts`
- All artwork and metadata are stored on-chain — no IPFS, no off-chain servers
- SVG is built using `abi.encodePacked()` string concatenation
- Base64 encoding happens in-contract for both the JSON metadata and SVG image
- **No test files** are included in this challenge
- Hardhat optimizer is disabled by default

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
| `snake_case` | Hardhat deploy files (e.g., `00_deploy_your_collectible.ts`) |

## Key Warnings

- Do NOT use deprecated hook names (`useScaffoldContractRead`, `useScaffoldContractWrite`)
- Contract ABIs in `deployedContracts.ts` are auto-generated - do not edit manually
- `renderTokenById()` is intentionally `public` — this enables composability with other contracts
- The deterministic randomness is not cryptographically secure — it is predictable
- Dynamic pricing means each mint is more expensive than the last (0.2% increase)
- SVG generation uses `abi.encodePacked()` which can be gas-intensive for complex SVGs
- The `tokenURI` returns a `data:` URI, not an HTTP/IPFS URL
