export const skipQuickStart = true;
// CHALLENGE-TODO: Update the readme to reflect your challenge. In the very end you will need a non-template
// README.md file in the extension root so it is recommended to copy the template in a markdown file and then
// update extraContents after confirming the template is correct.
export const extraContents = `# 💳🌽 Over-Collateralized Lending

![readme-lending](https://raw.githubusercontent.com/scaffold-eth/se-2-challenges/over-collateralized-lending/extension/packages/nextjs/public/hero.png)

❓ How does lending work onchain? First, traditional lending usually involves one party (such as banks) offering up money and another party agreeing to pay interest over-time in order to use that money. The only way this works is because the lending party has some way to hold the borrower accountable. This requires some way to identify the borrower and a legal structure that will help settle things if the borrower decides to stop making interest payments. In the onchain world we don't have a reliable identification system *(yet)* so all lending is "over-collateralized". Borrowers must lock up collateral in order to take out a loan. "Over-collateralized" means you can never borrow more value than you have supplied. I am sure you are wondering, "What is the benefit of a loan if you can't take out more than you put in?" Great question! This form of lending lacks the common use case seen in traditional lending where people may use the loan to buy a house they otherwise couldn't afford but here are a few primary use cases of permissionless lending in DeFi:

- Maintaining Price Exposure ~ You may have real world bills due but you are *sure* that ETH is going up in value from here and it would kill you to sell to pay your bills. You could get a loan against your ETH in a stablecoin and pay your bills. You would still have ETH locked up to come back to and all you would have to do is pay back the stablecoin loan.
- Leverage ~ You could deposit ETH and borrow a stablecoin but only use it to buy more ETH, increasing your exposure to the ETH price movements (to the upside 🎢 or the downside 🔻😰).
- Tax Advantages ~ In many jurisdictions, money obtained from a loan is taxed differently than money obtained other ways. It might be advantageous to avoid outright selling of an asset and instead get a loan against it.

👍 Now that you know the background of what is and is not possible with onchain lending, let's dive in to the challenge!

💬 The Lending contract accepts ETH deposits and allows depositor's to take out a loan in CORN 🌽. The contract tracks each depositor's address and only allows them to borrow as long as they maintain at least 120% of the loans value in ETH. If the collateral falls in value or if CORN goes up in value then the borrower's position may be liquidatable by anyone who pays back the loan. The liquidator has an incentive to do this because they collect a 10% fee on top of the value of the loan. 

📈 The Lending contract naively uses the price returned by a CORN/ETH DEX contract. This makes it easy for you to change the price of CORN by "moving the market" with large swaps. Shout out to the [DEX challenge](https://github.com/scaffold-eth/se-2-challenges/blob/challenge-4-dex/README.md)! Using a DEX as the sole price oracle would never work in a production grade system but it will help to demonstrate the different market conditions that affect a lending protocol.

🌟 The final deliverable is an app that allows anyone to take out a loan in CORN while making sure it is always backed by it's value in ETH.
Deploy your contracts to a testnet then build and upload your app to a public web server. Submit the url on [SpeedRunEthereum.com](https://speedrunethereum.com)!

💬 Meet other builders working on this challenge and get help in the [Over-Collateralized Lending Challenge Telegram Group](https://t.me/+xQr5d-oVhLMwZmUx)

---

## Checkpoint 0: 📦 Environment 📚

Before you begin, you need to install the following tools:

- [Node (v18 LTS)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then download the challenge to your computer and install dependencies by running:

\`\`\`sh
npx create-eth@0.1.0 -e over-collateralized-lending over-collateralized-lending
cd over-collateralized-lending
\`\`\`

> in the same terminal, start your local network (a blockchain emulator in your computer):

\`\`\`sh
yarn chain
\`\`\`

> in a second terminal window, 🛰 deploy your contract (locally):

\`\`\`sh
cd over-collateralized-lending
yarn deploy
\`\`\`

> in a third terminal window, start your 📱 frontend:

\`\`\`sh
cd over-collateralized-lending
yarn start
\`\`\`

📱 Open http://localhost:3000 to see the app.

> 👩‍💻 Restart \`yarn chain\` and then run \`yarn deploy\` whenever you want to deploy new or updated contracts to your local network. If you haven't made any contract changes, you can run \`yarn deploy --reset\` for a completely fresh deploy.

---

## Checkpoint 1: 💳🌽 Lending Contract

Navigate to the \`Debug Contracts\` tab, you should see four smart contracts displayed called \`Corn\`, \`CornDEX\`, \`Lending\` and \`MovePrice\`. You don't need to worry about any of these except \`Lending\` but here is a quick description of each:
    - Corn ~ This is the ERC20 token that can be borrowed
    - CornDEX ~ This is the DEX contract that is used to swap between ETH and CORN but is also used as a makeshift price oracle
    - Lending ~ This is the contract that facilitates collateral depositing, loan creation and liquidation of loans in bad positions
    - MovePrice ~ This contract is only used for making large swaps in the DEX to change the asset ratio, changing the price reported by the DEX

\`packages/hardhat/contracts/Lending.sol\` Is where you will spend most of your time.

> Below is what your front-end will look like with no implementation code within your smart contracts yet. The buttons will likely break because there are no functions tied to them yet!

![DefaultView](https://github.com/user-attachments/assets/58feae80-dbcb-49db-9d7d-4a4bf9cc7766)

> Check out the empty functions in \`Lending.sol\` to see aspects of each function. If you can explain how each function will work with one another, that's great! 😎

---

### 🥅 Goals

- [ ] Review all the \`Lending.sol\` functions and envision how they might work together.

---

## Checkpoint 2: ➕ Adding and Removing Collateral

👀 Let's take a look at the \`addCollateral\` function inside \`Lending.sol\`. 

It should revert with \`Lending_InvalidAmount()\` if somebody calls it without value.

It needs to record any value that gets sent to it as being collateral posted by the sender into an existing mapping called \`s_userCollateral\`.

Let's also emit the \`CollateralAdded\` event with depositor address, amount they deposited and the \`i_cornDEX.currentPrice()\` which is the current value of ETH in CORN.
> ⚠️ We are emitting the price returned by the DEX in every event solely for the front end to be able to visualize things properly.

<details markdown='1'><summary>🔎 Hint</summary>

> This method is pretty straight forward, try to solve it by following the description and when you think you have it compare to the solution below.

<details markdown='1'><summary>Solution Code</summary>

\`\`\`solidity
    function addCollateral() public payable {
        if (msg.value == 0) {
            revert Lending__InvalidAmount(); // Revert if no collateral is sent
        }
        s_userCollateral[msg.sender] += msg.value; // Update user's collateral balance
        emit CollateralAdded(msg.sender, msg.value, i_cornDEX.currentPrice()); // Emit event for collateral addition
    }
\`\`\`

</details>
</details>

Very good! Now let's look at the \`withdrawCollateral\` function. Don't want to send funds in if they can't be retrieved, now do we?!

Let's revert with \`Lending_InvalidAmount()\` right at the start if someone attempts to use the function with the \`amount\` parameter set to 0. We also want to revert if the sender doesn't have the \`amount\` of collateral they are requesting.

Now let's reduce the sender's collateral (in the mapping) and send it back to their address.

Emit \`CollateralWithdrawn\` with the sender's address, the amount they withdrew and the \`currentPrice\` from the DEX.

<details markdown='1'><summary>🔎 Hint</summary>

> This method is also very straight forward, try to solve it by following the description and when you think you have it compare to the solution below.

<details markdown='1'><summary>Solution Code</summary>

\`\`\`solidity
    function withdrawCollateral(uint256 amount) public {
        if (amount == 0 || s_userCollateral[msg.sender] < amount) {
            revert Lending__InvalidAmount(); // Revert if the amount is invalid
        }

        // Reduce the user's collateral
        uint256 newCollateral = s_userCollateral[msg.sender] - amount;
        s_userCollateral[msg.sender] = newCollateral;

        // Transfer the collateral to the user
        payable(msg.sender).transfer(amount);

        emit CollateralWithdrawn(msg.sender, amount, i_cornDEX.currentPrice()); // Emit event for collateral withdrawal
    }
\`\`\`

</details>
</details>

Excellent! Re-deploy your contract with \`yarn deploy\` but first shut down and restart \`yarn chain\`. We want to do a fresh deploy of all the contracts so that they each have correct constructor parameters. Now try out your methods from the front end and see if you need to make any changes.

Don't forget to give yourself some ETH from the faucet!

![faucet](https://github.com/user-attachments/assets/e8b8ac20-19fa-45d4-bc5a-8049ac04487e)

---

### 🥅 Goals

- [ ] Can you add collateral and withdraw collateral?
- [ ] Does the front end update when you do each action?

---

## Checkpoint 3: 🫶 Helper Methods

Now we need to add four methods that we will use in other functions to get various details about a user's debt position.

Let's start with \`calculateCollateralValue\`. This function receives the address of the user in question and returns a uint256 representing the ETH collateral, priced in CORN.

We know how to get the user's collateral and we know the price in CORN is returned by \`i_cornDEX.currentPrice()\`. Can you figure out how to return the collateral value in CORN?

<details markdown='1'><summary>🔎 Hint</summary>

> This method just needs to return the users collateral multiplied by the price of CORN (\`i_cornDEX.currentPrice()\`) *divided by 1e18* (since that is how many decimals CORN has).

<details markdown='1'><summary>Solution Code</summary>

\`\`\`solidity
    function calculateCollateralValue(address user) public view returns (uint256) {
        uint256 collateralAmount = s_userCollateral[user]; // Get user's collateral amount
        return (collateralAmount * i_cornDEX.currentPrice()) / 1e18; // Calculate collateral value in CORN
    }
\`\`\`

</details>
</details>

Let's turn our attention to the internal \`_calculatePositionRatio\` view function.

This function takes a user address and returns what we are calling the "position ratio". This is the percentage of collateral to borrowed assets with a caveat, it is returned as the percentage * 1e18. In other words, if the collateral ratio percent is 133 then the returned value would be 133000000000000000000. We do this to enable a higher amount of precision. Try to figure out the math on your own.

<details markdown='1'><summary>🔎 Hint</summary>

> It needs to return the value of the collateral (in CORN) divided by the amount borrowed.

<details markdown='1'><summary>Solution Code</summary>

\`\`\`solidity
    function _calculatePositionRatio(address user) internal view returns (uint256) {
        uint borrowedAmount = s_userBorrowed[user]; // Get user's borrowed amount
        uint collateralValue = calculateCollateralValue(user); // Calculate user's collateral value
        if (borrowedAmount == 0) return type(uint256).max; // Return max if no corn is borrowed
        return (collateralValue * 1e18) / borrowedAmount; // Calculate position ratio
    }
\`\`\`

</details>
</details>

Last helper function! Now we will fill in the details on \`isLiquidatable\`. This function should return a bool indicating if the position ratio is less than \`COLLATERAL_RATIO\`. See if you can implement the logic without the hint.

<details markdown='1'><summary>🔎 Hint</summary>

> We can use the \`_calculatePositionRatio\` function we just made to get the current ratio. Then just a simple comparison between that and the COLLATERAL_RATIO to make sure we aren't below the acceptable liquidatable threshold.

<details markdown='1'><summary>Solution Code</summary>

\`\`\`solidity
    function isLiquidatable(address user) public view returns (bool) {
        uint256 positionRatio = _calculatePositionRatio(user); // Calculate user's position ratio
        return (positionRatio * 100) < COLLATERAL_RATIO * 1e18; // Check if position is unsafe
    }
\`\`\`

</details>
</details>

Lastly let's fill in a simple function called \`_validatePosition\`. This function has one use case: revert with \`Lending_UnsafePositionRatio\` if the user's position is liquidatable (\`isLiquidatable\` returns exactly what we need). We can then use this function any place where we need to verify the user's ratio position hasn't been changed to a liquidatable state after changing the user's state.

---

### 🥅 Goals

- [ ] Do you understand why we need to multiply/divide everything by 1e18? (Search term: Solidity precision loss)
- [ ] Glance around the other methods and try to predict where we may use these methods

---

## Checkpoint 4: 🌽 Let's Borrow Some CORN!

👀 Go to the \`borrowCorn\` function. 

It should revert with \`Lending_InvalidAmount()\` if somebody calls it without a \`borrowAmount\`.

It should add the borrowed amount to the user's balance in the \`s_userBorrowed\` mapping.

It should validate the user's position (\`_validatePosition\`) so that it reverts if they are attempting to borrow more than they are allowed.

Then it should use the CORN token's \`mintTo\` function to mint the tokens to the user's address.
 > ⚠️ This is an oversimplification on our part. A real lending contract would not be minting the asset that is being borrowed in most cases. This way we only have to deal with one side of the market so it makes it easier to understand.

You should also emit the \`AssetBorrowed\` event.

Perfect! Now let's go fill out the \`repayCorn\` function.

Revert with \`Lending_InvalidAmount\` if the repayAmount is 0 or if it is more than the user has borrowed.

Subtract the amount from the \`s_userBorrowed\` mapping. Then use the CORN token's \`burnFrom\` function to remove the CORN from the borrower's wallet.

And finally, emit the \`AssetRepaid\` event.

Restart \`yarn chain\` and then \`yarn deploy\` so you can play with borrowing and repaying on the front end.

<details><summary>Solution Code</summary>

\`\`\`solidity
    function borrowCorn(uint256 borrowAmount) public {
        if (borrowAmount == 0) {
            revert Lending__InvalidAmount(); // Revert if borrow amount is zero
        }
        s_userBorrowed[msg.sender] += borrowAmount; // Update user's borrowed corn balance
        _validatePosition(msg.sender); // Validate user's position before borrowing
        bool success = i_corn.mintTo(msg.sender, borrowAmount); // Borrow corn to user
        if (!success) {
            revert Lending__BorrowingFailed(); // Revert if borrowing fails
        }
        emit AssetBorrowed(msg.sender, borrowAmount, i_cornDEX.currentPrice()); // Emit event for borrowing
    }

    function repayCorn(uint256 repayAmount) public {
        if (repayAmount == 0 || repayAmount > s_userBorrowed[msg.sender]) {
            revert Lending__InvalidAmount(); // Revert if repay amount is invalid
        }
        s_userBorrowed[msg.sender] -= repayAmount; // Reduce user's borrowed balance
        bool success = i_corn.burnFrom(msg.sender, repayAmount); // Burn corns from user
        if (!success) {
            revert Lending__RepayingFailed(); // Revert if burning fails
        }
        emit AssetRepaid(msg.sender, repayAmount, i_cornDEX.currentPrice()); // Emit event for repaying
    }
\`\`\`

</details>

---

### 🥅 Goals

- [ ] Can you borrow and repay CORN?
- [ ] What happens if you repay without having enough tokens to repay? Have you handled that well? (\`Lending__RepayingFailed\` might be nice to throw...)
- [ ] Can you borrow more than 120% of your collateral value? It should revert if you attempt this...

---

## Checkpoint 5: 📉 Liquidation Mechanism

So we have a way to deposit collateral and borrow against it. Great! But what happens if the price of CORN goes up and the liquidation threshold is surpassed?

We need a liquidation mechanism!

Let's go to the \`liquidate\` function. We want anyone to be able to call this when a position is liquidatable. The caller must have enough CORN to repay the debt. This function should remove the borrower's debt AND the amount of collateral that is needed to cover the debt.

First let's make sure to revert if the user's position is not liquidatable with \`Lending__NotLiquidatable\`.

Let's transfer the CORN to this contract from the liquidator and then burn it. (\`transferFrom\` and \`burnFrom\`).

Clear the borrower's debt completely.

Calculate the amount of collateral needed to cover the cost of the burned CORN and remove it from the borrower's collateral.
> Keep in mind, It's not enough to simply have a liquidation mechanism. We need an incentive for people to trigger it!

> ⚠️ We have simplified things by not adding any APY incentives (and inversely borrowing fees). These are important incentives in real lending markets that help to keep the market balanced by encouraging people to supply collateral or as a borrower to repay a loan that is requiring a high APR because the collateral is not as safe or nearing the liquidation threshold. These fees are a great place to add logic that generates protocol revenue as well by taking a some of the borrowing APR and letting it accrue to the protocol's token, passing the rest along to the supplier. These incentives, along with the liquidation system, help to make sure there is always more value in collateral than value being borrowed.

**So** add the \`LIQUIDATOR_REWARD\` as a percentage on top of the collateral (but never exceeding the borrower's total collateral) so that the liquidator has a nice incentive to want to liquidate that poor borrower.

Transfer that amount of collateral to the liquidator.

Finally emit the \`Liquidation\` event.

<details markdown='1'><summary>Solution Code</summary>

\`\`\`solidity
    function liquidate(address user) public {
        if (!isLiquidatable(user)) {
            revert Lending__NotLiquidatable(); // Revert if position is not liquidatable
        }

        uint256 userDebt = s_userBorrowed[user]; // Get user's borrowed amount
        uint256 userCollateral = s_userCollateral[user]; // Get user's collateral balance
        uint256 collateralValue = calculateCollateralValue(user); // Calculate user's collateral value

        // transfer value of debt to the contract
        i_corn.transferFrom(msg.sender, address(this), userDebt);

        // burn the transferred corn
        i_corn.burnFrom(address(this), userDebt);

        // Clear user's debt
        s_userBorrowed[user] = 0;

        // calculate collateral to purchase (maintain the ratio of debt to collateral value)
        uint256 collateralPurchased = (userDebt * userCollateral) / collateralValue;
        uint256 liquidatorReward = (collateralPurchased * LIQUIDATOR_REWARD) / 100;
        uint256 amountForLiquidator = collateralPurchased + liquidatorReward;
        amountForLiquidator = amountForLiquidator > userCollateral ? userCollateral : amountForLiquidator; // Ensure we don't exceed user's collateral

        s_userCollateral[user] = userCollateral - amountForLiquidator;

        // transfer 110% of the collateral needed to cover the debt to the liquidator
        (bool sent,) = payable(msg.sender).call{ value: amountForLiquidator }("");
        require(sent, "Failed to send Ether");

        emit Liquidation(user, msg.sender, amountForLiquidator, userDebt, i_cornDEX.currentPrice());
    }
\`\`\`

</details>

You know the drill. Restart \`yarn chain\` and then \`yarn deploy\` so you can try liquidating on the front end. It may be useful to open a private browser tab and go to \`localhost:3000\` so you can simulate multiple parties.

---

### 🥅 Goals

- [ ] As long as people follow the incentives, will the protocol ever go under 100% backed loans? Look into this situation that happened to [Aave](https://blockworks.co/news/aave-curve-exposure)
- [ ] What happens when a liquidator doesn't have enough CORN to repay the loan? Does it revert like it ought to?

---

## Checkpoint 6: Final Touches

Throwback to the \`withdrawCollateral\` function. What happens when a borrower withdraws collateral exceeding the safe position ratio? You should add a \`_validatePosition\` check to make sure that never happens. Skip the check if they don't have any borrowed CORN.

Great work! Your contract has all the necessary functionality to help people get CORN loans.

🍨 Now you get to see something real special. Restart \`yarn chain\` and then \`yarn deploy\` as you usually do. Then run \`yarn simulate\`. This command will spin up several bot accounts that start using your lending platform! Look at the front end and interact while they are running! You can check out \`packages/hardhat/scripts/marketSimulator.ts\` to adjust the default settings or change the logic on the bot accounts.

>👇 Keep on going and try to tackle these optional gigachad side quests. The front end doesn't have any special components for using these side quests but you can use the Debug Tab to use them

### ⚔️ Side Quest 1: Flash Loans

🤔 What if you could borrow any amount of CORN as long as it was paid back by the end of the transaction? That is exactly what a flash loan does! Flash loans are a new financial primitive that is only possible onchain.

Let's implement a fee free flash loan function!

Before we implement the logic we need to create a new interface called \`IFlashLoanRecipient\`. You can define it beneath the \`Lending\` contract but in the same file. It should have a function called \`executeOperation\` that receives the following parameters: \`uint256 amount, address initiator, address extraParam\` and returns a bool.

<details markdown='1'><summary>Interface Code</summary>

\`\`\`solidity
contract Lending is Ownable {
    // ...
    // Existing code
    // ...
}

// Place this beneath so we don't have to import from another file
interface IFlashLoanRecipient {
    function executeOperation(uint256 amount, address initiator, address extraParam) external returns (bool);
}
\`\`\`

</details>

There isn't any existing \`flashLoan\` function in \`Lending.sol\` but that is where we need one. Go ahead and define one that is public. It should receive the following parameters:
- \`IFlashLoanRecipient _recipient\` This is because the loan recipient must be a contract that adheres to the \`IFlashLoanRecipient\` interface -- Not your EOA. You will see why in a minute
- \`uint256 _amount\` The amount of CORN to send to the recipient contract
- \`address _extraParam\` In a real flash loan function this would probably be a struct with several optional properties allowing people to pass along any data to the recipient contract. See Aave's implementation [here](https://github.com/aave-dao/aave-v3-origin/blob/083bd38a137b42b5df04e22ad4c9e72454365d0d/src/contracts/protocol/libraries/logic/FlashLoanLogic.sol#L184) 

The logic inside the method needs to mint the amount of CORN that is given in the parameter to the recipient address - The IFlashLoanRecipient adhering contract.

Then it will call the \`executeOperation\` function on the recipient contract and make sure that it returns \`true\`.

Use the CORN token's \`burnFrom\` method to destroy the CORN that was minted at the beginning of this function. Burn it from \`address(this)\` since the recipient should have returned it. If they didn't this burn method will revert when we try to burn tokens that are not held by the lending contract. If it reverts then the CORN will have never been minted to the recipient - no risk of the tokens being stolen.

<details markdown='1'><summary>Solution Code</summary>

\`\`\`solidity
    function flashLoan(IFlashLoanRecipient _recipient, uint256 _amount, address _extraParam) public {
        // Send the loan to the recipient - No collateral is required since it gets repaid all in the same transaction
        i_corn.mintTo(address(_recipient), _amount);

        // Execute the operation - It should return the loan amount back to this contract
        bool success = _recipient.executeOperation(_amount, msg.sender, _extraParam);
        require(success, "Operation was unsuccessful");

        // Burn the loan - Should revert if it doesn't have enough
        i_corn.burnFrom(address(this), _amount);
    }
\`\`\`

</details>

Now we need to create a contract that is the recipient of the CORN. Let's create a contract that uses the \`flashLoan\` method to make it possible to liquidate loans without the liquidator needing to hold CORN tokens.

> ❕ Keep in mind, this is just one example of how we could use the \`flashLoan\` function. There are so many more things you can build with flash loans!

Create a new contract file and call it \`FlashLoanLiquidator.sol\`

See if you can figure out the correct logic to liquidate a loan inside a function called \`executeOperation\`. It will need to utilize the DEX to swap ETH for CORN in order to repay the CORN loan after liquidating the position and receiving the ETH. 
After liquidating the loan the contract should send any remaining ETH back to the original initiator of the \`flashLoan\` function.

Don't forget to let the contract \`receive()\` ether!

<details markdown='1'><summary>FlashLoanLiquidator Contract Code</summary>

Here is one example of how to accomplish this:

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Lending } from "./Lending.sol";
import { CornDEX } from "./CornDEX.sol";
import { Corn } from "./Corn.sol";

/**
 * @notice For Side quest only
 * @notice This contract is used to liquidate unsafe positions by using a flash loan to borrow CORN to liquidate the position
 * then swapping the returned ETH for CORN for repaying the flash loan
 */
contract FlashLoanLiquidator {
    Lending i_lending;
    CornDEX i_cornDEX;
    Corn i_corn;

    constructor(address _lending, address _cornDEX, address _corn) {
        i_lending = Lending(_lending);
        i_cornDEX = CornDEX(_cornDEX);
        i_corn = Corn(_corn);
    }

    function executeOperation(uint256 amount, address initiator, address toLiquidate) public returns (bool) {
        // Approve the lending contract to spend the tokens
        i_corn.approve(address(i_lending), amount);
        // First liquidate to get the collateral tokens
        i_lending.liquidate(toLiquidate);
        
        // Calculate required input amount of ETH to get exactly 'amount' of tokens
        uint256 ethReserves = address(i_cornDEX).balance;
        uint256 tokenReserves = i_corn.balanceOf(address(i_cornDEX));
        uint256 requiredETHInput = i_cornDEX.calculateXInput(amount, ethReserves, tokenReserves);
        
        // Execute the swap
        i_cornDEX.swap{value: requiredETHInput}(requiredETHInput); // Swap ETH for tokens
        // Send the tokens back to Lending to repay the flash loan
        i_corn.transfer(address(i_lending), i_corn.balanceOf(address(this)));
        // Send the ETH back to the initiator
        if (address(this).balance > 0) {
            (bool success, ) = payable(initiator).call{value: address(this).balance}("");
            require(success, "Failed to send ETH back to initiator");
        }

        return true;
    }

    receive() external payable {}
}

\`\`\`

</details>

Now you need to add your new contract to the deployment script. You can just add it beneath all the existing logic in \`packages/hardhat/deploy/00_deploy_contracts.ts\`.
<details markdown='1'><summary>Deployment Code</summary>

\`\`\`typescript
const deployContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {

    // All existing logic...

    await deploy("FlashLoanLiquidator", {
        from: deployer,
        args: [lending.address, cornDEX.target, cornToken.target],
        log: true,
        autoMine: true,
    });
}
\`\`\`

</details>

Restart \`yarn chain\` and deploy your contracts with \`yarn deploy\`.

Create a debt position that is close to the liquidation line and then increase the price of CORN until the position is liquidatable.

Then go to the Debug Tab and trigger the \`Lending.flashLoan\` method with your \`FlashLoanLiquidator\` contract address as the \`recipient\`, the amount of CORN needed to liquidate as the \`amount\` and the borrower's address as the \`extraParam\`.

Pretty cool, huh? You can liquidate any position without needing to have the CORN to pay back the loan!

### ⚔️ Side Quest 2: Maximum Leverage With A Recursive Borrow > Swap > Deposit Loop

🤔 What if you think the price of CORN is going down relative to ETH (*Why in the world would you think that!?* 🤣). You could borrow CORN but then use the DEX to buy more ETH with your CORN. But wait! Now you have more ETH you could technically use it as collateral *again* and then you could borrow more CORN and swap to ETH and repeat that as many times as possible.

You can already do this manually but what if we created a contract with some methods that make it easy?

Let's start by adding a couple helper methods to the \`Lending.sol\` contract.

First let's add a method called \`getMaxBorrowAmount\` that takes a uint256 representing the amount of ETH we have to deposit and returns the maximum amount of CORN we can expect to receive. See if you can figure it out without the solution below, then compare if you run into issues.

<details markdown='1'><summary>Solution Code</summary>

\`\`\`solidity
    function getMaxBorrowAmount(uint256 ethCollateralAmount) public view returns (uint256) {
        if (ethCollateralAmount == 0) return 0;
        
        // Calculate collateral value in CORN terms
        uint256 collateralValue = (ethCollateralAmount * i_cornDEX.currentPrice()) / 1e18;
        
        // Calculate max borrow amount while maintaining the required collateral ratio
        return (collateralValue * 100) / COLLATERAL_RATIO;
    }
\`\`\`

</details>

Now let's add a method that will help us when we go to unravel a position.

Create a function called \`getMaxWithdrawableCollateral\` that receives an address representing the user we want to query. It should return a uint256 representing the amount of ETH that the account has deposited as collateral that is OK to withdraw without putting the position into a liquidatable state. Try to figure it out yourself but feel free to peek at the solution below.

<details markdown='1'><summary>Solution Code</summary>

\`\`\`solidity
    function getMaxWithdrawableCollateral(address user) public view returns (uint256) {
        uint256 borrowedAmount = s_userBorrowed[user];
        uint256 userCollateral = s_userCollateral[user];
        if (borrowedAmount == 0) return userCollateral;

        uint256 maxBorrowedAmount = getMaxBorrowAmount(userCollateral);
        if (borrowedAmount == maxBorrowedAmount) return 0;

        uint256 potentialBorrowingAmount = maxBorrowedAmount - borrowedAmount;
        uint256 ethValueOfPotentialBorrowingAmount = (potentialBorrowingAmount * 1e18) / i_cornDEX.currentPrice();

        return (ethValueOfPotentialBorrowingAmount * COLLATERAL_RATIO) / 100;
    }
\`\`\`

</details>

Now let's create a new contract that will use those new view functions to "while loop" until we trigger a stop.

Create a new file in the contracts directory called \`Leverage.sol\` and copy the following code into it:

<details><summary>Solution Code</summary>

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Lending } from "./Lending.sol";
import { CornDEX } from "./CornDEX.sol";
import { Corn } from "./Corn.sol";

/**
 * @notice For Side quest only
 * @notice This contract is used to leverage a user's position by borrowing CORN from the Lending contract
 * then borrowing more CORN from the DEX to repay the initial borrow then repeating until the user has borrowed as much as they want
 */
contract Leverage {
    Lending i_lending;
    CornDEX i_cornDEX;
    Corn i_corn;
    address public owner;

    event LeveragedPositionOpened(address user, uint256 loops);
    event LeveragedPositionClosed(address user, uint256 loops);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    constructor(address _lending, address _cornDEX, address _corn) {
        i_lending = Lending(_lending);
        i_cornDEX = CornDEX(_cornDEX);
        i_corn = Corn(_corn);
        // Approve the DEX to spend the user's CORN
        i_corn.approve(address(i_cornDEX), type(uint256).max);
    }
    
    /**
     * @notice Claim ownership of the contract so that no one else can change your position or withdraw your funds
     */
    function claimOwnership() public {
        owner = msg.sender;
    }

    /**
     * @notice Open a leveraged position, recursively borrowing CORN, swapping it for ETH, and adding it as collateral
     * @param reserve The amount of ETH that we will keep in the contract as a reserve to prevent liquidation
     */
    function openLeveragedPosition(uint256 reserve) public payable onlyOwner {
        uint256 loops = 0;
        while (true) {
            // Write more code here
            loops++;
        }
        emit LeveragedPositionOpened(msg.sender, loops);
    }

    /**
     * @notice Close a leveraged position, recursively withdrawing collateral, swapping it for CORN, and repaying the lending contract until the position is closed
     */
    function closeLeveragedPosition() public onlyOwner {
        uint256 loops = 0;
        while (true) {
            // Write more code here
            loops++;
        }
        emit LeveragedPositionClosed(msg.sender, loops);
    }

    /**
     * @notice Withdraw the ETH from the contract
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Failed to send Ether");
    }

    receive() external payable {}
}
\`\`\`

</details>

Try to fill in the "while loops" in the open and close leveraged position functions.

Notice how the \`openLeveragedPosition\` receives a uint256 which represents the amount of ETH the caller wants left over as collateral after looping. If none is specified then the the loan will stop right at the liquidation threshold. The smallest movement in CORN going higher could cause you to be liquidated.

The while loop should add collateral to the \`Lending\` contract and then borrow the max amount of CORN. Then it should use the DEX to swap that CORN for more ETH. Then the loop should be good to go again. Just make sure you add a condition to check if the amount of ETH is less than or equal to the reserve amount and if so, break out of the loop.

<details><summary>Solution Code</summary>

\`\`\`solidity
    function openLeveragedPosition(uint256 reserve) public payable onlyOwner {
        uint256 loops = 0;
        while (true) {
            uint256 balance = address(this).balance;
            i_lending.addCollateral{value: balance}();
            if (balance <= reserve) {
                break;
            }
            uint256 maxBorrowAmount = i_lending.getMaxBorrowAmount(balance);
            i_lending.borrowCorn(maxBorrowAmount);
            
            i_cornDEX.swap(maxBorrowAmount);
            loops++;
        }
        emit LeveragedPositionOpened(msg.sender, loops);
    }
\`\`\`

</details>

\`closeLeveragedPosition\` Should be similar except it will be withdrawing the maximum amount of collateral, swapping to CORN and repaying the debt until there isn't any more CORN left to repay.

<details><summary>Solution Code</summary>

\`\`\`solidity
    function closeLeveragedPosition() public onlyOwner {
        uint256 loops = 0;
        while (true) {
            uint256 maxWithdrawable = i_lending.getMaxWithdrawableCollateral(address(this));
            i_lending.withdrawCollateral(maxWithdrawable);
            require(maxWithdrawable == address(this).balance, "maxWithdrawable is not equal to balance");
            i_cornDEX.swap{value:maxWithdrawable}(maxWithdrawable);
            uint256 cornBalance = i_corn.balanceOf(address(this));
            uint256 amountToRepay = cornBalance > i_lending.s_userBorrowed(address(this)) ? i_lending.s_userBorrowed(address(this)) : cornBalance;
            if (amountToRepay > 0) {
                i_lending.repayCorn(amountToRepay);
            } else {
                // Swap the remaining CORN to ETH since we don't want CORN exposure
                i_cornDEX.swap(i_corn.balanceOf(address(this)));
                break;
            }
            loops++;
        }
        emit LeveragedPositionClosed(msg.sender, loops);
    }
\`\`\`

</details>

The \`Leverage\` contract has a \`claimOwnership\` and \`withdraw\` function so that you can claim ownership of the contract before opening the position because the position is actually owned by this contract.

Lastly, add the deploy logic to the deployment script. Add it beneath all the existing logic in \`packages/hardhat/deploy/00_deploy_contracts.ts\` like you did with the last side quest.
<details markdown='1'><summary>Deployment Code</summary>

\`\`\`typescript
  await deploy("Leverage", {
    from: deployer,
    args: [lending.address, cornDEX.target, cornToken.target],
    log: true,
    autoMine: true,
  });
\`\`\`

</details>

Restart \`yarn chain\` and deploy your contracts with \`yarn deploy\`.

Try opening a leveraged position and see how changing the reserve amount affects your tolerance to changes in the market. Leverage is powerful stuff that will blow up in your face if you aren't careful.

## Checkpoint 7: 💾 Deploy your contracts! 🛰

📡 Edit the \`defaultNetwork\` to [your choice of public EVM networks](https://ethereum.org/en/developers/docs/networks/) in \`packages/hardhat/hardhat.config.ts\`

🔐 You will need to generate a **deployer address** using \`yarn generate\` This creates a mnemonic and saves it locally.

👩‍🚀 Use \`yarn account\` to view your deployer account balances.

⛽️ You will need to send ETH to your **deployer address** with your wallet, or get it from a public faucet of your chosen network.

🚀 Run \`yarn deploy\` to deploy your smart contract to a public network (selected in \`hardhat.config.ts\`)

> 💬 Hint: You can set the \`defaultNetwork\` in \`hardhat.config.ts\` to \`sepolia\` or \`optimismSepolia\` **OR** you can \`yarn deploy --network sepolia\` or \`yarn deploy --network optimismSepolia\`.

---

## Checkpoint 8: 🚢 Ship your frontend! 🚁

✏️ Edit your frontend config in \`packages/nextjs/scaffold.config.ts\` to change the \`targetNetwork\` to \`chains.sepolia\` (or \`chains.optimismSepolia\` if you deployed to OP Sepolia)

💻 View your frontend at http://localhost:3000 and verify you see the correct network.

📡 When you are ready to ship the frontend app...

📦 Run \`yarn vercel\` to package up your frontend and deploy.

> You might need to log in to Vercel first by running \`yarn vercel:login\`. Once you log in (email, GitHub, etc), the default options should work.

> If you want to redeploy to the same production URL you can run \`yarn vercel --prod\`. If you omit the \`--prod\` flag it will deploy it to a preview/test URL.

> Follow the steps to deploy to Vercel. It'll give you a public URL.

> 🦊 Since we have deployed to a public testnet, you will now need to connect using a wallet you own or use a burner wallet. By default 🔥 \`burner wallet's\` are only available on \`hardhat\` . You can enable them on every chain by setting \`onlyLocalBurnerWallet: false\` in your frontend config (\`scaffold.config.ts\` in \`packages/nextjs/\`)

#### Configuration of Third-Party Services for Production-Grade Apps.

By default, 🏗 Scaffold-ETH 2 provides predefined API keys for popular services such as Alchemy and Etherscan. This allows you to begin developing and testing your applications more easily, avoiding the need to register for these services.
This is great to complete your **SpeedRunEthereum**.

For production-grade applications, it's recommended to obtain your own API keys (to prevent rate limiting issues). You can configure these at:

- 🔷\`ALCHEMY_API_KEY\` variable in \`packages/hardhat/.env\` and \`packages/nextjs/.env.local\`. You can create API keys from the [Alchemy dashboard](https://dashboard.alchemy.com/).

- 📃\`ETHERSCAN_API_KEY\` variable in \`packages/hardhat/.env\` with your generated API key. You can get your key [here](https://etherscan.io/myapikey).

> 💬 Hint: It's recommended to store env's for nextjs in Vercel/system env config for live apps and use .env.local for local testing.

---

## Checkpoint 9: 📜 Contract Verification

Run the \`yarn verify --network your_network\` command to verify your contracts on etherscan 🛰

👉 Search this address on [Sepolia Etherscan](https://sepolia.etherscan.io/) (or [Optimism Sepolia Etherscan](https://sepolia-optimism.etherscan.io/) if you deployed to OP Sepolia) to get the URL you submit to 🏃‍♀️[SpeedRunEthereum.com](https://speedrunethereum.com).

---

> 🏃 Head to your next challenge [here](https://speedrunethereum.com).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
`;
