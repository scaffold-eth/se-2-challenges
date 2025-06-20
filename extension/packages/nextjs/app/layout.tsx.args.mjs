export const preContent = `
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});
`;

// CHALLENGE-TODO: Update the metadataOverrides to reflect your challenge
export const metadataOverrides = {
  title: "Challenge #6 | SpeedRunEthereum",
  description: "Built with 🏗 Scaffold-ETH 2",
};

export const htmlClassNames = "${spaceGrotesk.variable} font-space-grotesk";
