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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Global Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover z-[-1]"
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>

        {/* Global Dark overlay to ensure text is readable over the video */}
        <div className="fixed inset-0 bg-black/40 z-[0] pointer-events-none" />
        
        {/* Page Content */}
        <div className="relative z-10 flex flex-col flex-1 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
