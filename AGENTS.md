# AGENTS.md

## Challenge Overview

This is a SpeedRunEthereum challenge. The learner builds an NFT minting and transferring dApp using an ERC-721 contract (`YourCollectible`). The goal is to understand onchain ownership, compile and deploy smart contracts with Hardhat, interact with them via a Next.js frontend, and finally deploy to a public testnet.

The final deliverable: an app that lets users mint and transfer NFTs. Deploy contracts to a testnet, ship the frontend to Vercel, and submit the URL on SpeedRunEthereum.com.

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

# Deploy to testnet
yarn deploy --network sepolia

# Contract verification
yarn verify --network sepolia

# Account management
yarn generate       # Generate deployer account (encrypted private key)
yarn account        # View deployer account balances

# Frontend deployment
yarn vercel         # Deploy frontend to Vercel
yarn vercel --prod  # Redeploy to production URL
```

## Smart Contract: YourCollectible.sol

The single contract in this challenge. Key details:

- **Standard**: ERC-721 with ERC721Enumerable + ERC721URIStorage extensions
- **Inherits**: `ERC721`, `ERC721Enumerable`, `ERC721URIStorage`, `Ownable`
- **Token name/symbol**: "YourCollectible" / "YCB"
- **Base URI**: `https://ipfs.io/ipfs/`
- **Key function**: `mintItem(address to, string memory uri)` - mints a new token with incrementing `tokenIdCounter` and sets the token URI
- **No access control on minting** - anyone can call `mintItem`
- The override functions (`_update`, `_increaseBalance`, `tokenURI`, `supportsInterface`) resolve multiple inheritance between ERC721, ERC721Enumerable, and ERC721URIStorage

### ERC-721 Ownership Concepts (Core to This Challenge)

- `ownerOf(tokenId)` returns the current owner of a specific token
- `balanceOf(address)` returns how many tokens an address owns
- `tokenOfOwnerByIndex(address, index)` returns the token ID at a given index for an owner (from Enumerable)
- `transferFrom(from, to, tokenId)` transfers a token (caller must be owner or approved)
- `approve(to, tokenId)` approves another address to transfer a specific token
- `setApprovalForAll(operator, approved)` approves an operator for all tokens
- Every transfer emits a `Transfer(from, to, tokenId)` event

## Frontend Architecture

### Hook Usage (Scaffold-ETH 2 Hooks)

Use the correct hook names:
- `useScaffoldReadContract` - NOT ~~useScaffoldContractRead~~
- `useScaffoldWriteContract` - NOT ~~useScaffoldContractWrite~~
- `useScaffoldEventHistory` - for reading past events
- `useScaffoldContract` - for getting the contract instance directly

### How Minting Works (Frontend Flow)

1. `tokenIdCounter` is read from the contract to determine which metadata to use
2. Metadata is selected from `nftsMetadata` array (cycles through Buffalo, Zebra, Rhino, Fish, Flamingo, Godzilla)
3. Metadata is uploaded to IPFS via `/api/ipfs/add` API route
4. `mintItem(connectedAddress, ipfsPath)` is called on the contract
5. The NFT card renders with image, name, description, attributes from IPFS metadata

### How Transfers Work (Frontend Flow)

1. `NFTCard` component has an `AddressInput` for the receiver
2. Calls `transferFrom(owner, receiverAddress, tokenId)` on the contract
3. The `Transfers` page reads all `Transfer` events using `useScaffoldEventHistory`

### UI Components

Use `@scaffold-ui/components` for web3 UI:
- `Address` - display ETH addresses with ENS resolution and blockie avatars
- `AddressInput` - input with address validation and ENS resolution
- `Balance` - show ETH balance
- `EtherInput` - number input with ETH/USD toggle

### Styling

Use **DaisyUI** classes for components (cards, buttons, badges, tables). The project uses Tailwind CSS with DaisyUI.

```tsx
// Correct
<button className="btn btn-secondary">Mint NFT</button>
<div className="card card-compact bg-base-100 shadow-lg">...</div>

// Avoid raw Tailwind when DaisyUI has a component class
```

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

- Do NOT use deprecated hook names (`useScaffoldContractRead`, `useScaffoldContractWrite`)
- Contract ABIs in `deployedContracts.ts` are auto-generated - do not edit manually
- The `mintItem` function has no access control by design (anyone can mint)
- NFT metadata cycles through 6 predefined items; `tokenIdCounter % nftsMetadata.length` determines which one
- IPFS operations require the Next.js dev server running (`yarn start`)
