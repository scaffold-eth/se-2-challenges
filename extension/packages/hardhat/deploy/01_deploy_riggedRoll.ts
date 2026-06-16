import { deployScript } from "../rocketh/deploy.js";

export default deployScript(
  async env => {
    const diceGame = env.get("DiceGame");
    const diceGameAddress = diceGame.address;

    // Uncomment to deploy RiggedRoll contract
    // const riggedRoll = await env.deploy("RiggedRoll", {
    //   account: env.namedAccounts.deployer,
    //   artifact: artifacts.RiggedRoll,
    //   args: [diceGameAddress],
    // });

    // Please replace the text "Your Address" with your own address.
    // try {
    //   await env.execute(riggedRoll, {
    //     functionName: "transferOwnership",
    //     args: ["Your Address"],
    //     account: env.namedAccounts.deployer,
    //   });
    // } catch (err) {
    //   console.log(err);
    // }
    void diceGameAddress;
  },
  { tags: ["RiggedRoll"] },
);
