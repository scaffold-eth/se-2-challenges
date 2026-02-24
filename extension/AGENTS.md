# AGENTS.md

## What is SpeedRunEthereum?

[SpeedRunEthereum](https://speedrunethereum.com/) is a hands-on learning platform where developers learn Solidity and Ethereum development by building real dApps through progressive challenges. Instead of passive tutorials, each challenge teaches a key concept: from tokens and crowdfunding to DEXs, oracles, lending, and zero-knowledge proofs. All challenges use Scaffold-ETH 2 as the development framework. Completed challenges become public portfolio items.

**This extension is one of the SpeedRunEthereum challenges.** It covers **Tokenization**.

## Challenge Overview

The learner builds an NFT minting and transferring dApp using an ERC-721 contract (`YourCollectible`). The goal is to understand onchain ownership, compile and deploy smart contracts with Hardhat, interact with them via a Next.js frontend, and finally deploy to a public testnet.

The final deliverable: an app that lets users mint and transfer NFTs. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

## Why Tokenization Matters

NFTs are **not** just profile-picture JPEGs. The ERC-721 standard is a building block for representing unique onchain ownership, and that unlocks **composability** - the ability for any smart contract or app to recognize, transfer, and build on top of that ownership.

Real-world examples of tokenization beyond images:

- **ENS (Ethereum Name Service)** - Domain names as NFTs. `vitalik.eth` resolves wallet addresses, content hashes, and more. Visit [vitalik.eth.limo](https://vitalik.eth.limo) to see a contentHash record resolving to a personal webpage. ENS improves upon DNS by making names programmable and composable.
- **Uniswap V3 LP Positions** - Each liquidity provider's position is a unique NFT tracking their share of a pool. Financial positions as composable tokens.
- **Real-World Assets (RWAs)** - Stocks, bonds, gold, real estate can be tokenized. The token acts as a digital claim; for real-world effect, a legal framework must link onchain transfers to off-chain rights.
- **Blockchain-native assets** - Art, game items, concert tickets designed for onchain verification. Here the token *is* the thing - globally transferable, permissionless, and composable across marketplaces, auctions, lending, and games.

**Key insight**: Even if the NFT itself represents speculation on a "worthless" image, the composability of the standard means it can be plugged into DeFi protocols, fractionalized, used as collateral, or built upon in ways the original creator never imagined. Composability is what makes tokenization powerful.

**Who can tokenize?** Only the legitimate owner or authorized issuer. Without control of the underlying thing, a token is unofficial fan art, not enforceable rights.

## Project Structure

This is a Scaffold-ETH 2 extension (Hardhat flavor). When instantiated with `create-eth`, it produces a monorepo:

```
packages/
  hardhat/           # Solidity contracts, deploy scripts, tests
    contracts/
      YourCollectible.sol    # ERC-721 NFT contract (the main contract)
    deploy/
      01_deploy_your_collectible.ts  # Hardhat-deploy script
    test/
      YourCollectible.ts     # Challenge grading tests
  nextjs/            # React frontend (Next.js App Router)
    app/
      myNFTs/                # Mint NFTs and view holdings
        page.tsx
        _components/
          MyHoldings.tsx      # Fetches and displays user's NFTs
          NFTCard.tsx         # Individual NFT card with transfer UI
      transfers/
        page.tsx             # Shows all Transfer events
      ipfsUpload/page.tsx
      ipfsDownload/page.tsx
    utils/tokenization/
      nftsMetadata.ts        # Predefined NFT metadata (Buffalo, Zebra, Rhino, etc.)
      ipfs-fetch.ts          # IPFS upload/download helpers via API routes
      ipfs.ts
    app/api/ipfs/            # API routes for IPFS pinning
```

## Common Commands

```bash
# Development workflow (run each in a separate terminal)
yarn chain          # Start local Hardhat blockchain
yarn deploy         # Deploy contracts to local network
yarn start          # Start Next.js frontend at http://localhost:3000

# Testing
yarn test           # Run challenge grading tests (packages/hardhat/test/)

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

## Smart Contract: YourCollectible.sol

ERC-721 contract with Enumerable + URIStorage extensions. Token name/symbol: "YourCollectible" / "YCB". Base URI: `https://ipfs.io/ipfs/`.

- **Key function**: `mintItem(address to, string memory uri)` - mints with incrementing `tokenIdCounter`, sets token URI. No access control (anyone can mint).
- **Ownership model**: Standard ERC-721 - `ownerOf`, `balanceOf`, `transferFrom`, `approve`, `setApprovalForAll`. Every transfer emits a `Transfer` event. Enumerable extension adds `tokenOfOwnerByIndex` for iterating an owner's tokens.
- **Inheritance overrides**: `_update`, `_increaseBalance`, `tokenURI`, `supportsInterface` resolve multiple inheritance between the three ERC-721 extensions.

## Frontend Architecture

### Scaffold-ETH 2 Hooks

Use the correct hook names: `useScaffoldReadContract`, `useScaffoldWriteContract`, `useScaffoldEventHistory`, `useScaffoldContract`. Do NOT use deprecated names (`useScaffoldContractRead`, `useScaffoldContractWrite`).

### Frontend Flows

- **Minting**: Reads `tokenIdCounter` to pick metadata from `nftsMetadata` (cycles through 6 animals), uploads to IPFS via `/api/ipfs/add`, then calls `mintItem(address, ipfsPath)`.
- **Transfers**: `NFTCard` has an `AddressInput` for the receiver, calls `transferFrom`. The Transfers page shows all `Transfer` events via `useScaffoldEventHistory`.

### UI & Styling

- Use `@scaffold-ui/components` for web3 UI (`Address`, `AddressInput`, `Balance`, `EtherInput`)
- Use **DaisyUI** classes for components (cards, buttons, badges, tables) with Tailwind CSS

## Architecture Notes

- **Next.js App Router** (not Pages Router) - pages are at `app/<route>/page.tsx`
- **Import alias**: use `~~` for nextjs package imports (e.g., `import { ... } from "~~/hooks/scaffold-eth"`)
- After `yarn deploy`, contract ABIs auto-generate to `packages/nextjs/contracts/deployedContracts.ts`
- IPFS operations go through Next.js API routes (`/api/ipfs/add`, `/api/ipfs/get-metadata`), not direct IPFS calls
- Burner wallets are available on localhost only by default. For testnet, users connect MetaMask or enable burner wallets via `onlyLocalBurnerWallet: false` in `scaffold.config.ts`

## Testing

The grading tests (`packages/hardhat/test/YourCollectible.ts`) verify:
1. Contract deploys successfully
2. `mintItem()` can mint an NFT and increases the owner's balance
3. `tokenOfOwnerByIndex()` tracks tokens correctly

Run with `yarn test`. These same tests are used by the SpeedRunEthereum autograder.

## Deployment Checklist (Testnet)

1. Set `defaultNetwork` to `sepolia` in `packages/hardhat/hardhat.config.ts` (or use `--network sepolia`)
2. `yarn generate` to create deployer account
3. Fund deployer with testnet ETH from a faucet
4. `yarn deploy` to deploy contracts
5. Set `targetNetwork` to `chains.sepolia` in `packages/nextjs/scaffold.config.ts`
6. `yarn vercel` to deploy frontend
7. `yarn verify --network sepolia` to verify contract on Etherscan

## Code Style

| Style | Category |
|-------|----------|
| `UpperCamelCase` | Components, types, interfaces, contracts |
| `lowerCamelCase` | Variables, functions, parameters |
| `CONSTANT_CASE` | Constants, enum values |
| `snake_case` | Hardhat deploy files (e.g., `01_deploy_your_collectible.ts`) |

## Key Warnings

- Contract ABIs in `deployedContracts.ts` are auto-generated - do not edit manually
- The `mintItem` function has no access control by design (anyone can mint)
- NFT metadata cycles through 6 predefined items; `tokenIdCounter % nftsMetadata.length` determines which one
- IPFS operations require the Next.js dev server running (`yarn start`)
