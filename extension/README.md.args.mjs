export const skipQuickStart = true;

export const extraContents = `
# 🚩 Challenge: 👛 Multisig Wallet

This guide will walk you through creating a Multisig Wallet. Feel free to use it as inspiration to build your unique version with your personal touch. If you're proud of the result, we encourage you to upload it to your profile builds to share it with the community

---

![readme-6](https://raw.githubusercontent.com/scaffold-eth/se-2-challenges/challenge-multisig/extension/packages/nextjs/public/hero.png)

👩‍👩‍👧‍👧 A multisig wallet is a smart contract that acts like a wallet, allowing us to secure assets by requiring multiple accounts to "vote" on transactions. Think of it as a treasure chest that can only be opened when all key parties agree.

📜 The contract keeps track of all transactions. Each transaction can be confirmed or rejected by the signers (smart contract owners). Only transactions that receive enough confirmations can be "executed" by the signers.

🌟 The final deliverable is a multisig wallet where you can propose adding and removing signers, transferring funds to other accounts, and updating the required number of signers to execute a transaction. After any of the signers propose a transaction, it's up to the signers to confirm and execute it. Deploy your contracts to a testnet, then build and upload your app to a public web server.

💬 Meet other builders working on this challenge and get help in the [Multisig Build Cohort telegram](https://t.me/+zKllN8OlGuxmYzFh).

---

## 📜 Quest Journal 🧭

In this challenge you'll have access to a fully functional Multisig Wallet for inspiration, unlike previous challenges where certain code sections were intentionally left incomplete.

The objective is to allow builders to create their unique versions while referring to this existing build when encountering difficulties.

### 🥅 Goals:

- [ ] Can you edit and deploy the contract with a 2/3 multisig with two of your addresses and the buidlguidl multisig as the third signer? (buidlguidl.eth is like your backup recovery.)
- [ ] Can you propose basic transactions with the frontend that sends them to the backend?
- [ ] Can you “vote” on the transaction as other signers?
- [ ] Can you execute the transaction and does it do the right thing?
- [ ] Can you add and remove signers with a custom dialog (that just sends you to the create transaction dialog with the correct calldata)

### ⚔️ Side Quests:

- [ ] **Multisig as a service**<br>
      Create a deploy button with a copy-paste dialog for sharing so anyone can make a multisig at your URL with your frontend.

- [ ] **Create custom signer roles for your Wallet**<br>
      You may not want every signer to create new transfers, only allow them to sign existing transactions or a mega-admin role who will be able to veto any transaction.

- [ ] **Integrate this MultiSig wallet into other Scaffold ETH-2 builds**<br>
      Find a Scaffold ETH-2 build that could make use of a Multisig wallet and try to integrate it!

---

## 👇🏼 Quick Break-Down 👛

This is a smart contract that acts as an offchain signature-based shared wallet amongst different signers that showcases use of meta-transaction knowledge and ECDSA \`recover()\`.

> If you are unfamiliar with these concepts, check out all the [ETH.BUILD videos](https://www.youtube.com/watch?v=CbbcISQvy1E&ab_channel=AustinGriffith) by Austin Griffith, especially the Meta Transactions one!

❗ [OpenZepplin's ECDSA Library](https://docs.openzeppelin.com/contracts/2.x/api/cryptography#ECDSA) provides an easy way to verify signed messages, in this challenge we'll be using it to verify the signatures of the signers of the multisig wallet.

At a high-level, the contract core functions are carried out as follows:

**Offchain: ⛓🙅🏻‍♂️** - Generation of a packed hash (bytes32) for a function call with specific parameters through a public view function . - It is signed by one of the signers associated to the multisig, and added to an array of signatures (\`bytes[] memory signatures\`)

**Onchain: ⛓🙆🏻‍♂️**

- \`bytes[] memory signatures\` is then passed into \`executeTransaction\` as well as the necessary info to use \`recover()\` to obtain the public address that ought to line up with one of the signers of the wallet.
  - This method, plus some conditional logic to avoid any duplicate entries from a single signer, is how votes for a specific transaction (hashed tx) are assessed.
- If it's a success, the tx is passed to the \`call(){}\` function of the deployed MetaMultiSigWallet contract (this contract), thereby passing the \`onlySelf\` modifier for any possible calls to internal txs such as (\`addSigner()\`,\`removeSigner()\`,\`transferFunds()\`,\`updateSignaturesRequired()\`).

**Cool Stuff that is Showcased: 😎**

- Showcases how the \`call(){}\` function is an external call that ought to increase the nonce of an external contract, as [they increment differently](https://ethereum.stackexchange.com/questions/764/do-contracts-also-have-a-nonce) from user accounts.
- Normal internal functions, such as changing the signers, and adding or removing signers, are treated as external function calls when \`call()\` is used with the respective transaction hash.
- Showcases use of an array (see constructor) populating a mapping to store pertinent information within the deployed smart contract storage location within the EVM in a more efficient manner.

---

## Checkpoint 0: 📦 Environment 📚

> Start your local network (a blockchain emulator in your computer):

\`\`\`sh
yarn chain
\`\`\`

> in a second terminal window, 🛰 deploy your contract (locally):

\`\`\`sh
yarn deploy
\`\`\`

> in a third terminal window, start your 📱 frontend:

\`\`\`sh
yarn start
\`\`\`

📱 Open http://localhost:3000 to see the app.

> In a fourth terminal window:

❗ This command is only required in your local environment (Hardhat chain).

\`\`\`bash
yarn backend-local

\`\`\`

When deployed to any other chain, it will automatically use our deployed backend ([repo](https://github.com/scaffold-eth/se-2-challenges/tree/multisig-backend)) from \`https://multisigs.buidlguidl.com:49832/\`.

> 👩‍💻 Rerun \`yarn deploy --reset\` whenever you want to deploy new contracts to the frontend, update your current contracts with changes, or re-deploy it to get a fresh contract address.

🔏 Now you are ready to edit your smart contract \`MetaMultiSigWallet.sol\` in \`packages/hardhat/contracts\`

---

⚠️ We have disabled AI in Cursor and VSCode and highly suggest that you do not enable it so you can focus on the challenge, do everything by yourself, and hence better understand and remember things. If you are using another IDE, please disable AI yourself.

🔧 If you are a vibe-coder and don't care about understanding the syntax of the code used and just want to understand the general takeaways, you can re-enable AI by:
- Cursor: remove \`*\` from \`.cursorignore\` file
- VSCode: set \`chat.disableAIFeatures\` to \`false\` in \`.vscode/settings.json\` file

---

## Checkpoint 1: 📝 Configure Owners 🖋

🔏 The first step for this multisig wallet is to configure the owners, who will be able to propose, sign and execute transactions.

🏗️ This is done in the constructor of the contract, where you can pass in an array of addresses that will be the signers of the wallet, and a number of signatures required to execute a transaction.

> 🛠️ Modify the contract constructor arguments at the deploy script \`00_deploy_meta_multisig_wallet.ts\` in \`packages/hardhat/deploy\`. Just set the first signer using your frontend address.

> 🔄 Will need to run \`yarn deploy --reset\` to deploy a fresh contract with the first signer configured.

You can set the rest of the signers in the frontend, using the "Owners" tab:

![multisig-1](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/bc65bf00-93de-4f24-b42b-c78596cd54e0)

In this tab you can start your transaction proposal to either add or remove owners.

> 📝 Fill the form and click on "Create Tx".

![multisig-2](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/a74bb0c9-62de-4a12-932a-a5498bf12ecb)

This will take you to a populated transaction at "Create" page:

![multisig-3](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/5d4adfb8-66a6-49bb-b72c-3b4062f8e804)

> Create & sign the new transaction, clicking in the "Create" button:

![multisig-4](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/f8ef3f85-c543-468f-a008-6c4c8b9cf20a)

You will see the new transaction in the pool (this is all offchain).

You won't be able to sign it because on creation it already has one signature (from the frontend account).

> Click on the ellipsses button [...] to read the details of the transaction.

![multisig-5](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/25974706-a127-45f4-8a17-6f99b9e97104)

> ⛽️ Give your account some gas at the faucet and execute the transaction.

☑ Click on "Exec" to execute it, will be marked as "Completed" on the "Pool" tab, and will appear in the "Multisig" tab with the rest of executed transactions.

![multisig-6a](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/edf9218c-5b10-49b7-a564-e415c0d2f042)

![multisig-6b](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/7a7e5324-d5d1-4f10-918c-bfd7c72a52f8)

## Checkpoint 2: Transfer Funds 💸

> 💰 Use the faucet to send your multisig contract some funds.
> You can find the address in the "Multisig" and "Debug Contracts" tabs.

> Create a transaction in the "Create" tab to send some funds to one of your signers, or to any other address of your choice:

![multisig-7](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/8b514add-fbe5-4a45-ae68-7659c827a5bf)

🖋 This time we will need a second signature (remember we've just updated the number of signatures required to execute a transaction to 2).

![multisig-8](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/2b7d8501-edfd-47d6-a6d2-937e7bb84caa)

> Open another browser and access with a different owner of the multisig. Sign the transaction with enough owners:

![multisig-9](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/ad667a69-499a-4ed4-8a40-52d500c94a5b)

(You'll notice you don't need ⛽️gas to sign transactions).

> Execute the transaction to transfer the funds:

![multisig-10](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/2be26eda-ea09-4a0d-9f0e-d2151cfa26a4)

---

## Checkpoint 3: 💾 Deploy your contracts! 🛰

📡 Edit the \`defaultNetwork\` to [your choice of public EVM networks](https://ethereum.org/en/developers/docs/networks/) in \`packages/hardhat/hardhat.config.ts\`

🔐 You will need to generate a **deployer address** using \`yarn generate\` This creates a mnemonic and saves it locally.

👩‍🚀 Use \`yarn account\` to view your deployer account balances.

⛽️ You will need to send ETH to your deployer address with your wallet, or get it from a public faucet of your chosen network.

🚀 Run \`yarn deploy\` to deploy your smart contract to a public network (selected in \`hardhat.config.ts\`)

> 💬 Hint: You can set the \`defaultNetwork\` in \`hardhat.config.ts\` to \`sepolia\` or \`optimismSepolia\` **OR** you can \`yarn deploy --network sepolia\` or \`yarn deploy --network optimismSepolia\`.

---

## Checkpoint 4: 🚢 Ship your frontend! 🚁

✏️ Edit your frontend config in \`packages/nextjs/scaffold.config.ts\` to change the \`targetNetwork\` to \`chains.sepolia\` (or \`chains.optimismSepolia\` if you deployed to OP Sepolia)

💻 View your frontend at http://localhost:3000 and verify you see the correct network.

📡 When you are ready to ship the frontend app...

📦 Run \`yarn vercel\` to package up your frontend and deploy.

> You might need to log in to Vercel first by running \`yarn vercel:login\`. Once you log in (email, GitHub, etc), the default options should work.

> If you want to redeploy to the same production URL you can run \`yarn vercel --prod\`. If you omit the \`--prod\` flag it will deploy it to a preview/test URL.

> Follow the steps to deploy to Vercel. It'll give you a public URL.

> 🦊 Since we have deployed to a public testnet, you will now need to connect using a wallet you own or use a burner wallet. By default 🔥 \`burner wallets\` are only available on \`hardhat\` . You can enable them on every chain by setting \`onlyLocalBurnerWallet: false\` in your frontend config (\`scaffold.config.ts\` in \`packages/nextjs/\`)

#### Configuration of Third-Party Services for Production-Grade Apps.

By default, 🏗 Scaffold-ETH 2 provides predefined API keys for popular services such as Alchemy and Etherscan. This allows you to begin developing and testing your applications more easily, avoiding the need to register for these services.
This is great to complete your **SpeedRunEthereum**.

For production-grade applications, it's recommended to obtain your own API keys (to prevent rate limiting issues). You can configure these at:

- 🔷\`ALCHEMY_API_KEY\` variable in \`packages/hardhat/.env\` and \`packages/nextjs/.env.local\`. You can create API keys from the [Alchemy dashboard](https://dashboard.alchemy.com/).

- 📃\`ETHERSCAN_API_KEY\` variable in \`packages/hardhat/.env\` with your generated API key. You can get your key [here](https://etherscan.io/myapikey).

> 💬 Hint: It's recommended to store env's for nextjs in Vercel/system env config for live apps and use .env.local for local testing.

---

## Checkpoint 5: 📜 Contract Verification

Run the \`yarn verify --network your_network\` command to verify your contracts on etherscan 🛰

---

> 👩‍❤️‍👨 Share your public url with friends, add signers and send some tasty ETH to a few lucky ones 😉!!

> 🏃 Head to your next challenge [here](https://speedrunethereum.com).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
`;
