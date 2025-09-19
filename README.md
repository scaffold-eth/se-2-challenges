# 🚩 Challenge: 🎟 Tokenization

![readme](https://raw.githubusercontent.com/scaffold-eth/se-2-challenges/challenge-tokenization/extension/packages/nextjs/public/hero.png)

📚 This tutorial is meant for developers that already understand the [ 🖍️ basics ](https://www.youtube.com/watch?v=MlJPjJQZtC8).

🧑‍🏫 If you would like a more gentle introduction for developers, watch our 15 video [🎥 Web2 to Web3](https://www.youtube.com/playlist?list=PLJz1HruEnenAf80uOfDwBPqaliJkjKg69) series.

---

🎫 Tokenize unique items:

👷‍♀️ You'll compile and deploy your first smart contracts. Then, you'll use a template NextJS app full of important Ethereum components and hooks. Finally, you'll deploy a non-fungible token to a public network where you can send it to anyone! 🚀

🌟 The final deliverable is an app that lets users mint and transfer NFTs and understand onchain ownership. Deploy your contracts to a testnet, then build and upload your app to a public web server. Submit the url on [SpeedRunEthereum.com](https://speedrunethereum.com)!

💬 Meet other builders working on this challenge and get help in the [Challenge Telegram](https://t.me/+bstCpWY7yPBhOWUx)!

🤖 If you have any questions during your Challenge, you can try out the [Challenge AI assistant](https://scaffold-eth-assistant.streamlit.app/), and get answers to your Challenge/Scaffold-ETH questions. Please reach us in Telegram if something feels wrong!

<details markdown='1'><summary>❓ Wondering what "tokenization" means?</summary>
Tokenization is like giving anything a digital passport you can carry in your wallet. It proves who owns it, lets you hand it off in a click, and lets apps recognize it automatically. In this challenge you’ll mint ERC‑721 tokens (NFTs): each token is one‑of‑one, owned by a single address (what `ownerOf(tokenId)` returns). Transfers are atomic, instant, traceable, and run by code.

– **Real‑World Assets (RWAs)**: Think stocks, bonds, gold, and real estate. If these are tokenized, the token acts as a digital claim or registry entry. For real‑world effect, an issuer/custodian or legal framework must link onchain transfers to off‑chain rights; without that bridge, it’s a collectible — not a legal transfer.

– Who has the right to tokenize?: The legitimate owner or authorized issuer. If you don’t control the thing, your token is unofficial fan art — not enforceable rights.

– **Blockchain‑native assets**: Some things are born onchain — art, game items, ENS names, fully‑onchain media, and even concert tickets designed for onchain verification. Here, the token is the thing. That makes them globally transferable, permissionless, and composable — plug them into marketplaces, auctions, lending, or games. As the world moves onchain we’ll see more native experiences — like tickets that verify at the door, auto‑split royalties on resales, and unlock perks across apps.
</details>

---

🚫 **"Wait, aren't NFTs just monkey JPEGS?"** That couldn't be further from the truth! While some NFTs are nothing more than metadata pointing to an image, the important part is to realize how assets on Ethereum unlock composability. 

🌐 Look at how ENS is improving upon the Domain Name System (DNS aka website addresses). These are just NFTs but they carry a lot of usefulness. The same usefulness that is unlocked by not having to remember to type 64.233.180.138 to get to Google.com is unlocked by these ENS names but the usefulness goes further than that. You can use these ENS names to alias wallet addresses as well. Check out the ENS record for [vitalik.eth](https://app.ens.domains/vitalik.eth) to see how there are many records - some for addresses, some for content. Try going to [vitalik.eth.limo](https://vitalik.eth.limo) and see how the contentHash record resolves to his personal webpage. 

🦄 Or checkout how Uniswap V3 is [using NFTs](https://uniswapv3book.com/milestone_6/nft-manager.html) to track each liquidity providers portion in the pool. Don't worry if you don't understand all those words yet, just realize that this is a big deal to represent ownership of assets this way. 

♻️ Even if the NFT itself is completely inert and reflects complete speculation on a "worthless" image, you can still use that NFT in other smart contracts to build interesting projects like what they have done at [PunkStrategy](https://www.punkstrategy.fun/) where you can buy tokens in a protocol that gives you fractional exposure to CryptoPunk NFTs while also having part in a strategy that automatically uses profit from token sales to buy the lowest valued Punk on the market, then relists it at a 20% premium - over and over again, forever! 

🔓 Composability unlocks all of this and so much more!

🚀 Are you ready? You’re about to mint something the entire internet can see, trade, and build on.

<details><summary>But wait! Wait does "NFT" stand for?</summary>
NFT stands for Non-Fungible Token. Non-fungible means that each token is unique. Fungible tokens (often represented as ERC-20s) are all the same. Each one looks and acts the same and has the same abilities. With NFTs there is something unique about each token. That is why they do well to express unique names, images (monkey JPEGS), DEX liquidity positions, and maybe some day real estate parcels.
</details>

## Checkpoint 0: 📦 Environment 📚

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then download the challenge to your computer and install dependencies by running:

```sh
npx create-eth@1.0.2 -e challenge-tokenization challenge-tokenization
cd challenge-tokenization
```

> in the same terminal, start your local network (a blockchain emulator in your computer):

```sh
yarn chain
```

> in a second terminal window, 🛰 deploy your contract (locally):

```sh
cd challenge-tokenization
yarn deploy
```

> in a third terminal window, start your 📱 frontend:

```sh
cd challenge-tokenization
yarn start
```

📱 Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Checkpoint 1: ⛽️ Gas & Wallets 👛

> ⛽️ Gas is the tiny fee that powers your transactions—like postage for the blockchain. Grab test funds from the faucet so you can interact onchain.

![gas&wallet](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/912d0d4b-db34-49d3-bd7d-7ca0ab18eb66)

> 🦊 At first, **don't** connect MetaMask. If you are already connected, click **Disconnect**:

<p>
  <img src="https://github.com/scaffold-eth/se-2-challenges/assets/80153681/2c7a1e40-50ad-4c20-ba3e-a56eff4b892b" width="33%" />
  <img src="https://github.com/scaffold-eth/se-2-challenges/assets/80153681/1bcf9752-e8ae-4db6-a0a6-5dc774abe46c" width="33%" />
</p>

> 🔥 We’ll use burner wallets on localhost. They’re disposable wallets that auto-sign transactions so you can keep building.

> 👛 Explore burner wallets in 🏗 Scaffold‑ETH 2: open an incognito window and visit http://localhost:3000. You’ll see a totally new address in the top‑right. Copy it and send test funds from your first window using the **Faucet** button (bottom‑left):

![icognito&webBrowser](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/fd191447-a31f-4c03-a36f-936bfb70c2a1)

> 👨🏻‍🚒 When you close the incognito window, that account is gone forever. Burner wallets are perfect for local dev; you’ll switch to a permanent wallet on public networks.

---

## Checkpoint 2: 🖨 Minting

🦓 In this challenge we will be minting (or creating) collectible Buffalo, Zebra and Rhino NFTs. Their metadata is stored on [IPFS](https://ipfs.tech/). These won't feign any real value but what price can you put on your own understanding of intricate blockchain ownership designs? Face it, it's **priceless!**

> ✏️ Time to create something new. Click **MINT NFT** in the `My NFTs` tab to mint an ERC‑721 token — your unique, onchain collectible.

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/74cf02f2-4c1b-4278-9841-f19f668e0b1e)

👀 You should see your NFTs start to show up:

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/63dabceb-ad42-4c09-8e5d-a0139939e32d)

👛 Open an incognito window and navigate to http://localhost:3000.

🎟 Try a transfer! Send a token to the incognito window address using the UI:

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/3b92fb50-d43f-48a8-838c-c45c443b0b71)

👛 Try to mint a token from the incognito window.

> Can you mint a token with no funds in this address? You might need to grab funds from the faucet to pay for the gas!

🕵🏻‍♂️ Inspect the `Debug Contracts` tab to figure out what address is the owner of a specific token (`ownerOf(tokenId)`) in `YourCollectible`.

🔏 You can also check out your smart contract `YourCollectible.sol` in `packages/hardhat/contracts`.

💼 Take a quick look at your deploy script `01_deploy_your_collectible.ts` in `packages/hardhat/deploy`.

### Onchain Ownership 101

- **What is ownership?** Onchain ownership of a unique item is whoever `ownerOf(tokenId)` returns.
- **Who can transfer?** Only the owner or an approved operator can transfer a token.
- **What happens on transfer?** Ownership moves atomically to the new address and a `Transfer` event is emitted.
- **How do approvals work?** Use `approve` for a single token or `setApprovalForAll` for an operator across all your tokens.
- **How to count holdings?** `balanceOf(address)` shows how many unique tokens an address owns.

📝 If you want to edit the frontend, navigate to `packages/nextjs/app` and open the specific page you want to modify. For instance: `/myNFTs/page.tsx`. For guidance on [routing](https://nextjs.org/docs/app/building-your-application/routing/defining-routes) and configuring [pages/layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) checkout the Next.js documentation.

---

## Checkpoint 3: 💾 Deploy your contract! 🛰

🛰 Ready to go public (on testnet)? Let’s ship it.

> Change the defaultNetwork in `packages/hardhat/hardhat.config.ts` to `sepolia`.

![chall-0-hardhat-config](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/f94b47d8-aa51-46eb-9c9e-7536559a5d45)

🔐 Generate a deployer address with `yarn generate`. This creates a fresh deployer and stores the mnemonic locally. You will be prompted to enter a password, which will be used to encrypt your private key. **Make sure to remember this password, as you'll need it for future deployments and account queries.**

> This local account deploys your contracts — no need to paste personal private keys.

![chall-0-yarn-generate](https://github.com/scaffold-eth/se-2-challenges/assets/2486142/133f5701-e575-4cc2-904f-cdc83ae86d94)

👩‍🚀 Use `yarn account` to check balances and addresses quickly.

![chall-0-yarn-account](https://github.com/scaffold-eth/se-2-challenges/assets/2486142/c34df8c9-9793-4a76-849b-170fae7fd0f0)

⛽️ Fund your deployer with testnet ETH from a faucet or another wallet so it can pay gas.

> Some popular Sepolia faucets are the [Alchemy Faucet](https://sepoliafaucet.com/), [Infura Faucet](https://www.infura.io/faucet/sepolia), and [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia).

> ⚔️ Side Quest: Keep a 🧑‍🎤 [punkwallet.io](https://punkwallet.io) on your phone's home screen and keep it loaded with testnet eth. 🧙‍♂️ You'll look like a wizard when you can fund your deployer address from your phone in seconds.

🚀 Deploy your NFT smart contract with `yarn deploy`.

> 💬 Hint: You can set the `defaultNetwork` in `hardhat.config.ts` to `sepolia` **OR** you can `yarn deploy --network sepolia`.

---

## Checkpoint 4: 🚢 Ship your frontend! 🚁

> ✏️ Tune your frontend for the right chain. In `packages/nextjs/scaffold.config.ts`, set `targetNetwork` to `chains.sepolia`:

![chall-0-scaffold-config](https://github.com/scaffold-eth/se-2-challenges/assets/12072395/ff03bda0-66c6-4907-a9ad-bc8587da8036)

> Confirm the network badge in the UI at http://localhost:3000 shows Sepolia:

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/50eef1f7-e1a3-4b3b-87e2-59c19362c4ff)

> 🦊 Since we have deployed to a public testnet, you will now need to connect using a wallet you own or use a burner wallet. By default 🔥 `burner wallets` are only available on `hardhat` . You can enable them on every chain by setting `onlyLocalBurnerWallet: false` in your frontend config (`scaffold.config.ts` in `packages/nextjs/`)

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/f582d311-9b57-4503-8143-bac60346ea33)

🚀 Deploy your NextJS app

```sh
yarn vercel
```

> You might need to log in to Vercel first by running `yarn vercel:login`. Once you log in (email, GitHub, etc), the default options should work.

> If you want to redeploy to the same production URL you can run `yarn vercel --prod`. If you omit the `--prod` flag it will deploy it to a preview/test URL.

> Follow the steps to deploy to Vercel. It'll give you a public URL.

⚠️ Run the automated testing function to make sure your app passes

```sh
yarn test
```

#### Configuration of Third-Party Services for Production-Grade Apps.

By default, 🏗 Scaffold-ETH 2 provides predefined API keys for popular services such as Alchemy and Etherscan. This allows you to begin developing and testing your applications more easily, avoiding the need to register for these services.
This is great to complete your **SpeedRunEthereum**.

For production-grade applications, it's recommended to obtain your own API keys (to prevent rate limiting issues). You can configure these at:

- 🔷`ALCHEMY_API_KEY` variable in `packages/hardhat/.env` and `packages/nextjs/.env.local`. You can create API keys from the [Alchemy dashboard](https://dashboard.alchemy.com/).

- 📃`ETHERSCAN_API_KEY` variable in `packages/hardhat/.env` with your generated API key. You can get your key [here](https://etherscan.io/myapikey).

> 💬 Hint: It's recommended to store env's for nextjs in Vercel/system env config for live apps and use .env.local for local testing.

---

## Checkpoint 5: 📜 Contract Verification

You can verify your smart contract on Etherscan by running (`yarn verify --network network_name`):

```sh
yarn verify --network sepolia
```

Verifying your contract is important for enabling others to be able to look at your contract and verify that it isn't a scam.

> If it says your contract is already verified, that’s fine. It just means Etherscan recognized the contract bytecode as being the same as one that was already deployed and verified. Copy the address of `YourCollectible.sol` and search it on Sepolia Etherscan to grab the URL you’ll submit for this challenge.

## Checkpoint 6: 💪 Flex!

👩‍❤️‍👨 Share your public url with a friend and ask them for their address to send them a collectible:

![gif](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/547612f6-97b9-4eb3-ab6d-9b6d2c0ac769)

---

> 🏃 Head to your next challenge [here](https://speedrunethereum.com/challenge/decentralized-staking).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
