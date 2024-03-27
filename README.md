# 🚩 Challenge 3: 🎲 Dice Game

![readme-3](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/45050937-3873-444f-831e-a7cbfd3c2897)

> 🎰 Randomness is tricky on a public deterministic blockchain. The block hash is an easy to use, but very weak form of randomness. This challenge will give you an example of a contract using block hash to create random numbers. This randomness is exploitable. Other, stronger forms of randomness include commit/reveal schemes, oracles, or VRF from Chainlink.

> 👍 One day soon, randomness will be built into the Ethereum protocol!

> 💬 Dice Game is a contract that allows users to roll the dice to try and win the prize. If players roll either a 0, 1, 2, 3, 4 or 5 they will win the current prize amount. The initial prize is 10% of the contract's balance, which starts out at .05 Eth.

> 🧤 Every time a player rolls the dice, they are required to send .002 Eth. 40 percent of this value is added to the current prize amount while the other 60 percent stays in the contract to fund future prizes. Once a prize is won, the new prize amount is set to 10% of the total balance of the DiceGame contract.

> 🧨 Your job is to attack the Dice Game contract! You will create a new contract that will predict the randomness ahead of time and only roll the dice when you're guaranteed to be a winner!

> 💬 Meet other builders working on this challenge and get help in the [Challenge 3 telegram](https://t.me/+3StA0aBSArFjNjUx)!

---

## Checkpoint 0: 📦 Environment 📚

Before you begin, you need to install the following tools:

- [Node (v18 LTS)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then download the challenge to your computer and install dependencies by running:

```sh
git clone https://github.com/scaffold-eth/se-2-challenges.git challenge-3-dice-game
cd challenge-3-dice-game
git checkout challenge-3-dice-game
yarn install
```

> in the same terminal, start your local network (a blockchain emulator in your computer):

```sh
yarn chain
```

> in a second terminal window, 🛰 deploy your contract (locally):

```sh
cd challenge-3-dice-game
yarn deploy
```

> in a third terminal window, start your 📱 frontend:

```sh
cd challenge-3-dice-game
yarn start
```

📱 Open http://localhost:3000 to see the app.

> 👩‍💻 Rerun `yarn deploy` whenever you want to deploy new contracts to the frontend. If you haven't made any contract changes, you can run `yarn deploy --reset` for a completely fresh deploy.

---

## Checkpoint 1: 🎲 Dice Game

🔍 Inspect the code in the `DiceGame.sol` contract in `packages/hardhat/contracts`

🔒 You will not be changing any code in the `DiceGame.sol` contract in this challenge. You will write your own contract to predict the outcome, then only roll the dice when it is favourable.

💸 Grab some funds from the faucet and roll the dice a few times. Watch the balance of the DiceGame contract in the Debug tab. It increases on a failed roll and decreases by the prize amount on a successful roll.

![Faucet](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/e82e3100-20fb-4886-a6bf-4113c3729f53)

### 🥅 Goals

- [ ] Track the solidity code to find out how the DiceGame contract is generating random numbers.
- [ ] Is it possible to predict the random number for any given roll?

---

## Checkpoint 2: 🔑 Rigged Contract

Start by creating a `receive()` function in the `RiggedRoll.sol` contract to allow it to receive Eth. This will allow us to fund the RiggedRoll contract from the faucet which is required for our contract to call the `rollTheDice()` function.

Next add a `riggedRoll()` function. This function should predict the randomness of a roll, and if the outcome will be a winner, call `rollTheDice()` on the DiceGame contract.

🃏 Predict the outcome by generating your random numbers in the exact same way as the DiceGame contract.

> 📣 Reminder! Calling `rollTheDice()` will fail unless you send a message value of at least .002 Eth! [Here is one example of how to send value with a function call.](https://ethereum.stackexchange.com/questions/6665/call-contract-and-send-value-from-solidity)

🚀 To deploy your RiggedRoll contract, uncomment the appropriate lines in the `01_deploy_riggedRoll.ts` file in `packages/hardhat/deploy`

💸 You will need to send some funds to your RiggedRoll contract before doing your first roll, you can use the Faucet button at the bottom left of the page.

❓ If you're struggling to get the exact same random number as the DiceGame contract, try adding some `console.log()` statements in both contracts to help you track the values. These messages will appear in the Hardhat node terminal.

### ⚔️ Side Quest

- [ ] Add a statement to require `address(this).balance >= .002 ether` in your riggedRoll function. This will help prevent calling the `rollTheDice()` function without enough value.
- [ ] Uncomment the code in `packages/nextjs/app/dice/page.tsx` to show a riggedRoll button and contract balance on the main UI tab. Now you can test your function without switching tabs.
- [ ] Does your riggedRoll function only call `rollTheDice()` when it's going to be a winning roll? What happens when it does call `rollTheDice()`?

![RiggedLosingRoll](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/b6c8d7b4-139b-4f54-a62c-a0c77b3692a3)

---

## Checkpoint 3: 💵 Where's my money?!?

You have beaten the game, but where is your money? Since the RiggedRoll contract is the one calling `rollTheDice()`, that is where the prize money is being sent.

![RiggedRollAddress](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/e9b9d164-2fb1-416a-9c5e-198d15bca0c6)

📥 Create a `withdraw(address _addr, uint256 _amount)` function to allow you to send Eth from RiggedRoll to another address.

### 🥅 Goals

- [ ] Can you send value from the RiggedRoll contract to your front end address?
- [ ] Is anyone able to call the withdraw function? What would be the downside to that?

### ⚔️ Side Quest

- [ ] Lock the withdraw function so it can only be called by the owner.

![WithdrawOnlyOwner](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/e8397b1e-a077-4009-b518-30a6d8deb6e7)

> ⚠️ But wait, I am not the owner! You will want to set your front end address as the owner in `01_deploy_riggedRoll.ts`. This will allow your front end address to call the withdraw function.

## Checkpoint 4: 💾 Deploy your contracts! 🛰

📡 Edit the `defaultNetwork` to [your choice of public EVM networks](https://ethereum.org/en/developers/docs/networks/) in `packages/hardhat/hardhat.config.ts`

🔐 You will need to generate a **deployer address** using `yarn generate` This creates a mnemonic and saves it locally.

👩‍🚀 Use `yarn account` to view your deployer account balances.

⛽️ You will need to send ETH to your **deployer address** with your wallet, or get it from a public faucet of your chosen network.

🚀 Run `yarn deploy` to deploy your smart contract to a public network (selected in `hardhat.config.ts`)

> 💬 Hint: You can set the `defaultNetwork` in `hardhat.config.ts` to `sepolia` **OR** you can `yarn deploy --network sepolia`.

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

👉 Search this address on Etherscan to get the URL you submit to 🏃‍♀️[SpeedRunEthereum.com](https://speedrunethereum.com).

---

> 🏃 Head to your next challenge [here](https://speedrunethereum.com).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
