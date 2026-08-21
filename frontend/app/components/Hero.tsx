"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wheat, Sprout, TrendingUp } from "lucide-react";

const TITLES = [
  { text: "Real-Time Mandi Intelligence", icon: TrendingUp },
  { text: "Autonomous Price Discovery", icon: Sprout },
  { text: "Empowering Smallholder Farmers", icon: Wheat },
];

/**
 * Hero — Sleek hero section with a fading title slide effect.
 * Cycles through taglines with smooth crossfade animations.
 */
export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TITLES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full pt-12 pb-8 px-6 overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-mp-emerald-neon/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">

        {/* Main Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-2">
            <span className="gradient-text">MandiPulse</span>{" "}
            <span className="text-white drop-shadow-md">AI</span>
          </h1>
        </motion.div>

        {/* Rotating Subtitle */}
        <div className="h-10 md:h-12 relative flex items-center justify-center mt-3 mb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              className="absolute flex items-center gap-2.5"
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              {(() => {
                const Icon = TITLES[currentIndex].icon;
                return (
                  <Icon className="w-5 h-5 text-mp-emerald-400 flex-shrink-0" />
                );
              })()}
              <span className="text-lg md:text-xl text-slate-100 drop-shadow-md font-medium">
                {TITLES[currentIndex].text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Description */}
        <motion.p
          className="text-sm md:text-base text-slate-200 drop-shadow-md font-medium max-w-lg mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          Autonomous browser agent that navigates e-NAM & Agmarknet portals,
          computes logistics-adjusted margins, and generates localized farmer alerts.
        </motion.p>
      </div>
    </section>
  );
}
