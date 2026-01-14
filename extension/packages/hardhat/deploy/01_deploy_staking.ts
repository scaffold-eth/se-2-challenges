import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployStakingOracle: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { viem } = hre;

  // Deploy ORA independently, then wire it into StakingOracle and transfer ownership to StakingOracle.
  console.log("Deploying ORA token...");
  const oraDeployment = await deploy("ORA", {
    contract: "ORA",
    from: deployer,
    args: [],
    log: true,
    autoMine: false,
  });

  console.log("Deploying StakingOracle (wired to ORA)...");
  const stakingDeployment = await deploy("StakingOracle", {
    contract: "StakingOracle",
    from: deployer,
    args: [oraDeployment.address],
    log: true,
    autoMine: false,
  });

  const stakingOracleAddress = stakingDeployment.address as `0x${string}`;
  console.log("StakingOracle deployed at:", stakingOracleAddress);

  // Set ORA owner to StakingOracle so it can mint rewards via ORA.mint(...)
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployerClient = walletClients.find(wc => wc.account.address.toLowerCase() === deployer.toLowerCase());
  if (!deployerClient) throw new Error("Deployer wallet client not found");

  // Check current owner before attempting transfer
  const currentOwner = await publicClient.readContract({
    address: oraDeployment.address as `0x${string}`,
    abi: oraDeployment.abi,
    functionName: "owner",
    args: [],
  });

  if ((currentOwner as unknown as string).toLowerCase() === stakingOracleAddress.toLowerCase()) {
    console.log("ORA ownership already transferred to StakingOracle, skipping...");
  } else {
    console.log("Transferring ORA ownership to StakingOracle...");
    const txHash = await deployerClient.writeContract({
      address: oraDeployment.address as `0x${string}`,
      abi: oraDeployment.abi,
      functionName: "transferOwnership",
      args: [stakingOracleAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  }

  console.log("ORA deployed at:", oraDeployment.address);
};

export default deployStakingOracle;
