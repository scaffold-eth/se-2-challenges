export const preContent = `
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});
`;

export const metadataOverrides = {
  title: "Challenge #0 | SpeedRunEthereum",
  description: "Built with 🏗 Scaffold-ETH 2",
};

export const htmlClassNames = "${spaceGrotesk.variable} font-space-grotesk";
