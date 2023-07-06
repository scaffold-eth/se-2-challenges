# 💡 Guide and Hints to create New Challenges

If you want to contribute migrating SpeedRunEthereum challenges from Scaffold-ETH 1 to Scaffold-ETH 2, or add brand new Challenges, you can make use of these guide and hints.

## 1. Clone this branch

At `base-challenge-template` branch we will be adding the latest updates from Scaffold ETH 2.
We'll also include the learnings we acquire during the Challenges we are adding, as well as the code that may be common to all the Challenges.  
_//TODO: Should we add the command lines to do that?_

## 2. New Pages: Structure Guidelines

We are trying to follow those structure guidelines when adding new pages:

- `packages/pages/` -> Add new challenge pages required for challenge.
- `components/{camelCase(challengeName)}` -> Add new components for that challenge.
- `utils/{camelCase(challengeName)}` -> Add all the utils.

## 3. Adapt MetaHeader component

Update the title and description of your challenge in the `packages/nextjs/components/MetaHeader.tsx` file.

## 4. Create image assets for your Challenge

You will need to add/update the following image assets in `packages/nextjs/public` folder:

- **Challenge image.** `TODO.png`  
  Will be shown at [SpeedRunEthereum.com Homepage](https://speedrunethereum.com) and reused to create Thumbnail and Hero assets. In Challenge migrations you'll already have that asset.  
  _//TODO: Where would they need to upload that asset?_  
   For New Challenges can ask for designer help at [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
- **Thumbnail.** `thumbnail.png`  
  Will be shown in your link previews when shared to others in chat or in social media (Twitter, Facebook..) We have a template to create this asset, using the creativity from Challenge image. Can check other Challenges, and ask for help to BuidlGuidl designers.
- **Hero image.** `hero.png`  
  _//TODO: Should we create a dummy version of thumbnail.png and hero.png and add them to the base-challenge-template?_  
  It's a wider version of the Thumbnail with SRE logo at the bottom right. Used as README header, and as `pages/index.tsx` hero image.

## 5. Edit README adapting the [base template](#readme-base-template)

Adapt the [base template README](#readme-base-template) replacing all the {variables} with the specific values for your Challenge. Add all the Checkpoints and Side Quests you think are needed to guide the user throught the Challenge.

> Remember to delete the `💡 Guide and Hints to create New Challenges` section of the README.

## 6. Edit `pages/index.tsx` with the first paragraphs of README

When you are done with your README, can copy and paste the first part of it into `pages/index.tsx`. Check other Challenges if you need help.

> {challengeHeroImage}
>
> A {challengeDescription}.
>
> 🌟 The final deliverable is an app that {challengeDeliverable}.
> Deploy your contracts to a testnet then build and upload your app to a public web server. Submit the url on [SpeedRunEthereum.com](https://speedrunethereum.com)!

## 7. Share it with others! Feedback loop

Share your Challenge it with others at [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk).

Start receiving feedback and iterating over your Challenge thanks to the feedback loop.  
When you feel your Challenge is ready, you can create a pull request to try and get it added to SpeedRunEthereum Challenges.

## README Base Template

# 🚩 Challenge {challengeNum}: {challengeEmoji} {challengeTitle}

{challengeHeroImage}

A {challengeDescription}.

🌟 The final deliverable is an app that {challengeDeliverable}.
Deploy your contracts to a testnet then build and upload your app to a public web server. Submit the url on [SpeedRunEthereum.com](https://speedrunethereum.com)!

💬 Meet other builders working on this challenge and get help in the {challengeTelegramLink}

---

## Checkpoint 0: 📦 Install 📚

Before you begin, you need to install the following tools:

- [Node (v18 LTS)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

Then download the challenge to your computer and install dependencies by running:

```sh
git clone https://github.com/scaffold-eth/se-2-challenges.git {challengeName}
cd {challengeName}
git checkout {challengeName}
yarn install
```

🔏 Edit your smart contract {smartContractFileName} in `packages/hardhat/contracts`

---

## Checkpoint 1: 🔭 Environment 📺

You'll have three terminals up for:

```bash
yarn start   (Next app frontend)
yarn chain   (hardhat backend)
yarn deploy  (to compile, deploy, and publish your contracts to the frontend)
```

> 💻 View your frontend at http://localhost:3000/

> 👩‍💻 Rerun `yarn deploy --reset` whenever you want to deploy new contracts to the frontend.

---

_Other commonly used Checkpoints (check one Challenge and adapt the texts for your own):_

## Checkpoint {num}: 💾 Deploy it! 🛰

## Checkpoint {num}: 🚢 Ship it! 🚁

## Checkpoint {num}: 📜 Contract Verification

---

_Create all the required Checkpoints for the Challenge, can also add Side Quests you think may be interesting to complete. Check other Challenges for inspiration._

## ⚔️ Side Quests

_To finish your README, can add these links_

> 🏃 Head to your next challenge [here](https://speedrunethereum.com).

> 💬 Problems, questions, comments on the stack? Post them to the [🏗 scaffold-eth developers chat](https://t.me/joinchat/F7nCRK3kI93PoCOk)
