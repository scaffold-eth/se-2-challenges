import { QUESTIONS_FOR_OO } from "./constants";

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

export const getHighlightColorForPrice = (currentPrice: bigint | undefined, medianPrice: bigint | undefined) => {
  if (currentPrice === undefined || medianPrice === undefined) return "";
  const medianPriceNum = Number(medianPrice);
  if (medianPriceNum === 0) return "";
  const percentageChange = Math.abs((Number(currentPrice) - medianPriceNum) / medianPriceNum) * 100;
  if (percentageChange < 5) return "bg-success";
  else if (percentageChange < 10) return "bg-warning";
  else return "bg-error";
};
