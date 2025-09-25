import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Navigate to the packages/circuits directory from packages/nextjs
    const filePath = path.resolve(process.cwd(), "../circuits/target/circuits.json");
    const data = fs.readFileSync(filePath, "utf-8");
    console.log("Circuit data loaded:", JSON.parse(data));
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error("Error reading circuit data:", error);
    console.error("Attempted to read from:", path.resolve(process.cwd(), "../circuits/target/circuits.json"));
    return NextResponse.json({ error: "Failed to fetch circuit data" }, { status: 500 });
  }
}
