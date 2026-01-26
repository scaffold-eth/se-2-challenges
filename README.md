# 🚩 Challenge: ⚖️ Build a DEX

![readme-4](https://raw.githubusercontent.com/scaffold-eth/se-2-challenges/challenge-dex/extension/packages/nextjs/public/hero.png)

💵 Build an exchange that swaps ETH to tokens and tokens to ETH. 💰 This is possible because the smart contract holds reserves of both assets and has a price function based on the ratio of the reserves. Liquidity providers are issued a token that represents their share of the reserves and fees.

🧮 You'll implement a minimal constant-product market maker (like Uniswap v2): the DEX holds reserves of both assets and uses a pricing curve \(x * y = k\). You'll add trading and liquidity provisioning, then try it out in the frontend UI.

🌟 The final deliverable is an app that lets users swap **ETH ↔︎ $BAL** and provide/withdraw liquidity. Deploy to a public testnet, ship the frontend, and submit on [SpeedrunEthereum.com](https://speedrunethereum.com)!

> 💬 Meet other builders working on this challenge and get help in the [Challenge Telegram](https://t.me/+_NeUIJ664Tc1MzIx)

---

## Checkpoint 0: 📦 Environment 📚

🧰 Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then download the challenge to your computer and install dependencies by running:

```sh
npx create-eth@2.0.4 -e challenge-dex challenge-dex
cd challenge-dex
```

> in the same terminal, start your local network (a blockchain emulator in your computer):

```sh
yarn chain
```

> in a second terminal window, 🛰 deploy your contract (locally):

```sh
cd challenge-dex
yarn deploy
```

> in a third terminal window, start your 📱 frontend:

```sh
cd challenge-dex
yarn start
```

📱 Open http://localhost:3000 to see the app.

> 👩‍💻 Rerun `yarn deploy --reset` whenever you want to deploy new contracts to the frontend, update your current contracts with changes, or re-deploy it to get a fresh contract address.

---

⚠️ We have disabled AI in Cursor and VSCode and highly suggest that you do not enable it so you can focus on the challenge, do everything by yourself, and hence better understand and remember things. If you are using another IDE, please disable AI yourself.

🔧 If you are a vibe-coder and don't care about understanding the syntax of the code used and just want to understand the general takeaways, you can re-enable AI by:
- Cursor: remove `*` from `.cursorignore` file
- VSCode: set `chat.disableAIFeatures` to `false` in `.vscode/settings.json` file

---

## Checkpoint 1: 🔭 The Structure 📺

🧭 Navigate to the `Debug Contracts` tab, you should see two smart contracts displayed called `DEX` and `Balloons`.

- `packages/hardhat/contracts/Balloons.sol`: a simple ERC20 that mints the deployer some $BAL
- `packages/hardhat/contracts/DEX.sol`: the exchange contract you will implement

> Below is what your front-end will look like without the implementation code within your smart contracts. The buttons will likely break because there are no functions tied to them yet!
![firstLoad](https://github.com/user-attachments/assets/f8b2ec8f-444d-4ec0-969b-3edafcbc36c9)

🗂️ You can find the page's code here: `packages/nextjs/app/dex/page.tsx`

🔍 You'll notice the frontend calls several functions that are defined in the DEX contract.

🎯 None of these functions have any logic inside them. That is your mission! Let's implement them in the following checkpoints.

---

## Checkpoint 2: ⚖️ Reserves

🏦 To start trading, the DEX needs reserves of **both** ETH and $BAL.

💧 These reserves will provide liquidity that allows anyone to swap between the assets.

🧾 Let's start with declaring our `totalLiquidity` and the `liquidity` of each user of our DEX!

🌱 Then you'll implement `init(uint256 tokens)` to seed the pool the first time.

### 🏗️ Implementing reserves + `init()`

- Add `totalLiquidity` and the `liquidity` mapping.
- Define these custom errors in `DEX.sol`:
  - `DexAlreadyInitialized()`
  - `TokenTransferFailed()`
- `init(tokens)` should only work once (when `totalLiquidity == 0`). Revert if it is already initialized.
- It should set `totalLiquidity` to the ETH balance of the contract (after receiving `msg.value`).
- It should assign all initial liquidity to the initializer.
- It should pull `tokens` from the initializer using `transferFrom` (requires ERC20 `approve` first).

🧪 Also implement `getLiquidity(address lp)` since the frontend and tests use it.

<details markdown='1'>
<summary>🔎 Hint</summary>

🔑 Before `init()` can pull tokens from a user, the user must call `approve(spender, amount)` on the Balloons contract.

ℹ️ Also good to know:

- ETH sent with the tx arrives in the contract before your function body runs, so `address(this).balance` already includes `msg.value` inside `init()`.

<details markdown='1'>
<summary>🎯 Solution</summary>

```solidity
/////////////////
/// Errors //////
/////////////////

error DexAlreadyInitialized();
error TokenTransferFailed();

//////////////////////
/// State Variables //
//////////////////////
// ...
uint256 public totalLiquidity;
mapping(address => uint256) public liquidity;
// ...

function init(uint256 tokens) public payable returns (uint256 initialLiquidity) {
    // Pool can only be initialized once.
    if (totalLiquidity != 0) revert DexAlreadyInitialized();

    // ETH arrives before function execution, so balance includes msg.value here.
    initialLiquidity = address(this).balance;
    totalLiquidity = initialLiquidity;
    liquidity[msg.sender] = initialLiquidity;

    if (!token.transferFrom(msg.sender, address(this), tokens)) revert TokenTransferFailed();
    return initialLiquidity;
}
// ...
function getLiquidity(address lp) public view returns (uint256 lpLiquidity) {
    return liquidity[lp];
}
```

</details>
</details>

### 🧪 Try it out

🧩 Go uncomment the line in `packages/hardhat/deploy/00_deploy_dex.ts` that sends 10 BAL to your frontend address (and make sure you paste in your actual frontend address).

🔁 Now redeploy (`yarn deploy --reset`) and visit `http://localhost:3000/dex` and use the `Balloons` contract to call `approve()` with:
  - spender = DEX address
  - amount = some $BAL (e.g. 5)
![balloons-dex-tab](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/710f5c9a-d898-4012-9014-4c46f1de015f)

🤝 Get over 5 ETH from the faucet and then go to the DEX contract in the Debug tab (`http://localhost:3000/debug`) and call `init()` with equal amounts of ETH and $BAL:
  - tokens = 5 (* 10**18)
  - payable value = 5 (* 10**18)
![multiply-wei](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/531cab0b-2b37-4489-88c3-d36c0755d2d1)

✅ Go back to the DEX tab `http://localhost:3000/dex` and verify:
  - the DEX shows ETH + $BAL reserves
  - your liquidity value (`💦💦`) is non-zero
![CheckLiquAndBalance](https://github.com/user-attachments/assets/a8b14fc4-3626-420a-9b99-a8dc5c67fe6e)

### 🧪 Testing your progress

▶️ Run:

```shell
yarn test --grep "Checkpoint2"
```

---

## Checkpoint 3: 🤑 price()

📈 Now that our contract holds reserves of both ETH and BAL tokens, we want to use a simple formula to determine the exchange rate between the two.

✨ This is where we will begin to understand the magic of AMMs. It utilizes the constant product formula credited to Martin Koppelmann and mentioned by Vitalik in [this article](https://ipfs.io/ipfs/bafybeidtudmi6qajjcsfwnieepuuu6buz2lo7gip3no2iugut6f75vjmd4/general/2017/06/22/marketmakers.html) which was later adopted by [Uniswap](https://app.uniswap.org/).

🧮 Here is the formula:

```
x * y = k
``` 

📦 where `x` and `y` are the reserves, so:

```
(amount of ETH in DEX ) * ( amount of tokens in DEX ) = k
```

🧷 The `k` is called an invariant because it **doesn't change** during trades. (The `k` only changes as liquidity is added.) If we plot this formula, we'll get a curve that looks something like:

![image](https://user-images.githubusercontent.com/12072395/205343533-7e3a2cfe-8329-42af-a35d-6352a12bf61e.png)

> 💡 We are just swapping one asset for another, the “price” is basically how much of the resulting output asset you will get if you put in a certain amount of the input asset.

🤯 This is the unlock! A market based on a curve like this will **always have liquidity**, but keep in mind, as the ratio becomes further unbalanced, you will get less and less of the less-liquid asset from the same trade amount. Again, if the smart contract has too much ETH and not enough $BAL tokens, the price to swap $BAL tokens to ETH should be more desirable.

🔄 When we call `init()` we passed in ETH and $BAL tokens at a ratio of 1:1. As the reserves of one asset changes, the other asset must also change inversely in order to maintain the constant product formula (invariant `k`).

### 🛠️ Implementing the `price()` function

🛠️ Now, we will edit the `DEX.sol` smart contract and fill out the price function!

🧠 The price function should take in the reserves of `xReserves`, `yReserves`, and `xInput` to calculate the `yOutput`.

> Don't forget about trading fees! These fees are important to incentivize liquidity providers. Let's make the trading fee 0.3% and remember that there are no floats or decimals in Solidity, only whole numbers!

We should apply the fee to `xInput`, and store it in a new variable `xInputWithFee`. We want the input value to pay the fee immediately, or else we will accidentally tax our `yOutput` or our DEX's supply `k` 😨 Think about how to apply a 0.3% to our `xInput`.

> Tip: Because there are no decimals in Solidity you can achieve the same outcome by multiplying the input by **997** (99.7% since we are deducting the 0.3% fee) and then dividing the result by **1000**.

✅ Your `price(xInput, xReserves, yReserves)` function should return the output amount of the y-asset.

<details markdown='1'>
<summary>🔎 Hint</summary>

🧮 The standard Uniswap-style formula with fee looks like this:

- `xInputWithFee = xInput * 997`
- `numerator = xInputWithFee * yReserves`
- `denominator = (xReserves * 1000) + xInputWithFee`
- `yOutput = numerator / denominator`

<details markdown='1'>
<summary>🎯 Solution</summary>

```solidity
function price(uint256 xInput, uint256 xReserves, uint256 yReserves) public pure returns (uint256 yOutput) {
    uint256 xInputWithFee = xInput * 997;
    uint256 numerator = xInputWithFee * yReserves;
    uint256 denominator = (xReserves * 1000) + xInputWithFee;
    return numerator / denominator;
}
```

</details>
</details>

### 🧪 Try it out

🧩 Uncomment the last part of `packages/hardhat/deploy/00_deploy_dex.ts` so that you don't have to add the liquidity manually.

🔁 Now redeploy and go to `http://localhost:3000/dex` and type values into the swap inputs. The curve preview should move and show output estimates (including the 0.3% fee).

Let's say we have 1 million ETH and 1 million tokens, if we put this into our price formula and ask it the price of 1000 ETH it will be an almost 1:1 ratio. Try it in the Debug tab:

![price-example-1](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/e2d725cc-91f3-454d-902f-b39e4b51f5e2)

If we put in 1000 ETH, we will receive 996 tokens. If we're paying a 0.3% fee, it should be 997 if everything was perfect. BUT, there is a tiny bit of slippage as our contract moves away from the original ratio. Let's dig in more to really understand what is going on here.
Let's say there is 5 million ETH and only 1 million tokens. Then, we want to put 1000 tokens in. That means we should receive about 5000 ETH:

![price-example-2](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/349db3d8-e39e-4c94-8026-e01da2cefb8e)

Finally, let's say the ratio is the same, but we want to swap 100,000 tokens instead of just 1000. We'll notice that the amount of slippage is much bigger. Instead of 498,000 back, we will only get 453,305 because we are making such a big dent in the reserves.

![price-example-3](https://github.com/scaffold-eth/se-2-challenges/assets/55535804/f479d7cd-0e04-4aa7-aa52-cef30d747af3)

❗️ The contract automatically adjusts the price as the ratio of reserves shifts away from the equilibrium. It's called an 🤖 _Automated Market Maker (AMM)._

### 🧪 Testing your progress

▶️ Run:

```shell
yarn test --grep "Checkpoint3"
```

---

## Checkpoint 4: 🤝 Swapping

🛠️ Now implement the swap functions:

- `ethToToken()` swaps **ETH → $BAL**
- `tokenToEth(tokenInput)` swaps **$BAL → ETH**

🧠 Key idea: you must compute reserves from the contract **before** applying the input amount in the swap.

### 🏗️ Implementing `ethToToken()` + `tokenToEth()`

🧾 Define these events in `DEX.sol`:

```solidity
event EthToTokenSwap(address swapper, uint256 tokenOutput, uint256 ethInput);
event TokenToEthSwap(address swapper, uint256 tokensInput, uint256 ethOutput);
```

🚫 Start by defining these custom errors in `DEX.sol`:

```solidity
error TokenTransferFailed(); // Should already exist
error InvalidEthAmount();
error InvalidTokenAmount();
error InsufficientTokenBalance(uint256 available, uint256 required);
error InsufficientTokenAllowance(uint256 available, uint256 required);
error EthTransferFailed(address to, uint256 amount);
```

✍️ Now write the `ethToToken()` and `tokenToEth()` using those events and errors as nudges in the right direction. See if you can figure it all out without the hint!

<details markdown='1'>
<summary>🔎 Hint</summary>

💡 For `ethToToken()` the contract's ETH balance already includes `msg.value`, so the ETH reserve **before** the swap is:

- `ethReserve = address(this).balance - msg.value`

💡 For `tokenToEth(tokenInput)`, you need an allowance check and should send ETH with `call`:

- `(bool sent,) = msg.sender.call{value: ethOutput}("");`

📣 Don't forget to emit the swap events.

<details markdown='1'>
<summary>🎯 Solution</summary>

```solidity
function ethToToken() public payable returns (uint256 tokenOutput) {
    if (msg.value == 0) revert InvalidEthAmount();
    uint256 ethReserve = address(this).balance - msg.value;
    uint256 tokenReserve = token.balanceOf(address(this));
    tokenOutput = price(msg.value, ethReserve, tokenReserve);

    if (!token.transfer(msg.sender, tokenOutput)) revert TokenTransferFailed();
    emit EthToTokenSwap(msg.sender, tokenOutput, msg.value);
    return tokenOutput;
}

function tokenToEth(uint256 tokenInput) public returns (uint256 ethOutput) {
    if (tokenInput == 0) revert InvalidTokenAmount();
    uint256 bal = token.balanceOf(msg.sender);
    if (bal < tokenInput) revert InsufficientTokenBalance(bal, tokenInput);
    uint256 allow = token.allowance(msg.sender, address(this));
    if (allow < tokenInput) revert InsufficientTokenAllowance(allow, tokenInput);
    uint256 tokenReserve = token.balanceOf(address(this));
    ethOutput = price(tokenInput, tokenReserve, address(this).balance);
    if (!token.transferFrom(msg.sender, address(this), tokenInput)) revert TokenTransferFailed();
    (bool sent, ) = msg.sender.call{ value: ethOutput }("");
    if (!sent) revert EthTransferFailed(msg.sender, ethOutput);
    emit TokenToEthSwap(msg.sender, tokenInput, ethOutput);
    return ethOutput;
}
```

</details>
</details>

### 🧪 Try it out

🌐 Go to `http://localhost:3000/dex` and try:

- `ethToToken`: enter some ETH and click Send
- `tokenToETH`: approve the DEX in the Balloons section first, then swap tokens back to ETH
- Check the Events tab to make sure the swap events are showing up as expected

🎉 Now you can actually swap back and forth between tokens and ETH. This is amazing! With minimal infrastructure you can make it possible for people to move in and out of any set of tokens using this simple `x * y = k` formula!

### 🧪 Testing your progress

▶️ Run:

```shell
yarn test --grep "Checkpoint4"
```

---

## Checkpoint 5: 🌊 Liquidity

🧩 So far, only the `init()` function controls liquidity. To make this more decentralized, lets add make it so anyone can add to the liquidity pool by sending the DEX both ETH and tokens at the correct ratio.

🧠 The important part is letting anyone add liquidity and allowing them to later remove liquidity while keeping the pool ratio consistent.

- `deposit()` takes ETH (`msg.value`) and pulls the right amount of $BAL from the depositor, minting LPTs to the sender in the right proportion
- `withdraw(amount)` burns LPTs and returns ETH + $BAL proportional to pool reserves

### 🏗️ Implementing `deposit()` + `withdraw()`

🧾 First define these events in `DEX.sol`:

```solidity
event LiquidityProvided(address liquidityProvider, uint256 liquidityMinted, uint256 ethInput, uint256 tokensInput);
event LiquidityRemoved(address liquidityRemover, uint256 liquidityWithdrawn, uint256 tokensOutput, uint256 ethOutput);
```

🚫 And then add this custom error:

```solidity
error InsufficientLiquidity(uint256 available, uint256 required);
```

✍️ Now go write the logic for the `deposit()` and `withdraw()` functions.

🧠 Make sure you check that they have enough BAL tokens approved (and in their balance) to provide liquity to both sides so that `x * y = k` stays true even though `k` is moving this time.

🧮 On the deposit side, when finding out how many BAL tokens to add, make sure you add an additional wei to the result.

> Solidity does **integer division**, which always rounds **down**. That means `msg.value * tokenReserve / ethReserve` can be ever-so-slightly smaller than the “true” proportional amount (because the fractional remainder is discarded). If we used the rounded-down value, the LP would deposit a tiny bit too little $BAL for the ETH they're adding, nudging the pool ratio and potentially failing later checks that assume the pool stays properly collateralized. Adding `+ 1` is a cheap way to effectively “round up” by the minimum unit, keeping deposits safely on the conservative side (at the cost of at most 1 wei of token).

Don't forget to add the new liquidity (represented by the 💦 token) to the users balance AND the total liquidity (effectively, this is `k`).

<details markdown='1'>
<summary>🔎 Hint</summary>

💡 For `deposit()` you can derive the token deposit required from the existing reserves:

- `tokenDeposit = (msg.value * tokenReserve / ethReserve) + 1`

🧾 And the liquidity minted:

- `liquidityMinted = msg.value * totalLiquidity / ethReserve`

<details markdown='1'>
<summary>🎯 Solution</summary>

```solidity
    function deposit() public payable returns (uint256 tokensDeposited) {
        if (msg.value == 0) revert InvalidEthAmount();
        uint256 ethReserve = address(this).balance - msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));

        uint256 tokenDeposit = (msg.value * tokenReserve / ethReserve) + 1;

        uint256 bal = token.balanceOf(msg.sender);
        if (bal < tokenDeposit) revert InsufficientTokenBalance(bal, tokenDeposit);
        uint256 allow = token.allowance(msg.sender, address(this));
        if (allow < tokenDeposit) revert InsufficientTokenAllowance(allow, tokenDeposit);

        uint256 liquidityMinted = msg.value * totalLiquidity / ethReserve;
        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;

        if (!token.transferFrom(msg.sender, address(this), tokenDeposit)) revert TokenTransferFailed();
        emit LiquidityProvided(msg.sender, liquidityMinted, msg.value, tokenDeposit);
        return tokenDeposit;
    }

function withdraw(uint256 amount) public returns (uint256 ethAmount, uint256 tokenAmount) {
    uint256 availableLp = liquidity[msg.sender];
    if (availableLp < amount) revert InsufficientLiquidity(availableLp, amount);
        uint256 ethReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));

    uint256 ethWithdrawn = amount * ethReserve / totalLiquidity;
    uint256 tokensWithdrawn = amount * tokenReserve / totalLiquidity;

        liquidity[msg.sender] -= amount;
        totalLiquidity -= amount;

        (bool sent, ) = payable(msg.sender).call{ value: ethWithdrawn }("");
    if (!sent) revert EthTransferFailed(msg.sender, ethWithdrawn);
    if (!token.transfer(msg.sender, tokensWithdrawn)) revert TokenTransferFailed();

    emit LiquidityRemoved(msg.sender, amount, tokensWithdrawn, ethWithdrawn);
    return (ethWithdrawn, tokensWithdrawn);
}
```

 </details>
 </details>

### 🧪 Try it out

🔁 Redeploy, then go to `http://localhost:3000/dex` and try:

- Approve the DEX to spend your $BAL
- Deposit some ETH (and observe that it also pulls tokens)
- Withdraw some liquidity and verify you receive both ETH and $BAL back
- Check the Events tab to make sure the events are showing up as expected

### 🧪 Testing your progress

▶️ Run:

```shell
yarn test --grep "Checkpoint5"
```

---

## Checkpoint 6: 💾 Deploy your contracts! 🛰

📡 Edit the `defaultNetwork` in `hardhat.config.ts` to match the name of one of testnets from the `networks` object. We recommend to use `"sepolia"` or `"optimismSepolia"`

🔐 You will need to generate a **deployer address** using `yarn generate` This creates a mnemonic and saves it locally.

👩‍🚀 Use `yarn account` to view your deployer account balances.

⛽️ You will need to send ETH to your deployer address with your wallet, or get it from a public faucet of your chosen network. You can also request ETH by sending a message with your new deployer address and preferred network in the [challenge Telegram](https://t.me/+_NeUIJ664Tc1MzIx). People are usually more than willing to share.

🚀 Run `yarn deploy` to deploy your smart contract to a public network (selected in `hardhat.config.ts`)

> 💬 Hint: Instead of editing `hardhat.config.ts` you can just add a network flag to the deploy command like this: `yarn deploy --network sepolia` or `yarn deploy --network optimismSepolia`

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

#### ⚙️ Configuration of Third-Party Services for Production-Grade Apps.

By default, 🏗 Scaffold-ETH 2 provides predefined API keys for popular services such as Alchemy and Etherscan. This allows you to begin developing and testing your applications more easily, avoiding the need to register for these services.
This is great to complete your **Speedrun Ethereum**.

For production-grade applications, it's recommended to obtain your own API keys (to prevent rate limiting issues). You can configure these at:

- 🔷`ALCHEMY_API_KEY` variable in `packages/hardhat/.env` and `packages/nextjs/.env.local`. You can create API keys from the [Alchemy dashboard](https://dashboard.alchemy.com/).
- 📃`ETHERSCAN_API_KEY` variable in `packages/hardhat/.env` with your generated API key. You can get your key [here](https://etherscan.io/myapikey).
> 💬 Hint: It's recommended to store env's for nextjs in Vercel/system env config for live apps and use .env.local for local testing.

---

## Checkpoint 8: 📜 Contract Verification

Run the `yarn verify --network your_network` command to verify your contracts on etherscan 🛰

👀 You may see an address for both YourToken and Vendor. You will want the Vendor address.

👉 Search this address on [Sepolia Etherscan](https://sepolia.etherscan.io/) (or [Optimism Sepolia Etherscan](https://sepolia-optimism.etherscan.io/) if you deployed to OP Sepolia) to get the URL you submit to 🏃‍♀️[SpeedrunEthereum.com](https://speedrunethereum.com).

## Checkpoint 10: Deeper Understanding and Next Steps

🎉 So you have built a functioning DEX. What an accomplishment! Now you have great context to begin to understand different DEX designs. Go research the latest DEX designs and their improvements.

🧩 Something you will run into quickly are some limitations that your own DEX has.

📖 Because the swap functions don't promise a certain amount of "out" tokens anyone who sees your transaction in the mempool can send a transaction in front of you (e.g. with a higher gas price) and move the liquidity down the curve so that you get fewer tokens. Then immediately after your transaction executes they can have another transaction lined up to swap the tokens back in the other direction. The outcome is that they walk away with the "slippage", the difference between the amount of tokens you were quoted originally and how many you actually ended up with in the end.
> Side note: This is called a sandwich attack and is a popular form of MEV (Look it up!).

💡 The solution is obvious: Just revert the function if the quote price != the amount of "out" tokens. This would work to protect you from sandwich attacks but it introduces another problem...

🤼 Two honest people want to make a swap. The amounts don't matter and the direction doesn't matter. They get their quotes and execute it at nearly the same time (both transactions will be included in the same block). But wait, if one of them swaps then the liquidity will have changed when the second person's swap is attempted, causing it to revert because the "out" tokens would differ from the quote they received. Only one person can execute a swap in a single block. What a huge bottleneck!

🎯 A fuller solution is to allow *some* "slippage" in the swap. This way your transaction will execute as long as the execution price is within a certain percent of the quote price. This way you know that you will receive *at least* X amount of tokens with each swap you do and others can still swap in either direction before and after you in the same block. Bingo!

---

> 🏃 Head to your next challenge [here](https://speedrunethereum.com).
> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
