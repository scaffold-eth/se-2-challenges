import { Config } from "./oracle-bot/types";
import fs from "fs";
import path from "path";
import hre from "hardhat";

const getConfigPath = (): string => {
  return path.join(__dirname, "oracle-bot", "config.json");
};

export const getConfig = (): Config => {
  const configPath = getConfigPath();
  const configContent = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(configContent) as Config;
  return config;
};

export const updateConfig = (updates: Partial<Config>): void => {
  const configPath = getConfigPath();
  const currentConfig = getConfig();
  const updatedConfig = { ...currentConfig, ...updates };
  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
};

export const updatePriceCache = (price: number, timestamp: number): void => {
  updateConfig({
    PRICE: {
      CACHEDPRICE: price,
      TIMESTAMP: timestamp,
    },
  });
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Cleanup function to ensure automining is turned back on
export async function cleanup() {
  try {
    const publicClient = await hre.viem.getPublicClient();
    await publicClient.transport.request({ method: "evm_setAutomine", params: [true] });
    console.log("\nCleaning up: turning automining back on...");
  } catch (error) {
    console.error("Error cleaning up:", error);
  }
}

export const QUESTIONS_FOR_OO: string[] = [
  "Did ETH/USD exceed $3,000 at 00:00 UTC on {MONTH} {DAY}, {YEAR}?",
  "Did the BTC/ETH ratio fall below 14 on {MONTH} {DAY}, {YEAR}?",
  "Did Uniswap's TVL exceed $10B on {MONTH} {DAY}, {YEAR}?",
  "Did the Ethereum Cancun upgrade activate before {MONTH} {DAY}, {YEAR}?",
  "Did the average gas price on Ethereum exceed 200 gwei on {MONTH} {DAY}, {YEAR}?",
  "Did Ethereum's staking participation rate exceed 25% on {MONTH} {DAY}, {YEAR}?",
  "Did Base chain have more than 1M daily transactions on {MONTH} {DAY}, {YEAR}?",
  "Did the SEC approve a Bitcoin ETF before {MONTH} {DAY}, {YEAR}?",
  "Did OpenSea's trading volume exceed $500M in {MONTH} {YEAR}?",
  "Did Farcaster have more than 10K active users on {MONTH} {DAY}, {YEAR}?",
  "Did ENS domains exceed 5M total registrations before {MONTH} {YEAR}?",
  "Did the total bridged USDC on Arbitrum exceed $2B on {MONTH} {DAY}, {YEAR}?",
  "Did Optimism's native token OP increase above $1.50 on {MONTH} {DAY}, {YEAR}?",
  "Did Aave v3 have higher borrow volume than v2 on {MONTH} {DAY}, {YEAR}?",
  "Did Compound see more than 1,000 liquidations on {MONTH} {DAY}, {YEAR}?",
  "Did BTC's 24-hour volume exceed $50B on {MONTH} {DAY}, {YEAR}?",
  "Did Real Madrid win the UEFA Champions League Final in {YEAR}?",
  "Did G2 Esports win a major tournament in {MONTH} {YEAR}?",
  "Did the temperature in New York exceed 35°C on {MONTH} {DAY}, {YEAR}?",
  "Did it rain more than 50mm in London on {MONTH} {DAY}, {YEAR}?",
  "Did Tokyo experience an earthquake of magnitude 5.0 or higher in {MONTH} {YEAR}?",
  "Did the Nasdaq Composite fall more than 3% on {MONTH} {DAY}, {YEAR}?",
  "Did the S&P 500 set a new all-time high on {MONTH} {DAY}, {YEAR}?",
  "Did the US unemployment rate drop below 4% in {MONTH} {YEAR}?",
  "Did the average global temperature for {MONTH} {YEAR} exceed that of the previous year?",
  "Did gold price exceed $2,200/oz on {MONTH} {DAY}, {YEAR}?",
  "Did YouTube's most viewed video gain more than 10M new views in {MONTH} {YEAR}?",
  "Did the population of India officially surpass China according to the UN in {YEAR}?",
  "Did the UEFA Euro 2024 Final have more than 80,000 attendees in the stadium?",
  "Did a pigeon successfully complete a 500km race in under 10 hours in {MONTH} {YEAR}?",
  "Did a goat attend a university graduation ceremony wearing a cap and gown on {MONTH} {DAY}, {YEAR}?",
  "Did someone eat 100 chicken nuggets in under 10 minutes on {MONTH} {DAY}, {YEAR}?",
  "Did a cat walk across a live TV weather report in {MONTH} {YEAR}?",
  "Did a cow escape from a farm and get caught on camera riding a water slide in {YEAR}?",
  "Did a man legally change his name to 'Bitcoin McMoneyface' on {MONTH} {DAY}, {YEAR}?",
  "Did a squirrel steal a GoPro and film itself on {MONTH} {DAY}, {YEAR}?",
  "Did someone cosplay as Shrek and complete a full marathon on {MONTH} {DAY}, {YEAR}?",
  "Did a group of people attempt to cook the world's largest pancake using a flamethrower?",
  "Did a man propose using a pizza drone delivery on {MONTH} {DAY}, {YEAR}?",
  "Did a woman knit a sweater large enough to cover a school bus in {MONTH} {YEAR}?",
  "Did someone attempt to break the world record for most dad jokes told in 1 hour?",
  "Did an alpaca accidentally join a Zoom meeting for a tech startup on {MONTH} {DAY}, {YEAR}?",
];

const generateRandomPastDate = (now: Date): Date => {
  const daysBack = Math.floor(Math.random() * 45) + 1; // 1 - 45 days

  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - daysBack);

  return pastDate;
};

const replaceDatePlaceholders = (question: string): string => {
  const now = new Date();
  const past = generateRandomPastDate(now);

  return question
    .replace(/\{DAY\}/g, past.getDate().toString())
    .replace(/\{MONTH\}/g, past.toLocaleDateString("en-US", { month: "long" }))
    .replace(/\{YEAR\}/g, past.getFullYear().toString());
};

export const getRandomQuestion = (): string => {
  const randomIndex = Math.floor(Math.random() * QUESTIONS_FOR_OO.length);
  const question = QUESTIONS_FOR_OO[randomIndex];
  return replaceDatePlaceholders(question);
};
