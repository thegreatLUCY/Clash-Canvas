import type { Metadata } from "next";
import { Anton, Newsreader, Martian_Mono } from "next/font/google";
import "./globals.css";

// Three fonts, three jobs:
// Anton      — tall condensed poster type for headlines and verdicts
// Newsreader — editorial serif for the arguments themselves (reads like a quote)
// Martian Mono — small technical labels: rounds, scores, stats
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});
const martian = Martian_Mono({ subsets: ["latin"], variable: "--font-martian" });

export const metadata: Metadata = {
  title: "ClashCanvas — two AIs walk into a debate",
  description:
    "Type any topic. Watch two AI models fight it out live. Get an ML-scored verdict with fallacy counts and a shareable card.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${newsreader.variable} ${martian.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
