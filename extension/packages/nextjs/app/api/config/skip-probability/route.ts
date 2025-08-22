import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "..", "hardhat", "scripts", "oracle-bot", "config.json");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { value, nodeAddress } = body;

    if (typeof value !== "number" || value < 0 || value > 1) {
      return NextResponse.json({ error: "Value must be a number between 0 and 1" }, { status: 400 });
    }

    // Read current config
    const configContent = await fs.promises.readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(configContent);

    // Update node-specific config
    if (!config.NODE_CONFIGS[nodeAddress]) {
      config.NODE_CONFIGS[nodeAddress] = { ...config.NODE_CONFIGS.default };
    }
    config.NODE_CONFIGS[nodeAddress].PROBABILITY_OF_SKIPPING_REPORT = value;

    // Write back to file
    await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));

    return NextResponse.json({ success: true, value });
  } catch (error) {
    console.error("Error updating skip probability:", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeAddress = searchParams.get("nodeAddress");

    if (!nodeAddress) {
      return NextResponse.json({ error: "nodeAddress parameter is required" }, { status: 400 });
    }

    const configContent = await fs.promises.readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(configContent);
    const nodeConfig = config.NODE_CONFIGS[nodeAddress] || config.NODE_CONFIGS.default;

    return NextResponse.json({
      value: nodeConfig.PROBABILITY_OF_SKIPPING_REPORT,
    });
  } catch (error) {
    console.error("Error reading skip probability:", error);
    return NextResponse.json({ error: "Failed to read configuration" }, { status: 500 });
  }
}
