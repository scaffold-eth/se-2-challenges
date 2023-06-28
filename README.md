# 🚩 Challenge 1: 🥩 Decentralized Staking App
![readme-1](https://github.com/scaffold-eth/se-2-challenges/assets/80153681/a620999a-a1ff-462d-9ae3-5b49ab0e023a)

> 🦸 A superpower of Ethereum is allowing you, the builder, to create a simple set of rules that an adversarial group of players can use to work together. In this challenge, you create a decentralized application where users can coordinate a group funding effort. If the users cooperate, the money is collected in a second smart contract. If they defect, the worst that can happen is everyone gets their money back. The users only have to trust the code.

> 🏦 Build a `Staker.sol` contract that collects **ETH** from numerous addresses using a payable `stake()` function and keeps track of `balances`. After some `deadline` if it has at least some `threshold` of ETH, it sends it to an `ExampleExternalContract` and triggers the `complete()` action sending the full balance. If not enough **ETH** is collected, allow users to `withdraw()`.

// TODO: Think <List />

> 🎛 Building the frontend to display the information and UI is just as important as writing the contract. The goal is to deploy the contract and the app to allow anyone to stake using your app. Use a `Stake(address,uint256)` event to list all stakes.

> 🌟 The final deliverable is deploying a Dapp that lets users send ether to a contract and stake if the conditions are met, then `yarn vercel` your app to a public webserver. Submit the url on [SpeedRunEthereum.com](https://speedrunethereum.com)!

> 💬 Meet other builders working on this challenge and get help in the [Challenge 1 Telegram](https://t.me/joinchat/E6r91UFt4oMJlt01)!

🧫 Everything starts by ✏️ Editing `Staker.sol` in `packages/hardhat/contracts`

---

### Checkpoint 0: 📦 Install 📚

Before you begin, you need to install the following tools:

- [Node (v18 LTS)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then run:

```sh
git clone https://github.com/scaffold-eth/se-2-challenges.git challenge-1-decentralized-staking
cd challenge-1-decentralized-staking
git checkout challenge-1-decentralized-staking
yarn install
```

🔏 Edit your smart contract `Staker.sol` in `packages/hardhat/contracts`

---

### Checkpoint 1: 🔭 Environment 📺

You'll have three terminals up for:

```bash
yarn start   (Next app frontend)
yarn chain   (hardhat backend)
yarn deploy  (to compile, deploy, and publish your contracts to the frontend)
```

> 💻 View your frontend at http://localhost:3000/

> 👩‍💻 Rerun `yarn deploy --reset` whenever you want to deploy new contracts to the frontend.

---

### Checkpoint 2: 🥩 Staking 💵

You'll need to track individual `balances` using a mapping:

```solidity
mapping ( address => uint256 ) public balances;
```

And also track a constant `threshold` at `1 ether`

```solidity
uint256 public constant threshold = 1 ether;
```

> 👩‍💻 Write your `stake()` function and test it with the `Debug Contracts` tab in the frontend

💸 Need more funds from the faucet? Enter your frontend address into the wallet to get as much as you need!
// TODO: Add screenshot for the faucet

✏ Need to troubleshoot your code? If you import `hardhat/console.sol` to your contract, you can call `console.log()` right in your Solidity code. The output will appear in your `yarn chain` terminal.

#### 🥅 Goals

- [ ] Do you see the balance of the `Staker` contract go up when you `stake()`?
- [ ] Is your `balance` correctly tracked?
- [ ] Do you see the events in the `All Stakings` tab?

---

### Checkpoint 3: 🔬 State Machine / Timing ⏱

> ⚙️ Think of your smart contract like a _state machine_. First, there is a **stake** period. Then, if you have gathered the `threshold` worth of ETH, there is a **success** state. Or, we go into a **withdraw** state to let users withdraw their funds.

Set a `deadline` of `block.timestamp + 30 seconds`

```solidity
uint256 public deadline = block.timestamp + 30 seconds;
```

👨‍🏫 Smart contracts can't execute automatically, you always need to have a transaction execute to change state. Because of this, you will need to have an `execute()` function that _anyone_ can call, just once, after the `deadline` has expired.

> 👩‍💻 Write your `execute()` function and test it with the `Debug Contracts` tab

> Check the ExampleExternalContract.sol for the bool you can use to test if it has been completed or not. But do not edit the ExampleExternalContract.sol as it can slow the auto grading.

If the `address(this).balance` of the contract is over the `threshold` by the `deadline`, you will want to call: `exampleExternalContract.complete{value: address(this).balance}()`

If the balance is less than the `threshold`, you want to set a `openForWithdraw` bool to `true` and allow users to `withdraw()` their funds.

(You'll have 30 seconds after deploying until the deadline is reached, you can adjust this in the contract.)

> 👩‍💻 Create a `timeLeft()` function including `public view returns (uint256)` that returns how much time is left.

⚠️ Be careful! if `block.timestamp >= deadline` you want to `return 0;`

⏳ The time will only update if a transaction occurs. You can see the time update by getting funds from the faucet button in navbar just to trigger a new block.

// TODO: Tell sometimes the `Staker UI` tab "Time Left" won't update just switch and to other tab and come back to it.

> 👩‍💻 You can call `yarn deploy --reset` any time you want a fresh contract

// TODO: Tell that your `Staker UI` tab should be almost working by this

#### 🥅 Goals

- [ ] Can you see `timeLeft` counting down in the `Staker UI` tab when you trigger a transaction with the faucet button?
- [ ] If you `stake()` enough ETH before the `deadline`, does it call `complete()`?
- [ ] If you don't `stake()` enough can you `withdraw()` your funds?

---

🎀 To improve the user experience, set your contract up so it accepts ETH sent to it and calls `stake()`. You will use what is called the `receive()` function.

> Use the [receive()](https://docs.soliditylang.org/en/v0.8.9/contracts.html?highlight=receive#receive-ether-function) function in solidity to "catch" ETH sent to the contract and call `stake()` to update `balances`.

---

#### 🥅 Goals

- [ ] If you send ETH directly to the contract address does it update your `balance`?

---

## ⚔️ Side Quests

- [ ] Can execute get called more than once, and is that okay?
- [ ] Can you stake and withdraw freely after the `deadline`, and is that okay?
- [ ] What are other implications of _anyone_ being able to withdraw for someone?

---

## 🐸 It's a trap!

- [ ] Make sure funds can't get trapped in the contract! **Try sending funds after you have executed! What happens?**
- [ ] Try to create a [modifier](https://solidity-by-example.org/function-modifier/) called `notCompleted`. It will check that `ExampleExternalContract` is not completed yet. Use it to protect your `execute` and `withdraw` functions.

#### ⚠️ Test it!

- Now is a good time to run `yarn test` to run the automated testing function. It will test that you hit the core checkpoints. You are looking for all green checkmarks and passing tests!

// TODO: Write Test

---

### Checkpoint 5: 🚢 Ship it 🚁

📡 Edit the `defaultNetwork` to [your choice of public EVM networks](https://ethereum.org/en/developers/docs/networks/) in `packages/hardhat/hardhat.config.ts`

👩‍🚀 You will want to run `yarn account` to see if you have a **deployer address**

🔐 If you don't have one, run `yarn generate` to create a mnemonic and save it locally for deploying.

⛽️ You will need to send ETH to your **deployer address** with your wallet.

> 📝 If you plan on submitting this challenge, be sure to set your `deadline` to at least `block.timestamp + 72 hours`

> 🚀 Run `yarn deploy` to deploy your smart contract to a public network (selected in hardhat.config.ts)

---

### Checkpoint 6: 🎚 Frontend 🧘‍♀️

> ✏️ Edit your frontend config `scaffold.config.ts` in `packages/nextjs/scaffold.config.ts` to change the `targetNetwork`

> 💻 View your frontend at http://localhost:3000/stakerUI

📡 When you are ready to ship the frontend app...

📦 Run `yarn vercel` to package up your frontend and deploy.

> Follow the steps to deploy to Vercel. Once you log in (email, github, etc), the default options should work. It'll give you a public URL.

> If you want to redeploy to the same production URL you can run `yarn vercel --prod`. If you omit the `--prod` flag it will deploy it to a preview/test URL.

// TODO: Add the new 3rd party section

---

### Checkpoint 7: 📜 Contract Verification

Run the `yarn verify --network your_network` command to verify your contracts on etherscan 🛰

---

> 🏃 Head to your next challenge [here](https://speedrunethereum.com).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
