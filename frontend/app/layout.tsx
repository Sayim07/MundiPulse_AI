import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MandiPulse AI — Autonomous Agri-Arbitrage Agent",
  description:
    "Real-time mandi price intelligence for Indian smallholder farmers. Autonomous browser agent that navigates government portals, computes logistics-adjusted margins, and generates localized alerts.",
  keywords: [
    "MandiPulse",
    "mandi prices",
    "e-NAM",
    "Agmarknet",
    "agri-tech",
    "farmer",
    "arbitrage",
    "AI agent",
  ],
  authors: [{ name: "MandiPulse AI Team" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
