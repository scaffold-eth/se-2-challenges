export const skipQuickStart = true;
// CHALLENGE-TODO: Update the readme to reflect your challenge. In the very end you will need a non-template
// README.md file in the extension root so it is recommended to copy the template in a markdown file and then
// update extraContents after confirming the template is correct.
// include following code at the start of checkpoint 0 of the README.md file
// *Start of the code block*
// \`\`\`sh
// npx create-eth@<version> -e {challengeName} {challengeName}
// cd {challengeName}
// \`\`\`

// > in the same terminal, start your local network (a blockchain emulator in your computer):
// *End of the code block*

export const extraContents = `# {challengeEmoji} {challengeTitle}

A {challengeDescription}.

🌟 The final deliverable is an app that {challengeDeliverable}.
Deploy your contracts to a testnet then build and upload your app to a public web server. Submit the url on [SpeedRunEthereum.com](https://speedrunethereum.com)!

💬 Meet other builders working on this challenge and get help in the {challengeTelegramLink}

---

## Checkpoint 0: 📦 Environment 📚

> Start your local network (a blockchain emulator in your computer):

\`\`\`sh
yarn chain
\`\`\`

> in a second terminal window, 🛰 deploy your contract (locally):

\`\`\`sh
cd <challenge_folder_name>
yarn deploy
\`\`\`

> in a third terminal window, start your 📱 frontend:

\`\`\`sh
cd <challenge_folder_name>
yarn start
\`\`\`

📱 Open http://localhost:3000 to see the app.

> 👩‍💻 Rerun \`yarn deploy --reset\` whenever you want to deploy new contracts to the frontend, update your current contracts with changes, or re-deploy it to get a fresh contract address.

🔏 Now you are ready to edit your smart contract \`{mainContractName.sol}\` in \`packages/hardhat/contracts\`

---

_Other commonly used Checkpoints (check one Challenge and adapt the texts for your own):_

## Checkpoint {num}: 💾 Deploy your contract! 🛰

## Checkpoint {num}: 🚢 Ship your frontend! 🚁

## Checkpoint {num}: 📜 Contract Verification

---

_Create all the required Checkpoints for the Challenge, can also add Side Quests you think may be interesting to complete. Check other Challenges for inspiration._

### ⚔️ Side Quests

_To finish your README, can add these links_

> 🏃 Head to your next challenge [here](https://speedrunethereum.com).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
`;
