import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "..", "hardhat", "scripts", "oracle-bot", "config.json");

export type ConfigKey = "PROBABILITY_OF_SKIPPING_REPORT" | "PRICE_VARIANCE";

export async function updateConfigValue(key: ConfigKey, value: number, nodeAddress?: string): Promise<void> {
  try {
    // Read the current config
    const configContent = await fs.promises.readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(configContent);

    // Validate the value
    if (typeof value !== "number" || value < 0) {
      throw new Error("Value must be a non-negative number");
    }

    if (key === "PROBABILITY_OF_SKIPPING_REPORT" && value > 1) {
      throw new Error("Skip probability must be between 0 and 1");
    }

    if (nodeAddress) {
      // Update node-specific config
      if (!config.NODE_CONFIGS[nodeAddress]) {
        config.NODE_CONFIGS[nodeAddress] = { ...config.NODE_CONFIGS.default };
      }
      config.NODE_CONFIGS[nodeAddress][key] = value;
    } else {
      // Update default config
      config.NODE_CONFIGS.default[key] = value;
    }

    // Write back to file with proper formatting
    await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error updating config:", error);
    throw error;
  }
}
