export const providerImports = `
import { Space_Grotesk } from "next/font/google";
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});
`;

export const globalClassNames = "${spaceGrotesk.variable} font-space-grotesk";
