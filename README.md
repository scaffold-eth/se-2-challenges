# 🚩 Challenge #0: 🎟 Simple NFT Example - SpeedRunEthereum

🎫 Create a simple NFT to learn basics of 🏗 scaffold-eth. You'll use [👷‍♀️ HardHat](https://hardhat.org/getting-started/) to compile and deploy smart contracts. Then, you'll use a template React app full of important Ethereum components and hooks. Finally, you'll deploy an NFT to a public network to share with friends! 🚀

🌟 The final deliverable is an app that lets users purchase and transfer NFTs. Deploy your contracts to a testnet then build and upload your app to a public web server. Submit the url on [SpeedRunEthereum.com](https://speedrunethereum.com)!

💬 Meet other builders working on this challenge and get help in the [Challenge 0 Telegram](https://t.me/+Y2vqXZZ_pEFhMGMx) or our [Challenge 0 Discord](https://discord.com/channels/778001331091800065/908425500643455046)

## Checkpoint 0: 📦 Install 📚

Before you begin, you need to install the following tools:

- [Node (v18 LTS)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then run:
```sh
git clone https://github.com/scaffold-eth/se-2-challenges.git challenge-0-simple-nft
```

```sh
cd challenge-0-simple-nft
git checkout challenge-0-simple-nft
yarn install
yarn chain
```

> in a second terminal window, 🛰 deploy your contract:

```sh
cd challenge-0-simple-nft
yarn deploy 
```

> in a third terminal window, start your 📱 frontend:

```sh
cd challenge-0-simple-nft
yarn start
```

📱 Open http://localhost:3000 to see the app

---

## Checkpoint 1: ⛽️ Gas & Wallets 👛

> ⛽️ You'll need to get some funds from the faucet for gas.

![gas&wallet](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/912d0d4b-db34-49d3-bd7d-7ca0ab18eb66)

> 🦊 At first, please **don't** connect MetaMask. If you already connected, please click **logout**:

<p>
  <img src="https://github.com/scaffold-eth/se-2-challenges/assets/80153681/2c7a1e40-50ad-4c20-ba3e-a56eff4b892b" width="33%" />
  <img src="https://github.com/scaffold-eth/se-2-challenges/assets/80153681/1bcf9752-e8ae-4db6-a0a6-5dc774abe46c" width="33%" />
</p>

> 🔥 We'll use burner wallets on localhost...


> 👛 Explore how burner wallets work in 🏗 scaffold-eth by opening a new incognito window and navigate to http://localhost:3000. You'll notice it has a new wallet address in the top right. Copy the incognito browser's address and send localhost test funds to it from your first browser:

![icognito&webBrowser](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/fd191447-a31f-4c03-a36f-936bfb70c2a1)

> 👨🏻‍🚒 When you close the incognito window, the account is gone forever. Burner wallets are great for local development but you'll move to more permanent wallets when you interact with public networks.


---

## Checkpoint 2: 🖨 Minting

> ✏️ Mint some NFTs! Click the MINT NFT button in the YourCollectables tab.

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/74cf02f2-4c1b-4278-9841-f19f668e0b1e)

👀 You should see your collectibles start to show up:

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/63dabceb-ad42-4c09-8e5d-a0139939e32d)

👛 Open an incognito window and navigate to http://localhost:3000

🎟 Transfer an NFT to the incognito window address using the UI:

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/3b92fb50-d43f-48a8-838c-c45c443b0b71)


👛 Try to mint an NFT from the incognito window.

> Can you mint an NFT with no funds in this address? You might need to grab funds from the faucet to pay for the gas!

🕵🏻‍♂️ Inspect the `Debug Contracts` tab to figure out what address is the owner of YourCollectible?

🔏 You can also check out your smart contract `YourCollectible.sol` in `packages/hardhat/contracts`.

💼 Take a quick look at your deploy script `00_deploy_your_contract.js` in `packages/hardhat/deploy`.

📝 If you want to make frontend edits, Open and look for the page you want to edit in `packages/nextjs/pages` example `myNFTs.tsx`.

---

## Checkpoint 3: 💾 Deploy it! 🛰

🛰 Ready to deploy to a public testnet?!?

> Change the defaultNetwork in packages/hardhat/hardhat.config.ts to `sepolia`

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/9ac9e2be-86cb-4421-96f3-6065925987ed)


🔐 Generate a deployer address with `yarn generate`
![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/e836ce34-c8c2-4029-831a-dfc82fe6f26b)


👛 View your deployer address using the `yarn account`
![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/e743816b-f587-424d-a21d-96088cb3925b)

⛽️ Use a faucet like allthatnode.com/faucet/ethereum.dsrv or web.getlaika.app/faucets to fund your deployer address.

> ⚔️ Side Quest: Keep a 🧑‍🎤 [punkwallet.io](https://punkwallet.io) on your phone's home screen and keep it loaded with testnet eth. 🧙‍♂️ You'll look like a wizard when you can fund your deployer address from your phone in seconds.


🚀 Deploy your NFT smart contract:

```shell
yarn deploy
```

> 💬 Hint: You can set the `defaultNetwork` in `hardhat.config.ts` to `sepolia` **OR** you can `yarn deploy --network sepolia`.

---

## Checkpoint 4: 🚢 Ship it! 🚁

> ✏️ Edit your frontend config `scaffold.config.ts` in `packages/nextjs/scaffold.config.ts` to change the `targetNetwork` to `chains.seplolia` :

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/34de5be1-8cf1-4564-ba4b-358824d94547)

> You should see the correct network in the frontend (http://localhost:3000):

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/50eef1f7-e1a3-4b3b-87e2-59c19362c4ff)

> 🦊 You will need to connect your wallet, by default  🔥 `buner wallet` are only available on `hardhat` network but you can enable them on every chain by setting `onlyLocal : false` inside `burnerWallet` in your frontend config `scaffold.config.ts` in `packages/nextjs/scaffold.config.ts` 

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/f582d311-9b57-4503-8143-bac60346ea33)


🚀 Deploying your NextJS App

```shell
yarn vercel
```
> Follow the steps to deploy to Vercel. Once you log in (email, github, etc), the default options should work. It'll give you a public URL.

> If you want to redeploy to the same production URL you can run `yarn vercel --prod`. If you omit the `--prod` flag it will deploy it to a preview/test URL.


⚠️ Run the automated testing function to make sure your app passes
```shell
yarn test
```
---

## Checkpoint 5: 📜 Contract Verification

**SHULD WE TELL PEOPLE TO ADD etherscan api key in .env ?***

You can verify your smart contract on Etherscan by running (`yarn verify --network network_name`) :
```shell
yarn verify --network sepolia
```

> It is okay if it says your contract is already verified. Copy the address of YourCollectable.sol and search it on sepolia Etherscan to find the correct URL you need to submit this challenge.

## Checkpoint 6: 💪 Flex!
👩‍❤️‍👨 Share your public url with a friend and ask them for their address to send them a collectible :)

![gif](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/547612f6-97b9-4eb3-ab6d-9b6d2c0ac769)



## ⚔️ Side Quests
### 🐟 Open Sea

> 🐃 Want to see your new NFTs on Opensea? Head to [Testnets Opensea](https://testnets.opensea.io/)

> 🎫 Make sure you have minted some NFTs on your Surge page, then connect to Opensea using that same wallet.

![image](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/c752b365-b801-4a02-ba2e-62e0270b3795)

> You can see your collection of shiny new NFTs on a testnet!

(It can take a while before they show up, but here is an example:) https://testnets.opensea.io/assets/0xc2839329166d3d004aaedb94dde4173651babccf/1

--- 

## 🔶 Infura

**SHOULD WE ADD HERE ABOUT CONFIGURING .envs in frontend and hardaht ?**

---

🏃 Head to your next challenge [here]([https://speedrunethereum.com/](https://github.com/scaffold-eth/se-2-challenges).

💬 Meet other builders working on this challenge in the [Challenge 0 telegram channel](https://t.me/+Y2vqXZZ_pEFhMGMx)!!!

👉 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
