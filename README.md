# 🏗 Scaffold-ETH 2 Challenges

**Learn how to use 🏗 Scaffold-ETH 2 to create decentralized applications on Ethereum. 🚀**

---

## 🚩 Challenge 0: 🎟 Simple NFT Example

🎫 Create a simple NFT to learn the basics of 🏗 scaffold-eth. You'll use 👷‍♀️ HardHat to compile and deploy smart contracts. Then, you'll use a template React app full of important Ethereum components and hooks. Finally, you'll deploy an NFT to a public network to share with friends! 🚀

https://github.com/scaffold-eth/se-2-challenges/tree/challenge-0-simple-nft

---

## 🚩 Challenge 1: 🔏 Decentralized Staking App

🦸 A superpower of Ethereum is allowing you, the builder, to create a simple set of rules that an adversarial group of players can use to work together. In this challenge, you create a decentralized application where users can coordinate a group funding effort. If the users cooperate, the money is collected in a second smart contract. If they defect, the worst that can happen is everyone gets their money back. The users only have to trust the code.

https://github.com/scaffold-eth/se-2-challenges/tree/challenge-1-decentralized-staking

---

## 🚩 Challenge 2: 🏵 Token Vendor

🤖 Smart contracts are kind of like "always on" vending machines that anyone can access. Let's make a decentralized, digital currency. Then, let's build an unstoppable vending machine that will buy and sell the currency. We'll learn about the "approve" pattern for ERC20s and how contract to contract interactions work.

https://github.com/scaffold-eth/se-2-challenges/tree/challenge-2-token-vendor

---

## 🚩 Challenge 3: 🎲 Dice Game

🎰 Randomness is tricky on a public deterministic blockchain. In this challenge you will explore creating random numbers using block hash and how that may be exploitable. Attack the dice game with your own contract by predicting the randomness ahead of time to always roll a winner!

https://github.com/scaffold-eth/se-2-challenges/tree/challenge-3-dice-game

---

## 🚩 Challenge 4: ⚖️ Build a DEX Challenge

💵 Build an exchange that swaps ETH to tokens and tokens to ETH. 💰 This is possible because the smart contract holds reserves of both assets and has a price function based on the ratio of the reserves. Liquidity providers are issued a token that represents their share of the reserves and fees...

DEX Telegram Channel: https://t.me/+_NeUIJ664Tc1MzIx

https://github.com/scaffold-eth/se-2-challenges/tree/challenge-4-dex

---

## 🎉 Checkpoint: Eligible to join 🏰️ BuidlGuidl

The BuidlGuidl is a curated group of Ethereum builders creating products, prototypes, and tutorials to enrich the web3 ecosystem. A place to show off your builds and meet other builders. Start crafting your Web3 portfolio by submitting your DEX, Multisig or SVG NFT build.

https://buidlguidl.com/

---

## 🚩 Challenge 5: 📺 State Channel Application Challenge

🛣️ The Ethereum blockchain has great decentralization & security properties but these properties come at a price: transaction throughput is low, and transactions can be expensive. This makes many traditional web applications infeasible on a blockchain... or does it? State channels look to solve these problems by allowing participants to securely transact off-chain while keeping interaction with Ethereum Mainnet at a minimum.

State Channels Telegram Channel: https://t.me/+k0eUYngV2H0zYWUx

https://github.com/scaffold-eth/se-2-challenges/tree/challenge-5-state-channels

---

## 💡 Contributing: Guide and Hints to create New Challenges

### 1. Learn about SE-2 Extensions
Go to [SE-2 Extensions Documentation](https://docs.scaffoldeth.io/extensions/createExtensions) and familiarize yourself with the way extensions work by watching the video and reading the overview.

### 2. Follow the steps to create an extension
Scroll down to the section titled [Developing An Advanced Extension](https://docs.scaffoldeth.io/extensions/createExtensions#developing-an-advanced-extension) and follow the instructions all the way down to when you run the `yarn cli` command. 

Right after running the command you will have a directory where you can begin to add your changes specific to your challenge but first you may find it helpful to start by copying over the [base-challenge-template](https://github.com/scaffold-eth/se-2-challenges/tree/base-challenge-template) files inside the `extension` directory as this will help to maintain uniformity with other challenges. The files in the template are marked with `CHALLENGE-TODO` comments to help you find anywhere that needs updating using file search.

Now you can make your challenge-specific edits by adding contracts, tests and front-end file changes.

Don't forget to create (or edit existing) [template files](https://docs.scaffoldeth.io/extensions/createExtensions#template-files-and-args) for any changes that require it. If you miss any you will get a warning at the next step that will inform you which files are missing so don't worry too much.

### 3. Building and testing your extension
Now when you get to the `yarn create-extension {projectName}` step you should see in the terminal all files that were created and any missing template files. Add any missing template files and continue to follow the instructions, especially the [local testing](https://docs.scaffoldeth.io/extensions/createExtensions#local-testing) section!

Don't forget to add a README.md to the top level of your extension. It should match what you put in the `extraContents` variable in `extension/README.md.args.mjs`.

Iterate as necessary, repeating the steps, to get it just right.

### 4. Submit a PR
Once you have iterated your challenge to perfection, you can ask a maintainer to add a branch for your challenge and then submit a pull request to that branch. Expect to make a few passes of revisions as we test these challenges extensively.
