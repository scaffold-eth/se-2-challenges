import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

// Returns a reader that resolves a deployed contract's address from its
// deployment JSON for the given network.
export function createDeploymentReader(networkName: string) {
  const deploymentsDir = path.join(scriptsDir, "..", "deployments", networkName);
  return (name: string): string => {
    const filePath = path.join(deploymentsDir, `${name}.json`);
    return JSON.parse(fs.readFileSync(filePath, "utf8")).address;
  };
}
