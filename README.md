# 🚩 Challenge 6: 👛 Multisig

{challengeHeroImage}

## 👇🏼 Quick Break-Down 👛

This is a smart contract that acts as an off-chain signature-based shared wallet amongst different signers that showcases use of meta-transaction knowledge and ECDSA `recover()`. **If you are looking for the challenge, go to the challenges repo within scaffold-eth!**

> If you are unfamiliar with these concepts, check out all the [ETH.BUILD videos](https://www.youtube.com/watch?v=CbbcISQvy1E&ab_channel=AustinGriffith) by Austin Griffith, especially the Meta Transactions one!

At a high-level, the contract core functions are carried out as follows:

**Off-chain: ⛓🙅🏻‍♂️** - Generation of a packed hash (bytes32) for a function call with specific parameters through a public view function . - It is signed by one of the signers associated to the multisig, and added to an array of signatures (`bytes[] memory signatures`)

**On-Chain: ⛓🙆🏻‍♂️**

- `bytes[] memory signatures` is then passed into `executeTransaction` as well as the necessary info to use `recover()` to obtain the public address that ought to line up with one of the signers of the wallet.
  - This method, plus some conditional logic to avoid any duplicate entries from a single signer, is how votes for a specific transaction (hashed tx) are assessed.
- If it's a success, the tx is passed to the `call(){}` function of the deployed MetaMultiSigWallet contract (this contract), thereby passing the `onlySelf` modifier for any possible calls to internal txs such as (`addSigner()`,`removeSigner()`,`transferFunds()`,`updateSignaturesRequried()`).

**Cool Stuff that is Showcased: 😎**

- NOTE: Showcases how the `call(){}` function is an external call that ought to increase the nonce of an external contract, as [they increment differently](https://ethereum.stackexchange.com/questions/764/do-contracts-also-have-a-nonce) from user accounts.
- Normal internal functions, such as changing the signers, and adding or removing signers, are treated as external function calls when `call()` is used with the respective transaction hash.
- Showcases use of an array (see constructor) populating a mapping to store pertinent information within the deployed smart contract storage location within the EVM in a more efficient manner.

🌟 The final deliverable is an app that {challengeDeliverable}.
Deploy your contracts to a testnet then build and upload your app to a public web server. Submit the url on [SpeedRunEthereum.com](https://speedrunethereum.com)!

💬 Meet other builders working on this challenge and get help in the {challengeTelegramLink}

---

## Checkpoint 0: 📦 Environment 📚

Before you begin, you need to install the following tools:

- [Node (v18 LTS)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then download the challenge to your computer and install dependencies by running:

```sh
git clone https://github.com/scaffold-eth/se-2-challenges.git challenge-6-multisig
cd challenge-6-multisig
git checkout challenge-6-multisig
yarn install
```

> in the same terminal, start your local network (a blockchain emulator in your computer):

```sh
yarn chain
```

> in a second terminal window, 🛰 deploy your contract (locally):

```sh
cd challenge-6-multisig
yarn deploy
```

> in a third terminal window, start your 📱 frontend:

```sh
cd challenge-6-multisig
yarn start
```

📱 Open http://localhost:3000 to see the app.

<!-- TODO: check this later -->

> in a third terminal window:

```bash
yarn backend

```

> 👩‍💻 Rerun `yarn deploy --reset` whenever you want to deploy new contracts to the frontend, update your current contracts with changes, or re-deploy it to get a fresh contract address.

🔏 Now you are ready to edit your smart contract `MetaMultiSigWallet.sol` in `packages/hardhat/contracts`

---

\_Other commonly used Checkpoints (check one Challenge and adapt the texts for your

> Use the faucet wallet to send your multi-sig contract some funds:

![image](https://user-images.githubusercontent.com/31567169/118389510-53315600-b63b-11eb-9daf-f0aaa479a23e.png)

> To add new owners, use the "Owners" tab:

![image](https://user-images.githubusercontent.com/31567169/118389556-896ed580-b63b-11eb-8ed6-c1e690778c8e.png)

This will take you to a populated transaction create page:

![image](https://user-images.githubusercontent.com/31567169/118389576-9986b500-b63b-11eb-8411-c227b148992a.png)

> Create & sign the new transaction:

![image](https://user-images.githubusercontent.com/31567169/118389603-ae634880-b63b-11eb-968f-ca78c2456ddb.png)

You will see the new transaction in the pool (this is all off-chain):

![image](https://user-images.githubusercontent.com/31567169/118389616-bd49fb00-b63b-11eb-82f7-f65ca2ee7e80.png)

Click on the ellipsses button [...] to read the details of the transaction

![image](https://user-images.githubusercontent.com/31567169/118389642-d6eb4280-b63b-11eb-9676-da7e7afc5614.png)

> Give your account some gas at the faucet and execute the transaction

The transction will appear as "executed" on the front page:

![image](https://user-images.githubusercontent.com/31567169/118389655-e8cce580-b63b-11eb-8428-913c6f39e48f.png)

> Create a transaction to send some funds to your frontend account:

![image](https://user-images.githubusercontent.com/31567169/118389693-0ef28580-b63c-11eb-95d9-c5f397bf5972.png)

This time we will need a second signature:

![image](https://user-images.githubusercontent.com/31567169/118389716-3cd7ca00-b63c-11eb-959e-d46ffe31e62e.png)

> Sign the transacton with enough owners:
> ![image](https://user-images.githubusercontent.com/31567169/118389773-90e2ae80-b63c-11eb-9658-e9c411542f33.png)

(You'll notice you don't need ⛽️gas to sign transactions.)

> Execute the transction to transfer the funds:

![image](https://user-images.githubusercontent.com/31567169/118389808-bff92000-b63c-11eb-9107-9af5b77d4e20.png)

(You might need to trigger a new block by sending yourself some faucet funds or something. HartHat blocks only get mined when there is a transaction.)

💼 Edit your deployment script `deploy.js` in `packages/hardhat/scripts`

🔏 Edit your contracts form, `MetaMultiSigWallet.sol` in `packages/hardhat/contracts`

📝 Edit your frontend in `packages/react-app/src/views`

## ⚔️ Side Quests

#### 🐟 Create custom signer roles for your Wallet

You may not want every signer to create new transfers, only allow them to sign existing transactions or a mega-admin role who will be able to veto any transaction.

#### 😎 Integrate this MultiSig wallet into other branches like nifty-ink

Make a MultiSig wallet to store your precious doodle-NFTs!?

---

## 📡 Deploy the wallet!

🛰 Ready to deploy to a testnet?

> Change the `defaultNetwork` in `packages/hardhat/hardhat.config.js`

![image](https://user-images.githubusercontent.com/2653167/109538427-4d38c980-7a7d-11eb-878b-b59b6d316014.png)

🔐 Generate a deploy account with `yarn generate`

![image](https://user-images.githubusercontent.com/2653167/109537873-a2c0a680-7a7c-11eb-95de-729dbf3399a3.png)

👛 View your deployer address using `yarn account` (You'll need to fund this account. Hint: use an [instant wallet](https://instantwallet.io) to fund your account via QR code)

![image](https://user-images.githubusercontent.com/2653167/109537339-ff6f9180-7a7b-11eb-85b0-46cd72311d12.png)

👨‍🎤 Deploy your wallet:

```bash
yarn deploy
```

---

> ✏️ Edit your frontend `App.jsx` in `packages/react-app/src` to change the `targetNetwork` to wherever you deployed your contract:

![image](https://user-images.githubusercontent.com/2653167/109539175-3e9ee200-7a7e-11eb-8d26-3b107a276461.png)

You should see the correct network in the frontend:

![image](https://user-images.githubusercontent.com/2653167/109539305-655d1880-7a7e-11eb-9385-c169645dc2b5.png)

> Also change the poolServerUrl constant to your deployed backend (via yarn backend)

![image](https://user-images.githubusercontent.com/31567169/116589184-6f3fb280-a92d-11eb-8fff-d1e32b8359ff.png)

Alternatively you can use the pool server url in the above screenshot

---

## Checkpoint 4: 💾 Deploy your contracts! 🛰

📡 Edit the `defaultNetwork` to [your choice of public EVM networks](https://ethereum.org/en/developers/docs/networks/) in `packages/hardhat/hardhat.config.ts`

🔐 You will need to generate a **deployer address** using `yarn generate` This creates a mnemonic and saves it locally.

👩‍🚀 Use `yarn account` to view your deployer account balances.

⛽️ You will need to send ETH to your deployer address with your wallet, or get it from a public faucet of your chosen network.

🚀 Run `yarn deploy` to deploy your smart contract to a public network (selected in `hardhat.config.ts`)

> 💬 Hint: You can set the `defaultNetwork` in `hardhat.config.ts` to `sepolia` **OR** you can `yarn deploy --network sepolia`.

> 💬 Hint: For faster loading of your _"Events"_ page, consider updating the `fromBlock` passed to `useScaffoldEventHistory` in [`packages/nextjs/pages/events.tsx`](https://github.com/scaffold-eth/se-2-challenges/blob/challenge-2-token-vendor/packages/nextjs/pages/events.tsx) to `blocknumber - 10` at which your contract was deployed. Example: `fromBlock: 3750241n` (where `n` represents its a [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)). To find this blocknumber, search your contract's address on Etherscan and find the `Contract Creation` transaction line.

---

## Checkpoint 5: 🚢 Ship your frontend! 🚁

✏️ Edit your frontend config in `packages/nextjs/scaffold.config.ts` to change the `targetNetwork` to `chains.sepolia` or any other public network.

💻 View your frontend at http://localhost:3000 and verify you see the correct network.

📡 When you are ready to ship the frontend app...

📦 Run `yarn vercel` to package up your frontend and deploy.

> Follow the steps to deploy to Vercel. Once you log in (email, github, etc), the default options should work. It'll give you a public URL.

> If you want to redeploy to the same production URL you can run `yarn vercel --prod`. If you omit the `--prod` flag it will deploy it to a preview/test URL.

> 🦊 Since we have deployed to a public testnet, you will now need to connect using a wallet you own or use a burner wallet. By default 🔥 `burner wallets` are only available on `hardhat` . You can enable them on every chain by setting `onlyLocalBurnerWallet: false` in your frontend config (`scaffold.config.ts` in `packages/nextjs/`)

#### Configuration of Third-Party Services for Production-Grade Apps.

By default, 🏗 Scaffold-ETH 2 provides predefined API keys for popular services such as Alchemy and Etherscan. This allows you to begin developing and testing your applications more easily, avoiding the need to register for these services.  
This is great to complete your **SpeedRunEthereum**.

For production-grade applications, it's recommended to obtain your own API keys (to prevent rate limiting issues). You can configure these at:

- 🔷`ALCHEMY_API_KEY` variable in `packages/hardhat/.env` and `packages/nextjs/.env.local`. You can create API keys from the [Alchemy dashboard](https://dashboard.alchemy.com/).

- 📃`ETHERSCAN_API_KEY` variable in `packages/hardhat/.env` with your generated API key. You can get your key [here](https://etherscan.io/myapikey).

> 💬 Hint: It's recommended to store env's for nextjs in Vercel/system env config for live apps and use .env.local for local testing.

---

## Checkpoint 6: 📜 Contract Verification

Run the `yarn verify --network your_network` command to verify your contracts on etherscan 🛰

👀 You may see an address for both YouToken and Vendor. You will want the Vendor address.

👉 Search this address on Etherscan to get the URL you submit to 🏃‍♀️[SpeedRunEthereum.com](https://speedrunethereum.com).

---

> 🏃 Head to your next challenge [here](https://speedrunethereum.com).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
