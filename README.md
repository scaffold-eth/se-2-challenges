# 🚩 Challenge: 🏵 Token Vendor 🤖

![readme](https://raw.githubusercontent.com/scaffold-eth/se-2-challenges/challenge-token-vendor/extension/packages/nextjs/public/hero.png)

🤖 Smart contracts are kind of like "always on" _vending machines_ that **anyone** can access. Let's make a decentralized, digital currency. Then, let's build an unstoppable vending machine that will buy and sell the currency. We'll learn about the "approve" pattern for ERC20s and how contract to contract interactions work.

🏵 Create `YourToken.sol` smart contract that inherits the **ERC20** token standard from OpenZeppelin. Set your token to `_mint()` **1000** (\* 10 \*\* 18) tokens to the `msg.sender`. Then create a `Vendor.sol` contract that sells your token using a payable `buyTokens()` function.

🎛 Edit the frontend that invites the user to input an amount of tokens they want to buy. We'll display a preview of the amount of ETH it will cost with a confirm button.

🔍 It will be important to verify your token's source code in the block explorer after you deploy. Supporters will want to be sure that it has a fixed supply and you can't just mint more.

🌟 The final deliverable is an app that lets users purchase your ERC20 token, transfer it, and sell it back to the vendor. Deploy your contracts on your public chain of choice and then `yarn vercel` your app to a public web server. Submit the url on [SpeedrunEthereum.com](https://speedrunethereum.com)!

> 💬 Meet other builders working on this challenge and get help in the [Challenge Telegram](https://t.me/joinchat/IfARhZFc5bfPwpjq)!

---

## Checkpoint 0: 📦 Environment 📚

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then download the challenge to your computer and install dependencies by running:

```sh
npx create-eth@2.0.6 -e challenge-token-vendor challenge-token-vendor
cd challenge-token-vendor
```

> in the same terminal, start your local network (a blockchain emulator in your computer):

```sh
yarn chain
```

> in a second terminal window, 🛰 deploy your contract (locally):

```sh
yarn deploy
```

> in a third terminal window, start your 📱 frontend:

```sh
yarn start
```

📱 Open http://localhost:3000 to see the app.

> 👩‍💻 Rerun `yarn deploy --reset` whenever you want to deploy new contracts to the frontend, update your current contracts with changes, or re-deploy it to get a fresh contract address.

---

⚠️ We've disabled Cursor auto-suggestions (Tab completions and predictions) via `.vscode/settings.json` to reduce distractions while you code. AI chat and agent features are still enabled, and we've included `AGENTS.md` and `CLAUDE.md` files with project context to help AI assistants understand the codebase.

🔒 Want to disable AI and do everything yourself? (Recommended for deeper learning):

- Cursor: add `*` to a `.cursorignore` file in the root of your project
- VSCode: set `chat.disableAIFeatures` to `true` in `.vscode/settings.json` file

---

## Checkpoint 1: 🏵Your Token 💵

> 👩‍💻 Go to `packages/hardhat/contracts/YourToken.sol` look at how this contract is inheriting the **ERC20** token standard from OpenZeppelin. This means that the `YourToken` contract obtains every method that is a part of the **ERC20** standard and so it has all the default properties needed to be a used as a token on Ethereum.

> In the `constructor()`, mint a fixed supply of **1000** tokens (with 18 decimals) to `msg.sender` (the deployer).

### Implementing `YourToken`

- Decide on the token name/symbol (already scaffolded for you as "Gold"/"GLD").
- The OpenZeppelin ERC20 contract you are inheriting exposes a `_mint` function you can use to create new tokens.
- Update the constructor to mint **exactly** 1000 tokens to `msg.sender` (the deployer).

<details markdown='1'>
<summary>🔎 Hint</summary>

ERC20 tokens typically use 18 decimals. Solidity has a convenient unit that matches that scaling:

- `1000 ether` is `1000 * 10**18`

So minting 1000 tokens can be as simple as:

- `_mint(msg.sender, 1000 ether);`

<details markdown='1'>

<summary>🎯 Solution</summary>

```solidity
constructor() ERC20("Gold", "GLD") {
    _mint(msg.sender, 1000 ether);
}
```

</details>
</details>

### 🥅 Goals

- ⚠️ **Important:** Your initial token supply was minted to the **deployer**. If the wallet you use in the frontend is a different address, you won’t see a balance there yet.
  - Update `FRONTEND_ADDRESS` in `packages/hardhat/deploy/01_deploy_vendor.ts` and keep `SEND_TOKENS_TO_VENDOR = false` since we are not ready for that step.
  - Then run `yarn deploy --reset` to send the tokens to your frontend wallet so you can test in the UI.

- [ ] Can you check the `balanceOf()` your frontend address in the `Debug Contracts` tab? (`YourToken` contract)
- [ ] Can you `transfer()` your token to another account and check _that_ account's `balanceOf`?

![debugContractsYourToken](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/5fb4daeb-5d05-4522-96b3-76f052a68418)

> 💬 Hint: Use an incognito window to create a new address and try sending to that new address. Can use the `transfer()` function in the `Debug Contracts` tab.

### Testing your progress

🔍 Run:

```shell
yarn test --grep "Checkpoint1"
```

---

## Checkpoint 2: ⚖️ Vendor 🤖

> 👩‍💻 Edit `packages/hardhat/contracts/Vendor.sol` and build a token vending machine with a **payable** `buyTokens()` function.

### Step 1: Add a price constant

Use a price variable named `tokensPerEth` set to **100** (meaning **100 tokens per 1 ETH**):

```solidity
uint256 public constant tokensPerEth = 100;
```

### Step 2: Add custom errors

Instead of `require(condition, "message")`, we’ll use **custom errors** (they’re cheaper at runtime and easier to test).

In the error section of the contract, add these errors for the common failure cases:

```solidity
error InvalidEthAmount();
error InsufficientVendorTokenBalance(uint256 available, uint256 required);
```

### Step 3: Add an event

In the event section of the contract, add an event that the UI (and block explorers) can use to track purchases:

```solidity
event BuyTokens(address indexed buyer, uint256 amountOfETH, uint256 amountOfTokens);
```

### Implementing `buyTokens()`

The `buyTokens()` function should:

- Reject a purchase with **0 ETH**, reverting with `InvalidEthAmount`
- Compute how many tokens the buyer should receive using `msg.value` and `tokensPerEth`
- Make sure the Vendor has enough tokens to sell and if they don't revert with `InsufficientVendorTokenBalance`
- Transfer tokens to the buyer
- Emit the `BuyTokens` event

<details markdown='1'>
<summary>🔎 Hint</summary>

**Decimals gotcha (important):**

- ETH is measured in wei (18 decimals)
- ERC20 tokens in this challenge also use 18 decimals

If `tokensPerEth = 100`, then:

- Sending `1 ether` should yield `100 ether` token units

A simple formula that works with 18-decimals tokens:

- `tokensToBuy = msg.value * tokensPerEth`

Also, you can check how many tokens the vendor holds with:

- `yourToken.balanceOf(address(this))`

<details markdown='1'>

<summary>🎯 Solution</summary>

```solidity
function buyTokens() external payable {
    if (msg.value == 0) revert InvalidEthAmount();

    uint256 amountOfTokens = msg.value * tokensPerEth;
    uint256 vendorBalance = yourToken.balanceOf(address(this));
    if (vendorBalance < amountOfTokens) revert InsufficientVendorTokenBalance(vendorBalance, amountOfTokens);

    yourToken.transfer(msg.sender, amountOfTokens);
    emit BuyTokens(msg.sender, msg.value, amountOfTokens);
}
```

</details>
</details>

### Try it out (frontend + deploy)

Edit `packages/hardhat/deploy/01_deploy_vendor.ts` to set `SEND_TOKENS_TO_VENDOR` to `true`. This will deploy the Vendor contract and automatically seed it with the tokens INSTEAD of sending the tokens to your `FRONTEND_ADDRESS`. It will also set your address as the owner of the Vendor contract but we will dig into that later...

> 🔎 Look in `packages/nextjs/app/token-vendor/page.tsx` and uncomment the `Vendor Balances` and `Buy Tokens` sections to display the Vendor ETH and Token balances as well as enable buying tokens from the frontend.

> You can `yarn deploy --reset` to deploy your contract until you get it right.

![TokenVendorBuy](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/7669cc68-e942-4630-95c8-91cd21af5ba0)

### 🥅 Goals

- [ ] Does the `Vendor` address start with a `balanceOf` **1000** in `YourToken` on the `Debug Contracts` tab?
- [ ] Can you buy **10** tokens for **0.1** ETH?
- [ ] Can you transfer tokens to a different account?

### Testing your progress

🔍 Run:

```shell
yarn test --grep "Checkpoint2"
```

---

## Checkpoint 3: 👑 Ownable + Withdraw 💸

Now that your Vendor can accept ETH via `buyTokens()`, let’s protect the treasury.

### Step 1: Inheriting `Ownable` (OpenZeppelin v5)

The OpenZeppelin Ownable contract adds special methods, modifiers and state variable for helping to secure certain methods. Notably the `onlyOwner` modifier can be used to guard a method so that only the `owner` can call it.

- Notice how the vendor contract already imports `Ownable` from OpenZeppelin
- See how it is inherited in the line defining the contract:

```solidity
contract Vendor is Ownable ...
```

- Lastly see how we define ownership in the constructor with `Ownable(msg.sender)`, making the deployer of the contract the `owner`

We are using the `onlyOwner` modifier to protect the `withdraw` method so that only the owner can withdraw the contract's ETH balance.

### Step 2: Add a custom error for failed transfers

First add an error you will need in the method.

```solidity
error EthTransferFailed(address to, uint256 amount);
```

### Implementing `withdraw()`

Your `withdraw()` function should:

- Be restricted to the owner (`onlyOwner`)
- Send **all ETH** in the Vendor to the owner
- Revert with `EthTransferFailed` if the ETH transfer fails

<details markdown='1'>
<summary>🔎 Hint</summary>

Avoid `transfer()` (it can unexpectedly fail due to gas changes and is no longer supported in the latest Solidity versions). Prefer `call`:

- `(bool ok,) = owner().call{value: amount}("");`

If `ok` is false, revert.

<details markdown='1'>

<summary>🎯 Solution</summary>

```solidity
function withdraw() external onlyOwner {
    uint256 amount = address(this).balance;
    (bool success,) = owner().call{value: amount}("");
    if (!success) revert EthTransferFailed(owner(), amount);
}
```

</details>
</details>

### Try it out

Deploy the updated contract with `yarn deploy --reset` and then go test it out by depositing ETH and withdrawing. You can do this from the `Debug Contracts` tab.

### 🥅 Goals

- [ ] Is your frontend address the `owner` of the `Vendor`?
- [ ] Can your address successfully withdraw all the ETH in the `Vendor`?

### Testing your progress

🔍 Run:

```shell
yarn test --grep "Checkpoint3"
```

---

## Checkpoint 4: 🤔 Vendor Buyback 🤯

👩‍🏫 The hardest part of this challenge is to build your `Vendor` in such a way so that it can buy the tokens back.

🧐 The reason why this is hard is the `approve()` pattern in ERC20s.

😕 First, the user has to call `approve()` on the `YourToken` contract, approving the `Vendor` contract address to take some amount of tokens.

🤨 Then, the user makes a _second transaction_ to the `Vendor` contract to `sellTokens(uint256 amount)`.

🤓 The `Vendor` should call `yourToken.transferFrom(msg.sender, address(this), theAmount)` and if the user has approved the `Vendor` correctly, tokens should transfer to the `Vendor` and ETH should be sent to the user.

<details markdown='1'>
<summary>🤔 But why do we need the <code>approve</code> method?</summary>

The crux of the issue is this: if smart contracts can move tokens out of your wallet, how do you make sure that only the smart contract you _want_ to take tokens is the one that’s allowed to do it?

Here’s the simple mental model:

- **`approve(spender, amount)` = “I allow this contract to spend up to X of my tokens.”**
  - It does **not** move tokens.
  - It writes an **allowance** into the token contract: `allowance[you][spender] = amount`.

- **`transferFrom(from, to, amount)` = “Use that permission to pull tokens.”**
  - The `Vendor` contract calls this during `sellTokens(...)`.
  - The token contract checks the allowance and only lets the transfer happen if it’s big enough.

What this unlocks: **safe, pull-based token interactions** where a contract can perform an action (swap, buyback, marketplace purchase, subscription, etc.) and pull exactly the tokens it needs, **without having blanket access to your wallet**. You can also **limit risk** by approving only the exact amount (or revoke later by approving `0`).

Luckily, wallet UX is improving fast. With proposals like **EIP-7702** now being enabled on Ethereum, a wallet can let you sign **one** “sell” action that executes a small bundle of steps atomically (e.g. `approve` + `sellTokens` / `transferFrom`) in a single transaction, instead of making you click through two separate user actions. The underlying ERC-20 allowance model still exists; you’re just authorizing a smarter, batched execution path. This only needs to be adopted by wallets and frontends for users to reap the benefits.

</details>

### Step 1: Add custom errors + event

```solidity
error InvalidTokenAmount();
error InsufficientVendorEthBalance(uint256 available, uint256 required);

event SellTokens(address indexed seller, uint256 amountOfTokens, uint256 amountOfETH);
```

### Implementing `sellTokens(uint256 amount)`

Your `sellTokens(amount)` should:

- Reject `amount == 0` with `InvalidTokenAmount`
- Pull tokens from the user with `transferFrom` (requires prior `approve` call by user)
- Compute the ETH to return using the inverse of your pricing
- Ensure the Vendor has enough ETH liquidity and if not, revert with `InsufficientVendorEthBalance`
- Send ETH back to the user
- Emit a `SellTokens` event

<details markdown='1'>
<summary>🔎 Hint</summary>

If `tokensPerEth = 100`, then the inverse conversion is:

- `ethToReturn = amount / tokensPerEth`

<details markdown='1'>

<summary>🎯 Solution</summary>

```solidity
function sellTokens(uint256 amount) external {
    if (amount == 0) revert InvalidTokenAmount();

    uint256 amountOfETH = amount / tokensPerEth;
    uint256 vendorEthBalance = address(this).balance;
    if (vendorEthBalance < amountOfETH) revert InsufficientVendorEthBalance(vendorEthBalance, amountOfETH);

    yourToken.transferFrom(msg.sender, address(this), amount);

    (bool success,) = msg.sender.call{value: amountOfETH}("");
    if (!success) revert EthTransferFailed(msg.sender, amountOfETH);

    emit SellTokens(msg.sender, amount, amountOfETH);
}
```

</details>
</details>

### Try it out

🔁 Redeploy (`yarn deploy --reset`) and try out your new function!

🔨 Use the `Debug Contracts` tab to call the approve and sellTokens() at first but then...

🔍 Look in the `packages/nextjs/app/token-vendor/page.tsx` for the extra approve/sell UI to uncomment and then go to `packages/nextjs/app/events/page.tsx` and uncomment the `SellTokens Events` section to update the `Events` tab on the frontend.

![VendorBuyBack](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/99063aaa-368d-4156-997d-08dff99af11b)

### 🥅 Goal

- [ ] Can you sell tokens back to the vendor?
- [ ] Do you receive the right amount of ETH for the tokens?
- [ ] Do you see `SellTokens` events in the `Events` tab now?

![Events](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/662c96b5-d53f-4efa-af4a-d3106bfd47f0)

### ⚔️ Side Quests

- [ ] Should we disable the `owner` withdraw to keep liquidity in the `Vendor`?
- [ ] Would people be more interested in your token if they knew there wasn't a way to drain the ETH backing?

### Testing your progress

🔍 Run:

```shell
yarn test --grep "Checkpoint4"
```

---

## Checkpoint 5: 💾 Deploy your contracts! 🛰

📡 Edit the `defaultNetwork` in `hardhat.config.ts` to match the name of one of testnets from the `networks` object. We recommend to use `"sepolia"` or `"optimismSepolia"`

🔐 You will need to generate a **deployer address** using `yarn generate` This creates a mnemonic and saves it locally.

👩‍🚀 Use `yarn account` to view your deployer account balances.

⛽️ You will need to send ETH to your deployer address with your wallet, or get it from a public faucet of your chosen network. You can also request ETH by sending a message with your new deployer address and preferred network in the [challenge Telegram](https://t.me/joinchat/IfARhZFc5bfPwpjq). People are usually more than willing to share.

🚀 Run `yarn deploy` to deploy your smart contract to a public network (selected in `hardhat.config.ts`)

> 💬 Hint: Instead of editing `hardhat.config.ts` you can just add a network flag to the deploy command like this: `yarn deploy --network sepolia` or `yarn deploy --network optimismSepolia`

---

## Checkpoint 6: 🚢 Ship your frontend! 🚁

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
This is great to complete your **Speedrun Ethereum**.

For production-grade applications, it's recommended to obtain your own API keys (to prevent rate limiting issues). You can configure these at:

- 🔷`ALCHEMY_API_KEY` variable in `packages/hardhat/.env` and `packages/nextjs/.env.local`. You can create API keys from the [Alchemy dashboard](https://dashboard.alchemy.com/).

- 📃`ETHERSCAN_API_KEY` variable in `packages/hardhat/.env` with your generated API key. You can get your key [here](https://etherscan.io/myapikey).

> 💬 Hint: It's recommended to store env's for nextjs in Vercel/system env config for live apps and use .env.local for local testing.

---

## Checkpoint 7: 📜 Contract Verification

Run the `yarn verify --network your_network` command to verify your contracts on etherscan 🛰

👀 You may see an address for both YourToken and Vendor. You will want the Vendor address.

👉 Search this address on [Sepolia Etherscan](https://sepolia.etherscan.io/) (or [Optimism Sepolia Etherscan](https://sepolia-optimism.etherscan.io/) if you deployed to OP Sepolia) to get the URL you submit to 🏃‍♀️[SpeedrunEthereum.com](https://speedrunethereum.com).

---

> 🏃 Head to your next challenge [here](https://speedrunethereum.com).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
