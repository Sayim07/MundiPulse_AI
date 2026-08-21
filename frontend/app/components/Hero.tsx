"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wheat, Sprout, TrendingUp, ShieldCheck, Sparkles } from "lucide-react";

const TITLES = [
  { text: "Autonomous APMC Arbitrage & Price Discovery", icon: TrendingUp },
  { text: "Logistics-Adjusted Real Profit Discovery", icon: Sprout },
  { text: "Empowering Smallholder Farmer Welfare", icon: Wheat },
];

/**
 * Hero — GovTech Executive Dashboard Header
 */
export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TITLES.length);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full pt-10 pb-6 px-6 overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">

        {/* Official GovTech Clearance Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/80 border border-emerald-500/30 backdrop-blur-md shadow-lg shadow-emerald-950/40 mb-4"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-300">
            GovTech Executive Dashboard · Live Mandi Intelligence
          </span>
        </motion.div>

        {/* Main Title */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white drop-shadow-2xl">
            MandiPulse <span className="gradient-text">AI</span>
          </h1>
        </motion.div>

        {/* Rotating Subtitle Badge */}
        <div className="h-9 relative flex items-center justify-center mt-2.5 mb-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              className="absolute flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-800 backdrop-blur-sm"
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              {(() => {
                const Icon = TITLES[currentIndex].icon;
                return (
                  <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                );
              })()}
              <span className="text-xs sm:text-sm text-slate-200 font-semibold tracking-wide">
                {TITLES[currentIndex].text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Description */}
        <motion.p
          className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl mx-auto leading-relaxed drop-shadow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Real-time APMC price intelligence for Indian agriculture. Computes transport-adjusted net realization margins and synthesizes bilingual executive advisories.
        </motion.p>
      </div>
    </section>
  );
}

