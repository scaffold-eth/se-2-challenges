import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FOUNDRY_ROOT = join(__dirname, "..", "..");
const BROADCAST_DIR = join(FOUNDRY_ROOT, "broadcast");
const OUT_DIR = join(FOUNDRY_ROOT, "out");

/**
 * Read a contract's ABI from forge build artifacts (out/).
 * Handles cases where the .sol filename differs from the contract name.
 */
function getAbi(contractName) {
  // Try direct match first: out/ContractName.sol/ContractName.json
  const directPath = join(
    OUT_DIR,
    `${contractName}.sol`,
    `${contractName}.json`
  );
  if (existsSync(directPath)) {
    return JSON.parse(readFileSync(directPath, "utf8")).abi;
  }

  // Search all .sol folders for ContractName.json
  if (existsSync(OUT_DIR)) {
    for (const folder of readdirSync(OUT_DIR)) {
      if (!folder.endsWith(".sol")) continue;
      const candidatePath = join(OUT_DIR, folder, `${contractName}.json`);
      if (existsSync(candidatePath)) {
        return JSON.parse(readFileSync(candidatePath, "utf8")).abi;
      }
    }
  }

  throw new Error(`Artifact not found for ${contractName} in ${OUT_DIR}`);
}

/**
 * Scan all broadcast run files to find the latest deployed address for a contract.
 */
function findDeployedAddress(contractName) {
  if (!existsSync(BROADCAST_DIR)) {
    throw new Error(`Broadcast directory not found: ${BROADCAST_DIR}`);
  }

  let latestDeployment = null;
  let latestTimestamp = 0;

  const scriptFolders = readdirSync(BROADCAST_DIR).filter((f) =>
    statSync(join(BROADCAST_DIR, f)).isDirectory()
  );

  for (const scriptFolder of scriptFolders) {
    const scriptPath = join(BROADCAST_DIR, scriptFolder);
    const chainFolders = readdirSync(scriptPath).filter((f) =>
      statSync(join(scriptPath, f)).isDirectory()
    );

    for (const chainFolder of chainFolders) {
      const chainPath = join(scriptPath, chainFolder);
      const runLatestPath = join(chainPath, "run-latest.json");
      if (!existsSync(runLatestPath)) continue;

      try {
        const broadcast = JSON.parse(readFileSync(runLatestPath, "utf8"));
        const timestamp = broadcast.timestamp || 0;

        for (const tx of broadcast.transactions || []) {
          if (
            (tx.transactionType === "CREATE" ||
              tx.transactionType === "CREATE2") &&
            tx.contractName === contractName
          ) {
            if (timestamp >= latestTimestamp) {
              latestTimestamp = timestamp;
              latestDeployment = {
                address: tx.contractAddress,
                receipt: (broadcast.receipts || []).find(
                  (r) => r.transactionHash === tx.hash
                ),
              };
            }
          }
        }
      } catch {
        // skip malformed broadcast files
      }
    }
  }

  if (!latestDeployment) {
    throw new Error(
      `No deployment found for ${contractName}. Run 'yarn deploy' first.`
    );
  }

  return latestDeployment;
}

/**
 * Get deployed contract info: { address, abi, deployedBlock }
 */
export function getContract(contractName) {
  const abi = getAbi(contractName);
  const { address, receipt } = findDeployedAddress(contractName);
  const deployedBlock = receipt?.blockNumber ? BigInt(receipt.blockNumber) : 0n;

  return {
    address: address.toLowerCase(),
    abi,
    deployedBlock,
  };
}
