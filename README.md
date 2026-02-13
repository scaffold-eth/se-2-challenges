# 🚩 Challenge: 📣 Crowdfunding App

![readme-1](https://raw.githubusercontent.com/scaffold-eth/se-2-challenges/challenge-crowdfunding/extension/packages/nextjs/public/hero.png)

🦸 A superpower of Ethereum is allowing you, the builder, to create a simple set of rules that an adversarial group of players can use to work together. In this challenge, you create a decentralized application where users can coordinate a group funding effort. If the users cooperate, the money is collected in a second smart contract. If they defect, the worst that can happen is everyone gets their money back. The users only have to trust the code, not each other.

🌟 The final deliverable is deploying a Dapp that lets users send ether to a contract and then fund the cause if the conditions are met, then `yarn vercel` your app to a public webserver. Submit the url on [SpeedrunEthereum.com](https://speedrunethereum.com)!

> 💬 Meet other builders working on this challenge and get help in the [challenge Telegram](https://t.me/joinchat/E6r91UFt4oMJlt01)!

---

## Checkpoint 0: 📦 Environment 📚

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then download the challenge to your computer and install dependencies by running:

```sh
npx create-eth@2.0.6 -e challenge-crowdfunding challenge-crowdfunding
cd challenge-crowdfunding
```

> in the same terminal, start your local network (a blockchain emulator in your computer):

```sh
yarn chain
```

> in a second terminal window, 🛰 deploy your contract (locally):

```sh
cd challenge-crowdfunding
yarn deploy
```

> in a third terminal window, start your 📱 frontend:

```sh
cd challenge-crowdfunding
yarn start
```

📱 Open http://localhost:3000 to see the app.

> 👩‍💻 Rerun `yarn deploy` whenever you want to deploy new contracts to the frontend. If you haven't made any contract changes, you can run `yarn deploy --reset` for a completely fresh deploy.

🔏 Now you are ready to edit your smart contract `CrowdFund.sol` in `packages/hardhat/contracts`

---


⚗️ At this point you will need to know basic Solidity syntax. If not, you can pick it up quickly by tinkering with concepts from [📑 Solidity By Example](https://solidity-by-example.org/) using [🏗️ Scaffold-ETH-2](https://scaffoldeth.io). (In particular: global units, primitive data types, mappings, sending ether, and payable functions.)

---


⚠️ We have disabled AI in Cursor and VSCode and highly suggest that you do not enable it so you can focus on the challenge, do everything by yourself, and hence better understand and remember things. If you are using another IDE, please disable AI yourself.

🔧 If you are a vibe-coder and don't care about understanding the syntax of the code used and just want to understand the general takeaways, you can re-enable AI by:

- Cursor: remove `*` from `.cursorignore` file
- VSCode: set `chat.disableAIFeatures` to `false` in `.vscode/settings.json` file

---

## 🧑‍🚀 Your Mission

🏦 Build a `CrowdFund.sol` contract that collects **ETH** from numerous addresses using a payable `contribute()` function and keeps track of `balances`. After some `deadline` if it has at least some `threshold` of ETH, it sends it to a `FundingRecipient` contract (This is a stand-in for any potential use case a group of people would want to fund together). It then triggers the `complete()` action, sending the full balance. If not enough **ETH** is collected, allow users to `withdraw()`.

🔢 Each step is laid out in the following checkpoints. Try to complete them without hints but if you are struggling then you can get clearer context by pressing the  "🔎 Hint" in each checkpoint.

👀 Also, you should try to keep your contract organized by the standard you will see in the contract. Keeping errors, events, functions, etc. sorted under their own sections helps to maintain contract readability.
## Checkpoint 1: 🤝 Contributing 💵

>Let's start by implementing a state variable that we will need in the function logic.

⚖️ You'll need to track individual `balances` using a mapping. This way we will know who gave what in the event that the funding effort fails to raise enough and everyone needs to be refunded. Add it under the existing fundingRecipient variable.

```solidity
mapping(address => uint256) public balances;
```

> Next let's add an event. Events are useful for outside services that are watching the chain  for certain things to occur. In our case, the front end is going to use this event to know when a contribution takes place.

📣 Add an event to the contract called `Contribution` that receives the address of the contributor and the amount they contributed.

```solidity
event Contribution(address, uint256);
```

 >📝 Note: If you use named arguments in your event (e.g. `event Contribution(address indexed contributor, uint256 amount)`), you'll need to update `/packages/nextjs/app/contributions/page.tsx` to reference event parameters by their names instead of numeric indices.

### Implementing the `contribute()` function

> 👩‍💻 Now focus on writing your `contribute()` function. The payable method already exists but is empty. Go fill it with logic!

The goal of this function is to allow anyone to contribute to the pool of funds. To do this effectively it will need to do the following:
- Update the `balances` mapping
- Emit the `Contribute` event 

<details markdown='1'>
<summary>🔎 Hint</summary>

You can set mappings like you would access a Javascript array.
For a mapping like this `mapping(address => uint256) public map` and `address addr = 0x1234...5678` you would access is like this: `map[addr]`.

You need to use the address for the sender of the transaction and you will need to know how much value was sent. Is there an easy way to access these details about the transaction `msg`? 🤔 

Go check https://solidity-by-example.org/ if you need help on the syntax.

<details markdown='1'>

<summary>🎯 Solution</summary>

```solidity
function contribute() public payable {
	balances[msg.sender] += msg.value;
	emit Contribution(msg.sender, msg.value);
}
```

</details>
</details>

### Try it out

👩‍💻 Now redeploy (`yarn deploy`) and go test your function using the `Debug Contracts` tab in the front end.

![debugContracts](https://github.com/user-attachments/assets/7d50245b-72f5-433e-b327-0c7e70e83e51)

> 💸 Need more funds from the faucet? Click on _"Grab funds from faucet"_, or use the Faucet feature at the bottom left of the page to get as much as you need!

![Faucet](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/e82e3100-20fb-4886-a6bf-4113c3729f53)

> ✏ Need to troubleshoot your code? `hardhat/console.sol` is already imported in your contract so you can call `console.log()` right in your Solidity code. The output will appear in your `yarn chain` terminal.

---

### 🥅 Goals

- [ ] Do you see the balance of the `CrowdFund` contract go up when you `contribute()`?
- [ ] Is your `balance` correctly tracked?
- [ ] Do you see the events in the `Contributions` tab?

![allContributions](https://github.com/user-attachments/assets/b50a8687-e2ba-4ba5-aa9d-fd0f100345fc)

### Testing your progress

🔍 Run the following command to check if you implemented the function correctly.

```shell
yarn test --grep "Checkpoint1"
```

✅ Did the tests pass? You can dig into any errors by viewing the tests at `packages/hardhat/test/CrowdFund.ts`.

---

## Checkpoint 2: 📤 Withdrawing Funds

> Let's implement the `withdraw` function. First lets set up an important state variable and some errors we may need.

 🔘 / ⚪ Create a bool to track whether the contract is `openToWithdraw` in the case that the funding fails to fill enough before the deadline and everyone needs to be refunded.

```solidity
bool public openToWithdraw; // Solidity variables default to an empty/false state
```

🚫 Next let's add the following custom errors to the `/// Errors` section of the contract.

```solidity
error NotOpenToWithdraw();
error WithdrawTransferFailed(address to, uint256 amount);
```

> ❓Did you know that custom errors are more gas efficient than using revert string errors?  
>
> ❌ `require(condition, "Condition Not Met")`
>
> ✔️ `if (!condition) { revert ConditionNotMet(); }`

### Implementing the `withdraw()` function

> 🛠️ Now you can implement the logic inside the  `withdraw` function.

This function will need to do the following:
- Check that `openToWithdraw` is true. Throw `NotOpenToWithdraw` if not.
- Send the correct amount to the user who is withdrawing. Throw `WithdrawTransferFailed` if it does not succeed.

<details markdown='1'>
<summary>🔎 Hint</summary>

You need to send the user's balance (`balances[msg.sender]`) back to their address.
The important thing is that you only send the correct amount to the user AND they can only do it when `openToWithdraw` is true.

<details markdown='1'>

<summary>🎯 Solution</summary>

```solidity
function withdraw() public {
	if (!openToWithdraw) revert NotOpenToWithdraw();
	
	uint256 balance = balances[msg.sender];
	balances[msg.sender] = 0;
	
	(bool success,) = msg.sender.call{value: balance}("");
	if (!success) revert WithdrawTransferFailed(msg.sender, balance);
}
```

</details>
</details>

### Try it out

⚙️ Go switch `openToWithdraw` to be true by default so we can test the function through the front end: `bool public openToWithdraw = true;`

👩‍💻 Now redeploy (`yarn deploy`) and go test your function using the `Crowdfund` or `Debug Contracts` tabs in the front end. You should be able to contribute and then withdraw the ether. 

>‼️ Once you are content that it works as expected make sure you switch `openToWithdraw` back to false.

---

### 🥅 Goals

- [ ] Can you withdraw your ether after contributing?
- [ ] What happens if you try to withdraw again after you have already withdrawn? Does this always fail?
- [ ] What about with multiple users? 
### Testing your progress

🔍 Run the following command to check if you implemented the function correctly.

```shell
yarn test --grep "Checkpoint2"
```

✅ Did the tests pass? You can dig into any errors by viewing the tests at `packages/hardhat/test/CrowdFund.ts`.

---

## Checkpoint 3: 🔬 State Machine / Timing ⏱

### State Machine

> ⚙️ Think of your smart contract like a _state machine_. First, there is a **contribute** period. Then, if you have gathered a certain `threshold` worth of ETH, there is a **success** state. Or, we go into a **withdraw** state to let users withdraw their funds.

⌛ Let's go ahead and add a `deadline` variable and set it to the current `block.timestamp` plus 30 seconds. We will need this to know if time is up.

```solidity
uint256 public deadline = block.timestamp + 30 seconds;
```

📏 Also track a constant called `threshold` set to `1 ether`. This will be the threshold at which we will consider the cause to be funded. Below this threshold it will be the failure scenario where people withdraw their funds.

```solidity
uint256 public constant threshold = 1 ether;
```

🚫 Let's add another custom error that we can throw if this function gets called too early.

```solidity
error TooEarly(uint256 deadline, uint256 currentTimestamp);
```

### Implementing the `execute()` function

>🧠 Smart contracts can't execute automatically, you always need to have a transaction execute to change state. Because of this, you will need to have an `execute()` function that _anyone_ can call, just once, after the `deadline` has expired.

👩‍💻 Write your `execute()` function. It will need to do the following:
- Make sure it can only be executed when the deadline has passed. If not then throw `TooEarly`
- If the threshold is met then trigger the `fundingRecipient.complete` method while sending the locked funds
- Otherwise set `openToWithdraw` to true so that people can get their funds back

> ‼️ Check the `FundingRecipient.sol` to see what function you will call but DO NOT edit the `FundingRecipient.sol` as it can slow the auto grading.

<details markdown='1'>
<summary>🔎 Hint</summary>

If the `address(this).balance` of the contract is over the `threshold` by the `deadline`, you will want to call: `fundingRecipient.complete{value: address(this).balance}()`

If the balance is less than the `threshold`, you want to set the `openForWithdraw` bool to `true` which will allow users to `withdraw()` their funds.

<details markdown='1'>

<summary>🎯 Solution</summary>

```solidity
function execute() public {
	if (block.timestamp <= deadline) revert TooEarly(deadline, block.timestamp);
	
	if (address(this).balance >= threshold) {
		fundingRecipient.complete{value: address(this).balance}();
	} else {
		openToWithdraw = true;
	}
}
```

</details>
</details>

### Timing

🏃You'll have 30 seconds after deploying until the deadline is reached, you can adjust this in the contract to make it longer if that helps you test.

> 👩‍💻 Go update the `timeLeft()` view function so that it returns how much time is left.

⚠️ Be careful! If `block.timestamp >= deadline` you want to `return 0;`

<details markdown='1'>
<summary>🔎 Hint</summary>

If the `deadline` is greater than `block.timestamp` then return the difference between the two. Otherwise return 0.

<details markdown='1'>

<summary>🎯 Solution</summary>

```solidity
function timeLeft() public view returns (uint256) {
	return deadline > block.timestamp ? deadline - block.timestamp : 0;
}
```

</details>
</details>

> 👩‍💻 You can call `yarn deploy --reset` any time you want a fresh contract, it will get redeployed even if there are no changes on it.
> You may need it when you want to reload the _"Time Left"_ of your tests.

### Try it out

💪 Your `Crowdfund` tab should be almost done and working at this point. Test out all the functionality to see if the `Execute!` button works as expected for each case.

![Crowdfund](https://github.com/user-attachments/assets/1ad2365f-1e1a-4688-9f81-4bbef2a989d2)

---

### 🥅 Goals

- [ ] Can you see `timeLeft` counting down in the `Crowdfund` tab?
- [ ] If enough ETH is contributed by the deadline, does your `execute()` function correctly call `complete()` and contribute the ETH?
- [ ] If the threshold isn't met by the deadline, are you able to `withdraw()` your funds?
### Testing your progress

🔍 Run the following command to check if you implemented the functions correctly.

```shell
yarn test --grep "Checkpoint3"
```

✅ Did the tests pass? You can dig into any errors by viewing the tests at `packages/hardhat/test/CrowdFund.ts`.

---

## Checkpoint 4: 💵 Receive Function / UX 🙎

🎀 To improve the user experience, set your contract up so it accepts ETH sent to it and calls `contribute()`. You will use a special `receive()` function that is called by default when people send funds to a contract.

> Use the [receive()](https://docs.soliditylang.org/en/v0.8.9/contracts.html?highlight=receive#receive-ether-function) function in solidity to "catch" ETH sent to the contract *without a specific method indicated* and call `contribute()` to update `balances`.

<details markdown='1'>
<summary>🔎 Hint</summary>

Don't overthink it. This `receive` method will be called anytime somebody sends funds directly to your contract without any particular method specified. Just make sure the `contribute()` method is called when this happens so that their balance is updated.

<details markdown='1'>

<summary>🎯 Solution</summary>

```solidity
receive() external payable {
	contribute();
}
```

</details>
</details>

---

### 🥅 Goals

- [ ] If you send ETH directly to the contract address does it update your `balance` and the `balance` of the contract?

---

## ⚔️ Side Quests

- [ ] Can `execute()` get called more than once, and is that okay?
- [ ] Can you contribute and withdraw freely after the `deadline`, and is that okay?

---

### 🐸 It's a trap!

- [ ] Make sure funds can't get trapped in the contract! **Try sending funds after you have executed! What happens?**
- [ ] Update the [modifier](https://solidity-by-example.org/function-modifier/) called `notCompleted`. It should check that `FundingRecipient` is not completed yet. Use it to protect your `execute`, `contribute` and `withdraw` functions by throwing a new custom error if it has already been completed.

<details markdown='1'>
<summary>🔎 Hint</summary>

You can access the funding recipient contract with the `fundingRecipient` variable. Then you just need to make sure that `.completed()` does not return `true`. If it does then you need to revert with an error; Your choice for what the error will be called. `AlreadyCompleted`? `RecipientAlreadyFunded`? Or your own idea for a good error name. You choose!

<details markdown='1'>

<summary>🎯 Solution</summary>

```solidity
// Errors
// ...Existing errors
error AlreadyCompleted(); // Or whatever name you want

// Modifiers
modifier notCompleted() {
	if (fundingRecipient.completed()) revert AlreadyCompleted(); 
	_;
}

// Functions
function contribute() public payable notCompleted {
	// ...Existing code
}

function withdraw() public notCompleted {
	// ...Existing code
}

function execute() public notCompleted {
	// ...Existing code
}
```

</details>
</details>

### ⚠️ Test it!

- Now is a good time to run `yarn test` to run the automated testing for everything you have done. It will test that you hit the core checkpoints. You are looking for all green checkmarks and passing tests!

---

## Checkpoint 5: 💾 Deploy your contract! 🛰

📡 Edit the `defaultNetwork` in `hardhat.config.ts` to match the name of one of testnets from the `networks` object. We recommend to use `"sepolia"` or `"optimismSepolia"`

🔐 You will need to generate a **deployer address** using `yarn generate` This creates a mnemonic and saves it locally.

👩‍🚀 Use `yarn account` to view your deployer account balances.

⛽️ You will need to send ETH to your deployer address with your wallet, or get it from a public faucet of your chosen network. You can also request ETH by sending a message with your new deployer address and preferred network in the [challenge Telegram](https://t.me/joinchat/E6r91UFt4oMJlt01). People are usually more than willing to share.

> 📝 If you plan on testing your challenge on the live network don't forget to set your `deadline` to a nice amount of time such as `block.timestamp + 2 hours`

🚀 Run `yarn deploy` to deploy your smart contract to a public network (selected in `hardhat.config.ts`)

> 💬 Hint: Instead of editing `hardhat.config.ts` you can just add a network flag to the deploy command like this: `yarn deploy --network sepolia` or `yarn deploy --network optimismSepolia`

![allContributions-blockFrom](https://github.com/user-attachments/assets/e544a9b4-1bb9-4b0a-8729-d57d0b9869cf)

---

## Checkpoint 6: 🚢 Ship your frontend! 🚁

✏️ Edit your frontend config in `packages/nextjs/scaffold.config.ts` to change the `targetNetwork` to `chains.sepolia` (or `chains.optimismSepolia` if you deployed to OP Sepolia)

💻 View your frontend at http://localhost:3000/crowdfund and verify you see the correct network.

📡 When you are ready to ship the frontend app...

📦 Run `yarn vercel` to package up your frontend and deploy.

> You might need to log in to Vercel first by running `yarn vercel:login`. Once you log in (email, GitHub, etc), the default options should work.

> If you want to redeploy to the same production URL you can run `yarn vercel --prod`. If you omit the `--prod` flag it will deploy it to a preview/test URL.

> Follow the steps to deploy to Vercel. It'll give you a public URL.

> 🦊 Since we have deployed to a public testnet, you will now need to connect using a wallet you own or use a burner wallet. By default 🔥 `burner wallets` are only available on `hardhat`. You can enable them on every chain by setting `onlyLocalBurnerWallet: false` in your frontend config (`scaffold.config.ts` in `packages/nextjs/`).

#### Configuration of Third-Party Services for Production-Grade Apps.

By default, 🏗 Scaffold-ETH 2 provides predefined API keys for popular services such as Alchemy and Etherscan. This allows you to begin developing and testing your applications more easily, avoiding the need to register for these services.

This is great for going through **Speedrun Ethereum** but...

For production-grade applications, it's recommended to obtain your own API keys (to prevent rate limiting issues). You can configure these at:

- `ALCHEMY_API_KEY` variable in `packages/hardhat/.env` and `packages/nextjs/.env.local`. You can create API keys from the [Alchemy dashboard](https://dashboard.alchemy.com/).

- `ETHERSCAN_API_KEY` variable in `packages/hardhat/.env` with your generated API key. You can get your key [here](https://etherscan.io/myapikey).

> 💬 Hint: It's recommended to store env's for nextjs in Vercel/system env config for live apps and use .env.local for local testing.

---

## Checkpoint 7: 📜 Contract Verification

Run the `yarn verify --network your_network` command to verify your contracts on etherscan 🛰

👉 Search this address on [Sepolia Etherscan](https://sepolia.etherscan.io/) (or [Optimism Sepolia Etherscan](https://sepolia-optimism.etherscan.io/) if you deployed to OP Sepolia) to get the URL you submit to [SpeedrunEthereum.com](https://speedrunethereum.com).

---


> 🏃 Head to your next challenge [here](https://speedrunethereum.com).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
