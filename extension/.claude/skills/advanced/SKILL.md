---
name: advanced
description: Implement advanced Solidity features. Choose minimum 3 features from curated list. Track progress and run multiple times to add more features.
---

# Advanced Solidity Features

Read and follow `.ai/instructions/advanced-content.md` for detailed guidance.

## Files

- **Features**: `.ai/features/tokenization.md`
- **Progress**: `.challenge-ai/advanced-progress.json`
- **Contract**: `packages/hardhat/contracts/YourCollectible.sol`

## Subagents (always use)

- **advanced-tracker**: All progress file operations (read/init/update)
- **feature-selector**: Ask 3 questions, recommend features

## Startup

1. Check progress via advanced-tracker
2. Read `.ai/features/tokenization.md`
3. If in-progress feature exists → resume implementation
4. If starting/adding new → run feature-selector → user picks min 3 → save to progress
5. Implement features one by one

## Per-Feature Flow

1. Mark `in_progress` via tracker
2. Introduce: what it does, key concepts, dependencies
3. Explain implementation requirements (guide user to try first)
4. If stuck → provide full code with security notes
5. Verify: check code, suggest `yarn hardhat compile`
6. Mark `completed` via tracker
7. Next feature or finish

## Key Rules

- Security first: access control, validation, reentrancy for every feature
- User tries first, you help when needed
- Repeatable: `/advanced` can always add more features
