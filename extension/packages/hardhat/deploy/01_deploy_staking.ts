import { artifacts, deployScript } from "../rocketh/deploy.js";

export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    // Deploy ORA independently, then wire it into StakingOracle and transfer ownership to StakingOracle.
    console.log("Deploying ORA token...");
    const oraDeployment = await env.deploy("ORA", {
      account: deployer,
      artifact: artifacts.ORA,
      args: [],
    });

    console.log("Deploying StakingOracle (wired to ORA)...");
    const stakingDeployment = await env.deploy("StakingOracle", {
      account: deployer,
      artifact: artifacts.StakingOracle,
      args: [oraDeployment.address],
    });

    const stakingOracleAddress = stakingDeployment.address;
    console.log("StakingOracle deployed at:", stakingOracleAddress);

    // Set ORA owner to StakingOracle so it can mint rewards via ORA.mint(...)
    const currentOwner = (await env.read(oraDeployment, { functionName: "owner", args: [] })) as `0x${string}`;

    if (currentOwner.toLowerCase() === stakingOracleAddress.toLowerCase()) {
      console.log("ORA ownership already transferred to StakingOracle, skipping...");
    } else {
      console.log("Transferring ORA ownership to StakingOracle...");
      await env.execute(oraDeployment, {
        functionName: "transferOwnership",
        args: [stakingOracleAddress],
        account: deployer,
      });
    }

    console.log("ORA deployed at:", oraDeployment.address);
  },
  { tags: ["StakingOracle"] },
);
