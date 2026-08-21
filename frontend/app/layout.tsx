import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KrishiDrishti AI — Autonomous Agri-Arbitrage Agent",
  description:
    "Real-time mandi price intelligence for Indian smallholder farmers. Autonomous browser agent that navigates government portals, computes logistics-adjusted margins, and generates localized alerts.",
  keywords: [
    "KrishiDrishti",
    "KrishiDrishti AI",
    "mandi prices",
    "e-NAM",
    "Agmarknet",
    "agri-tech",
    "farmer",
    "arbitrage",
    "AI agent",
  ],
  authors: [{ name: "KrishiDrishti AI Team" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
        <div className="relative z-10 flex flex-col flex-1 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
