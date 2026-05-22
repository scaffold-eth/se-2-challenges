import { artifacts, deployScript } from "../rocketh/deploy.js";
import { fetchPriceFromUniswap } from "../scripts/fetchPriceFromUniswap.js";
import { createPublicClient, createWalletClient, custom, decodeEventLog, type WalletClient, type Account } from "viem";
import { mnemonicToAccount } from "viem/accounts";

/**
 * Deploys a WhitelistOracle contract and creates SimpleOracle instances through it.
 */
export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    console.log("Deploying WhitelistOracle contract...");
    const whitelistOracle = await env.deploy("WhitelistOracle", {
      account: deployer,
      artifact: artifacts.WhitelistOracle,
      args: [],
    });
    const whitelistOracleAddress = whitelistOracle.address;
    const whitelistOracleAbi = whitelistOracle.abi;

    // Skip the rest of the setup if we are on a live network
    if (env.name === "default" || env.name === "localhost") {
      const provider = env.network.provider;
      const publicClient = createPublicClient({ transport: custom(provider) });

      // Hardhat default mnemonic — 10 node accounts (m/44'/60'/0'/0/0 .. /9)
      const HARDHAT_MNEMONIC = "test test test test test test test test test test test junk";
      const nodeAccounts: Account[] = Array.from({ length: 10 }, (_, i) =>
        mnemonicToAccount(HARDHAT_MNEMONIC, { addressIndex: i }),
      );

      const deployerAccount = nodeAccounts.find(a => a.address.toLowerCase() === deployer.toLowerCase());
      if (!deployerAccount) throw new Error("Deployer account not found in derived node accounts");

      const walletClient = (account: Account): WalletClient =>
        createWalletClient({ account, transport: custom(provider) });

      const deployerWallet = walletClient(deployerAccount);

      console.log("Creating SimpleOracle instances through WhitelistOracle...");
      const addOracleReceipts = [];
      for (let i = 0; i < nodeAccounts.length; i++) {
        const ownerAddress = nodeAccounts[i].address;
        console.log(`Creating SimpleOracle ${i + 1}/10 with owner: ${ownerAddress}`);
        const txHash = await deployerWallet.writeContract({
          address: whitelistOracleAddress,
          abi: whitelistOracleAbi,
          functionName: "addOracle",
          args: [ownerAddress],
          chain: null,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        addOracleReceipts.push(receipt);
      }

      // Map owner => created oracle address from events
      const ownerToOracleAddress = new Map<string, string>();
      for (const receipt of addOracleReceipts) {
        const oracleAddedEvent = receipt.logs.find(log => {
          try {
            const decoded = decodeEventLog({
              abi: whitelistOracleAbi,
              data: log.data,
              topics: log.topics,
            }) as { eventName: string; args: { oracleAddress: string; oracleOwner: string } };
            return decoded.eventName === "OracleAdded";
          } catch {
            return false;
          }
        });
        if (!oracleAddedEvent) continue;
        const decoded = decodeEventLog({
          abi: whitelistOracleAbi,
          data: oracleAddedEvent.data,
          topics: oracleAddedEvent.topics,
        }) as { eventName: string; args: { oracleAddress: string; oracleOwner: string } };
        ownerToOracleAddress.set(decoded.args.oracleOwner.toLowerCase(), decoded.args.oracleAddress);
        console.log(`✅ Created SimpleOracle at: ${decoded.args.oracleAddress}`);
      }

      const createdOracleAddresses: string[] = nodeAccounts.map(acc => {
        const addr = ownerToOracleAddress.get(acc.address.toLowerCase());
        if (!addr) throw new Error(`Missing oracle address for owner ${acc.address}`);
        return addr;
      });

      // Set initial prices for each created SimpleOracle
      console.log("Setting initial prices for each SimpleOracle...");
      const initialPrice = await fetchPriceFromUniswap();
      const simpleOracleAbi = artifacts.SimpleOracle.abi;
      const setPriceTxPromises = nodeAccounts.map((account, i) => {
        const oracleAddress = createdOracleAddresses[i];
        return walletClient(account).writeContract({
          address: oracleAddress as `0x${string}`,
          abi: simpleOracleAbi,
          functionName: "setPrice",
          args: [initialPrice],
          chain: null,
        });
      });
      const setPriceTxHashes = await Promise.all(setPriceTxPromises);
      await Promise.all(setPriceTxHashes.map(hash => publicClient.waitForTransactionReceipt({ hash })));
      for (let i = 0; i < createdOracleAddresses.length; i++) {
        console.log(`Set price for SimpleOracle ${i + 1} to: ${initialPrice}`);
      }

      // Calculate initial median price
      console.log("Calculating initial median price...");
      const medianPrice = await publicClient.readContract({
        address: whitelistOracleAddress,
        abi: whitelistOracleAbi,
        functionName: "getPrice",
        args: [],
      });
      console.log(`Initial median price: ${(medianPrice as bigint)?.toString()}`);
    }
    console.log("WhitelistOracle contract deployed and configured successfully!");
  },
  { tags: ["Oracles"] },
);
