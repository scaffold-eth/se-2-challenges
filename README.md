# 🚩 Challenge 5: 📺 A State Channel Application

![readme-5](https://raw.githubusercontent.com/scaffold-eth/se-2-challenges/challenge-5-state-channels/extension/packages/nextjs/public/hero.png)

🐌 The Ethereum blockchain has great decentralization & security properties. These properties come at a price: transaction throughput is low, and transactions can be expensive (search term: blockchain trilemma). This makes many traditional web applications infeasible on a blockchain... or does it?

🍰 A number of approaches to scaling have been developed, collectively referred to as layer-2s (L2s). Among them is the concept of payment channels, state channels, and state channel networks. This tutorial walks through the creation of a simple state channel application, where users seeking a service **lock** collateral on-chain with a single transaction, **interact** with their service provider entirely off-chain, and **finalize** the interaction with a second on-chain transaction.

🧑‍🤝‍🧑 State channels really excel as a scaling solution in cases where a fixed set of participants want to exchange value-for-service at high frequency. The canonical example is in file sharing or media streaming: the server exchanges chunks of a file in exchange for micropayments.

🧙 In our case, the service provider is a `Guru` who provides off-the-cuff wisdom to each client `Rube` through a one-way chat box. Each character of text that is delivered is expected to be compensated with a payment of `0.01 ETH`.

📖 Read more about state channels in the [Ethereum Docs.](https://ethereum.org/en/developers/docs/scaling/state-channels/)

❗ [OpenZepplin's ECDSA Library](https://docs.openzeppelin.com/contracts/2.x/api/cryptography#ECDSA) provides an easy way to verify signed messages, but for this challenge we'll write the code ourselves.

## 🏅 Main Quests

- 🛣️ Build a `packages/hardhat/contracts/Streamer.sol` contract that collects **ETH** from numerous client addresses using a payable `fundChannel()` function and keeps track of `balances`.
- 💵 Exchange paid services off-chain between the `packages/hardhat/contracts/Streamer.sol` contract owner (the **Guru**) and **rube** clients with funded channels. The **Guru** provides the service in exchange for signed vouchers which can later be redeemed on-chain.
- ⏱ Create a Challenge mechanism with a timeout, so that **rubes** are protected from a **Guru** who goes offline while funds are locked on-chain (either by accident, or as a theft attempt).
- ⁉ Consider some security / usability holes in the current design.

> 💬 Meet other builders working on this challenge and get help in the [State Channel Telegram](https://t.me/+k0eUYngV2H0zYWUx)!

---

## Checkpoint 0: 📦 Environment 📚

Before you begin, you need to install the following tools:

- [Node (v18 LTS)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then download the challenge to your computer and install dependencies by running:

```sh
npx create-eth@0.1.0 -e challenge-5-state-channels challenge-5-state-channels
cd challenge-5-state-channels
```

> in the same terminal, start your local network (a blockchain emulator in your computer):

```sh
yarn chain
```

> in a second terminal window, 🛰 deploy your contract (locally):

```sh
cd challenge-5-state-channels
yarn deploy
```

> in a third terminal window, start your 📱 frontend:

```sh
cd challenge-5-state-channels
yarn start
```

📱 Open http://localhost:3000 to see the app.

> 👩‍💻 Rerun `yarn deploy` whenever you want to deploy new contracts to the frontend. If you haven't made any contract changes, you can run `yarn deploy --reset` for a completely fresh deploy.

---

## Checkpoint 1: 🧘‍♀️ Configure Guru & Rube 📃

First, you need to configure the BurnerWallet to use sessionStorage to get a new address when you open each new browser tab. To do this, add this line to `packages/nextjs/services/web3/wagmiConnectors.tsx`, after the imports:

```
rainbowkitBurnerWallet.useSessionStorage = true;
```

Like the [token vendor challenge](https://speedrunethereum.com/challenge/token-vendor), we'll be building an `Ownable` contract. The contract owner is the **Guru** (the service provider in this application), and you will use multiple browser windows or tabs to assume the roles of Guru and rube (service provider & client).

> 👁 `contract Streamer` inherits `Ownable` with the `is` keyword. `Ownable` comes from [openzeppelin-contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) - a collection of high quality smart contract library code.

> 📝 In `packages/hardhat/deploy/00_deploy_streamer.js`, uncomment the lines of code that deploy the contract and transfer ownership. You will need to enter your own frontend address, to act as Guru.

You'll have to redeploy with `yarn deploy --reset`.

We'll need another active address to act as the rube in our app. To do this just open a new tab in your browser.

> ⚠️ **Note**: previous challenges created new addresses by opening an incognito window or a different browser. This will **not** work for this challenge, because the off-chain application uses a very simple communication pipe that doesn't work between different browsers or private windows.

![wallets-setup](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/1c0ede93-fd7d-4683-a3f0-803b52ca947c)

### 🥅 Goals:

- [ ] Does your original frontend address receive the `Hello Guru` UI?
- [ ] Does your alternate addresses receive the `Hello Rube` UI?

---

## Checkpoint 2: 💸 Fund a Channel 📺

Like the [decentralized staking challenge](https://speedrunethereum.com/challenge/decentralized-staking), we'll track balances for individual channels / users in a mapping:

```
mapping (address => uint256) balances;
```

Rubes seeking wisdom will use a **payable** `fundChannel()` function, which will update this mapping with the supplied balance.

> 📝 Edit `packages/hardhat/contracts/Streamer.sol` to complete the `fundChannel()` function

> 👁 Check `packages/nextjs/app/streamer/_components/Rube.tsx` to see the frontend calling this function. (ctrl-f fundChannel)

> Run `yarn deploy` and open a channel in the Rube's tab. (You may need some funds from the faucet)

![channel-open](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/69a30c45-d384-476f-8b7d-67bc23d21833)

### 🥅 Goals:

- [ ] Does opening a channel cause a `Received Wisdom` box to appear?
- [ ] Do opened channels appear on the Guru's UI as well?
- [ ] Using the _Debug Contracts_ tab, does a repeated call to `fundChannel` fail?

---

## Checkpoint 3: 💱 Exchange the Service 👷‍♂️

Now that the channel is funded and all participants have observed the funding via the emitted event, we can begin our off-chain exchange of service. We are now working in `packages/nextjs/app/streamer/page.tsx` and its components.

Functions of note:

- `provideService` in `packages/nextjs/app/streamer/_components/Guru.tsx`: The Guru sends wisdom over the wire to the client.
- `reimburseService` in `packages/nextjs/app/streamer/_components/Rube.tsx`: The rube creates a voucher for the received service, signs it, and returns it.
- `processVoucher` in `packages/nextjs/app/streamer/_components/Guru.tsx`: The service provider receives and stores vouchers.

The first two functions are complete - we will work on `processVoucher`, where the service provider examines returned payments, confirms their authenticity, and stores them.

> 📝 Edit `packages/nextjs/app/streamer/_components/Guru.tsx` to complete the `processVoucher()` function and secure this off-chain exchange. You'll need to recreate the encoded message that the client has signed, and then verify that the received signature was in fact produced by the client on that same data.

### 🥅 Goals:

- [ ] Secure your service! Validate the incoming voucher & signature according to instructions inside `processVoucher()`
- [ ] With an open channel, start sending advice. Can you see the claimable balance update as service is rendered? This should happen only if rube has "Autopay" active.

![guru-advice](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/d1cc665a-6c44-4fff-b0ac-c4d8ff490a15)
![rube-received-advice](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/70da22a2-0c3a-4e14-b6fa-f103c6eb2c9c)

### ⚔️ Side Quest:

- [ ] Can `provideService` be modified to prevent continued service to clients who don't keep up with their payments?

> 💬 Hint: You'll want to compare the size of your best voucher against the size of your provided wisdom. If there's too big a discrepency, cut them off!

## Checkpoint 4: 💰 Recover Service Provider's Earnings 💵

Now that we've collected some vouchers, we'd like to redeem them on-chain and move funds from the `Streamer` contract's `balances` map to the Guru's own address. The `withdrawEarnings` function of `packages/hardhat/contracts/Streamer.sol` takes a Struct named voucher (balance + signature) as input, and should:

- Recover the signer using `ecrecover(bytes32, uint8, bytes32, bytes32)` on the `prefixedHashed` message and supplied signature.
  - _Hint_: `ecrecover` takes the signature in its decomposed form with `v,`,`r`, and`s` values. The string signature produced in `packages/nextjs/app/streamer/_components/Rube.tsx` is just a concatenation of these values, which we split using `ethers.Signature.from` in `packages/nextjs/app/streamer/_components/CashOutVoucherButton.tsx` to create the on-chain friendly signature. Read about the [ecrecover function here](https://docs.soliditylang.org/en/v0.8.17/units-and-global-variables.html)
- Check that the signer has a running channel with balance greater than the voucher's `updatedBalance`
- Calculate the payout (`balances[signer] - updatedBalance`)
- Update the channel balance.
- Send the payout to the Guru.

💡 Reminders:

- Changes to contracts must be redeployed to the local chain with `yarn deploy --reset`.
- For troubleshooting / debugging, your contract can use hardhat's `console.log`, which will print to your console running the chain.

> 📝 Edit `packages/hardhat/contracts/Streamer.sol` to complete the `withdrawEarnings()` function as described.

> 📝 Edit `packages/nextjs/app/streamer/_components/Guru.tsx` to enable the UI button for withdrawals.

### 🥅 Goals:

- [ ] Recover funds on-chain for services rendered! After the Guru submits a voucher to chain, you should be able to see the wallet's ETH balance increase.

![eth-locked-updated](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/0d09a5d8-914b-4acd-b7ec-fb862df83144)
![guru-balance-updated](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/02f9dc8a-5357-49e0-9112-e84df04f1ebd)

### ⚔️ Side Quest:

- [ ] `withdrawEarnings` is a function that only the service provider would be interested in calling. Should it be marked `onlyOwner`? (the `onlyOwner` modifier makes a function accessible only to the contract owner - anyone else who tries to call it will be immediately rejected).

## Checkpoint 5: 💪 Challenge & Close the Channel 🔽

So far so good:

- Rubes can connect to the Guru via an on-chain deposit.
- The pair can then transact off-chain with high throughput.
- The Guru can recover earnings with their received vouchers.

But what if a rube is unimpressed with the service and wishes to close a channel to recover whatever funds remain? What if the Guru is a no-show after the initial channel funding deposit?

A payment channel is a cryptoeconomic protocol - care needs to be taken so that everyone's financial interests are protected. We'll implement a two step **challenge** and **close** mechanism that allows rubes to recover unspent funds, while keeping the Guru's earnings safe.

> 📝 Edit `packages/hardhat/contracts/Streamer.sol` to create a public `challengeChannel()` function.

> 📝 Edit `packages/nextjs/app/streamer/_components/Rube.tsx` to enable the challenge and closure buttons for service clients(rubes).

The `challengeChannel()` function should:

- Check in the `balances` map that a channel is already open in the name of `msg.sender`
- Declare this channel to be closing by setting `canCloseAt[msg.sender]` to `block.timestamp + 30 seconds`
- Emit a `Challenged` event with the sender's address.

The emitted event gives notice to the Guru that the channel will soon be emptied, so they should apply whatever vouchers they have before the timeout period ends.

![guru-alert](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/671eed08-ff0c-4165-8147-0d91c339b217)

> 📝 Edit `packages/hardhat/contracts/Streamer.sol` to create a public `defundChannel()` function.

The `defundChannel()` function should:

- Check that `msg.sender` has a channel that can be closed, by ensuring a non-zero `canCloseAt[msg.sender]` is before the current timestamp.
- Transfer `balances[msg.sender]` to the sender.
- Emit a `Closed` event.

### 🥅 Goals:

- [ ] Launch a challenge as a channel client. If wisdom has been given, the Guru's UI should show an alert via their `Cash out latest voucher` button.
- [ ] Recover the Guru's best voucher before the channel closes.
- [ ] Close the channel and recover rube funds.

![close-channel-button](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/8ecec2c3-9f4a-40d5-ac42-84d8e5500f23)

### ⚔️ Side Quests:

- [ ] Currently, the service provider has to manually submit their vouchers after a challenge is registered on chain. Should their channel wallet do that automatically? Can you implement that in this application?
- [ ] Suppose some rube enjoyed their first round of advice. Is it safe for them to open a new channel with `packages/hardhat/contracts/Streamer.sol`? (_Hint_: what data does the Guru still hold?)

### ⚠️ Test it!

- Now is a good time to run `yarn test` to run the automated testing function. It will test that you hit the core checkpoints. You are looking for all green checkmarks and passing tests!

---

## Checkpoint 6: 💾 Deploy your contracts! 🛰

📡 Edit the `defaultNetwork` to [your choice of public EVM networks](https://ethereum.org/en/developers/docs/networks/) in `packages/hardhat/hardhat.config.ts`

🔐 You will need to generate a **deployer address** using `yarn generate` This creates a mnemonic and saves it locally.

👩‍🚀 Use `yarn account` to view your deployer account balances.

⛽️ You will need to send ETH to your **deployer address** with your wallet, or get it from a public faucet of your chosen network.

🚀 Run `yarn deploy` to deploy your smart contract to a public network (selected in `hardhat.config.ts`)

> 💬 Hint: You can set the `defaultNetwork` in `hardhat.config.ts` to `sepolia` or `optimismSepolia` **OR** you can `yarn deploy --network sepolia` or `yarn deploy --network optimismSepolia`.

---

## Checkpoint 7: 🚢 Ship your frontend! 🚁

✏️ Edit your frontend config in `packages/nextjs/scaffold.config.ts` to change the `targetNetwork` to `chains.sepolia` (or `chains.optimismSepolia` if you deployed to OP Sepolia)

💻 View your frontend at http://localhost:3000 and verify you see the correct network.

📡 When you are ready to ship the frontend app...

📦 Run `yarn vercel` to package up your frontend and deploy.

> You might need to log in to Vercel first by running `yarn vercel:login`. Once you log in (email, GitHub, etc), the default options should work.

> If you want to redeploy to the same production URL you can run `yarn vercel --prod`. If you omit the `--prod` flag it will deploy it to a preview/test URL.

> Follow the steps to deploy to Vercel. It'll give you a public URL.

> 🦊 Since we have deployed to a public testnet, you will now need to connect using a wallet you own or use a burner wallet. By default 🔥 `burner wallets` are only available on `hardhat` . You can enable them on every chain by setting `onlyLocalBurnerWallet: false` in your frontend config (`scaffold.config.ts` in `packages/nextjs/`)

#### Configuration of Third-Party Services for Production-Grade Apps.

By default, 🏗 Scaffold-ETH 2 provides predefined API keys for popular services such as Alchemy and Etherscan. This allows you to begin developing and testing your applications more easily, avoiding the need to register for these services.
This is great to complete your **SpeedRunEthereum**.

For production-grade applications, it's recommended to obtain your own API keys (to prevent rate limiting issues). You can configure these at:

- 🔷`ALCHEMY_API_KEY` variable in `packages/hardhat/.env` and `packages/nextjs/.env.local`. You can create API keys from the [Alchemy dashboard](https://dashboard.alchemy.com/).

- 📃`ETHERSCAN_API_KEY` variable in `packages/hardhat/.env` with your generated API key. You can get your key [here](https://etherscan.io/myapikey).

> 💬 Hint: It's recommended to store env's for nextjs in Vercel/system env config for live apps and use .env.local for local testing.

---

## Checkpoint 8: 📜 Contract Verification

Run the `yarn verify --network your_network` command to verify your contracts on etherscan 🛰

👉 Search this address on [Sepolia Etherscan](https://sepolia.etherscan.io/) (or [Optimism Sepolia Etherscan](https://sepolia-optimism.etherscan.io/) if you deployed to OP Sepolia) to get the URL you submit to 🏃‍♀️[SpeedRunEthereum.com](https://speedrunethereum.com).

---

> 🏃 Head to your next challenge [here](https://speedrunethereum.com).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
