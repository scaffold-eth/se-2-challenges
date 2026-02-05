# Tokenization Challenge - Advanced Solidity Features

Features for building advanced NFT smart contracts. All features are Solidity/on-chain only.

---

## Core NFT Functionality

### dynamic-nfts
- **Title**: Dynamic NFTs
- **Description**: Token metadata that changes based on time, user actions, or external data (weather, game state, etc.). Implement tokenURI logic that returns different metadata based on contract state or external oracles.
- **Difficulty**: advanced
- **Dependencies**: []
- **Implementation Hints**:
  - Override `tokenURI()` to generate dynamic metadata
  - Store changeable state per token (level, status, timestamp)
  - Consider Chainlink oracles for external data
  - Emit events when metadata changes
  - Gas-efficient state storage patterns

### burn-mechanism
- **Title**: Burn Mechanism
- **Description**: Allow token owners to permanently destroy their NFTs with proper event emission and state management. Reduces total supply and removes token from circulation.
- **Difficulty**: beginner
- **Dependencies**: []
- **Implementation Hints**:
  - Implement `burn(uint256 tokenId)` function
  - Check `msg.sender` is owner or approved
  - Use `_burn()` from ERC-721
  - Update total supply counter
  - Emit custom burn event with reason/metadata

### onchain-svg
- **Title**: On-chain SVG Generation
- **Description**: Generate NFT artwork entirely on-chain using SVG. No IPFS required - metadata and image stored in contract code.
- **Difficulty**: intermediate
- **Dependencies**: []
- **Implementation Hints**:
  - Generate SVG string in Solidity
  - Use Base64 encoding for data URI
  - Return JSON metadata with embedded SVG
  - Consider gas costs for complex SVGs
  - Use libraries like `Base64.sol`

### randomized-minting
- **Title**: Randomized Minting
- **Description**: Use Chainlink VRF or blockhash for provably fair random trait generation. Ensures fair distribution of rare traits.
- **Difficulty**: advanced
- **Dependencies**: []
- **Implementation Hints**:
  - Integrate Chainlink VRF V2
  - Two-step minting: request, then reveal
  - Store VRF request IDs per token
  - Handle VRF callback `fulfillRandomWords()`
  - Fallback to blockhash if no VRF

### evolution-system
- **Title**: Evolution System
- **Description**: NFTs that level up, evolve, or change based on holding time or interactions. Track progression on-chain.
- **Difficulty**: intermediate
- **Dependencies**: ["dynamic-nfts"]
- **Implementation Hints**:
  - Store level/XP per token
  - Track mint/transfer timestamps
  - Functions: `gainExperience()`, `evolve()`
  - Calculate time-based bonuses
  - Emit evolution events

### breeding-composability
- **Title**: Breeding/Composability
- **Description**: Combine two NFTs to create a new one with merged traits. Requires ownership of both parent NFTs.
- **Difficulty**: advanced
- **Dependencies**: ["erc721-enumerable"]
- **Implementation Hints**:
  - `breed(uint256 parent1, uint256 parent2)` function
  - Check ownership of both parents
  - Merge trait data from parents
  - Mint new child NFT
  - Optional: burn parents or lock them

---

## Minting & Distribution

### whitelist-merkle
- **Title**: Whitelist/Allowlist (Merkle Tree)
- **Description**: Merkle tree-based whitelist for gas-efficient presale access. Verify addresses without storing full list on-chain.
- **Difficulty**: intermediate
- **Dependencies**: []
- **Implementation Hints**:
  - Store Merkle root on-chain
  - Generate tree off-chain with addresses
  - `mintWhitelist(bytes32[] proof)` function
  - Use OpenZeppelin MerkleProof library
  - Track addresses that already claimed

### tiered-pricing
- **Title**: Tiered Pricing
- **Description**: Different mint prices based on time, quantity, or whitelist tier. Dynamic pricing logic.
- **Difficulty**: intermediate
- **Dependencies**: []
- **Implementation Hints**:
  - Mapping for tier → price
  - `getCurrentPrice()` view function
  - Check tier eligibility in mint function
  - Time-based price decay
  - Quantity-based discounts (bonding curve)

### timed-releases
- **Title**: Timed Releases
- **Description**: Automatic phases (presale, public sale, sold out) with different rules per phase. Time-locked minting stages.
- **Difficulty**: beginner
- **Dependencies**: []
- **Implementation Hints**:
  - Enum for phases: `Presale`, `Public`, `Ended`
  - Store start/end timestamps per phase
  - Modifier: `onlyDuringPhase(Phase)`
  - `getCurrentPhase()` view function
  - Owner can advance phase manually

### airdrops
- **Title**: Batch Airdrops
- **Description**: Batch minting to multiple addresses efficiently. Owner can distribute NFTs to array of recipients.
- **Difficulty**: beginner
- **Dependencies**: []
- **Implementation Hints**:
  - `airdrop(address[] recipients)` function
  - Loop through array, mint to each
  - Consider gas limits (max ~200 addresses)
  - Use `_safeMint()` or `_mint()`
  - Emit batch event

### supply-caps
- **Title**: Supply Caps & Limits
- **Description**: Per-wallet limits, total supply caps, and scarcity mechanics. Enforce maximum mints per address and collection.
- **Difficulty**: beginner
- **Dependencies**: []
- **Implementation Hints**:
  - `maxSupply` constant or variable
  - Mapping: `address → mintCount`
  - Check limits in mint function
  - `require(totalSupply < maxSupply)`
  - Per-wallet cap: `require(balanceOf < limit)`

### claim-periods
- **Title**: Claim Periods
- **Description**: Time-locked claiming for specific user groups. Users can claim allocated NFTs during designated windows.
- **Difficulty**: intermediate
- **Dependencies**: []
- **Implementation Hints**:
  - Mapping: `address → allocation`
  - Store claim window start/end
  - `claim()` function checks timestamp
  - Mark allocation as claimed
  - Prevent double claims

---

## Economic Features

### erc2981-royalties
- **Title**: ERC-2981 Royalties
- **Description**: Creator royalties on secondary sales. Standard interface for OpenSea, Blur, and other marketplaces.
- **Difficulty**: beginner
- **Dependencies**: []
- **Implementation Hints**:
  - Implement `IERC2981` interface
  - Store `royaltyReceiver` and `royaltyBps`
  - `royaltyInfo()` returns receiver and amount
  - Typical: 5-10% (500-1000 basis points)
  - Use OpenZeppelin ERC2981 extension

### revenue-splits
- **Title**: Revenue Splits
- **Description**: Automatically split mint proceeds among team members. PaymentSplitter pattern for fair distribution.
- **Difficulty**: intermediate
- **Dependencies**: []
- **Implementation Hints**:
  - Use OpenZeppelin `PaymentSplitter`
  - Deploy splitter, NFT contract sends funds
  - Or: implement split logic in contract
  - Store payees and shares
  - `withdraw()` function for each payee

### staking
- **Title**: NFT Staking
- **Description**: Lock NFTs to earn ERC-20 rewards over time. Stakers can unstake and claim accrued rewards.
- **Difficulty**: advanced
- **Dependencies**: []
- **Implementation Hints**:
  - Separate staking contract or integrated
  - Track staked tokens: `mapping(uint256 => address)`
  - Calculate rewards: time staked × rate
  - `stake()`, `unstake()`, `claimRewards()`
  - Prevent transfer while staked

### nft-swapping
- **Title**: NFT Swapping
- **Description**: Peer-to-peer trustless NFT swaps without marketplaces. Create and accept swap offers on-chain.
- **Difficulty**: intermediate
- **Dependencies**: []
- **Implementation Hints**:
  - Store offers: `offerId → Offer struct`
  - Offer: `{from, tokenOffered, to, tokenWanted}`
  - `createOffer()`, `acceptOffer()`, `cancelOffer()`
  - Use `transferFrom()` for atomic swap
  - Approval required from both parties

### rarity-system
- **Title**: On-chain Rarity System
- **Description**: Weighted trait distribution with verifiable rarity scores. Rarity calculated and stored on-chain.
- **Difficulty**: intermediate
- **Dependencies**: []
- **Implementation Hints**:
  - Store trait counts: `mapping(trait => count)`
  - Calculate rarity score in contract
  - `getRarityScore(uint256 tokenId)` view
  - Weight formula: `1 / (traitCount / totalSupply)`
  - Sum scores across all traits

---

## Advanced Smart Contract Patterns

### access-control
- **Title**: Role-based Access Control
- **Description**: Role-based permissions (admin, minter, pauser) using OpenZeppelin AccessControl. Fine-grained permission system.
- **Difficulty**: intermediate
- **Dependencies**: []
- **Implementation Hints**:
  - Use OpenZeppelin `AccessControl`
  - Define roles: `MINTER_ROLE`, `PAUSER_ROLE`
  - Modifiers: `onlyRole(MINTER_ROLE)`
  - Grant roles in constructor or admin function
  - `DEFAULT_ADMIN_ROLE` can grant/revoke

### pausable
- **Title**: Pausable Pattern
- **Description**: Emergency pause mechanism for transfers and minting. Admin can halt operations during security incidents.
- **Difficulty**: beginner
- **Dependencies**: []
- **Implementation Hints**:
  - Use OpenZeppelin `Pausable`
  - Modifier: `whenNotPaused`
  - `pause()` and `unpause()` admin functions
  - Apply to: minting, transfers, burns
  - Emit events on state change

### reentrancy-guards
- **Title**: Reentrancy Guards
- **Description**: Protect against reentrancy attacks on all state-changing functions. Essential for functions handling ETH.
- **Difficulty**: beginner
- **Dependencies**: []
- **Implementation Hints**:
  - Use OpenZeppelin `ReentrancyGuard`
  - Modifier: `nonReentrant`
  - Apply to: mint, withdraw, swap functions
  - Checks-Effects-Interactions pattern
  - Protect any function with external calls

### erc721-enumerable
- **Title**: ERC-721 Enumerable
- **Description**: Track all tokens and enable advanced querying. Iterate over tokens by owner or entire collection.
- **Difficulty**: beginner
- **Dependencies**: []
- **Implementation Hints**:
  - Inherit `ERC721Enumerable`
  - Adds: `totalSupply()`, `tokenByIndex()`
  - `tokenOfOwnerByIndex(owner, index)`
  - Higher gas costs on transfers
  - Required for some features (breeding, etc)

### upgradeable-contracts
- **Title**: Upgradeable Contracts (Proxy Pattern)
- **Description**: Use proxy patterns (UUPS, Transparent) for future improvements. Upgrade logic without changing address.
- **Difficulty**: advanced
- **Dependencies**: []
- **Implementation Hints**:
  - Use OpenZeppelin Upgradeable contracts
  - UUPS: upgrade logic in implementation
  - Transparent: upgrade logic in proxy
  - Initialize instead of constructor
  - Storage layout must be compatible

### multi-chain
- **Title**: Multi-chain Deployment
- **Description**: Deploy to multiple networks with LayerZero or native bridging. Cross-chain NFT transfers.
- **Difficulty**: advanced
- **Dependencies**: []
- **Implementation Hints**:
  - LayerZero OApp pattern for ONFT
  - Implement `_lzSend()` and `_lzReceive()`
  - Store origin chain and token ID
  - Handle fees for cross-chain messages
  - Test on testnets first (Goerli → Mumbai)

---

## Categories

- **Core Functionality**: dynamic-nfts, burn-mechanism, onchain-svg, randomized-minting, evolution-system, breeding-composability
- **Distribution**: whitelist-merkle, tiered-pricing, timed-releases, airdrops, supply-caps, claim-periods
- **Economic**: erc2981-royalties, revenue-splits, staking, nft-swapping, rarity-system
- **Security & Patterns**: access-control, pausable, reentrancy-guards, erc721-enumerable, upgradeable-contracts, multi-chain

---

## Suggested Feature Combinations

**Beginner Path** (security fundamentals):
- burn-mechanism + pausable + reentrancy-guards

**Intermediate Path** (minting & economics):
- whitelist-merkle + tiered-pricing + erc2981-royalties

**Advanced Path** (dynamic & complex):
- dynamic-nfts + randomized-minting + staking

**Comprehensive Platform**:
- erc721-enumerable + access-control + whitelist-merkle + erc2981-royalties + staking

**Generative Art Focus**:
- onchain-svg + randomized-minting + breeding-composability + rarity-system

**DeFi Integration**:
- staking + revenue-splits + nft-swapping + erc721-enumerable
