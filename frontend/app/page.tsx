"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import CustomCursor from "./components/CustomCursor";
import { ArrowRight, Globe, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

export default function LandingPage() {
  return (
    <>
      <CustomCursor />



      {/* Minimalist Top Navigation */}
      <nav className="relative z-20 px-6 py-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-slate-950/70 border border-emerald-500/30 backdrop-blur-xl px-6 py-3.5 rounded-2xl shadow-2xl shadow-emerald-950/40">
          <div className="text-white font-black text-xl sm:text-2xl tracking-wide flex items-center gap-1.5">
            <span>KrishiDrishti</span>
            <span className="text-emerald-400">AI</span>
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full ml-2">
              GovTech Platform
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 flex items-center gap-2"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 min-h-[calc(100vh-100px)] flex flex-col justify-between pt-16 pb-16 px-6">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto my-auto">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/80 border border-emerald-500/40 backdrop-blur-md shadow-xl mb-6">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-300">
                Official Agricultural Arbitrage & Margin Engine
              </span>
            </div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white drop-shadow-2xl mb-6">
              KrishiDrishti <span className="gradient-text">AI</span>
            </h1>

            <p className="text-base sm:text-xl md:text-2xl text-slate-100 drop-shadow-md font-medium max-w-2xl mb-10 leading-relaxed">
              Empowering farmers & agricultural officers with autonomous real-time APMC price discovery, logistics-adjusted net margins, and bilingual intelligence.
            </p>

            <Link href="/dashboard" className="inline-flex group">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(16, 185, 129, 0.6)" }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-base sm:text-lg px-9 sm:px-12 py-4 rounded-2xl font-extrabold tracking-wide shadow-2xl border border-emerald-400/50 flex items-center gap-3 transition-all cursor-pointer"
              >
                <span>Launch Executive Dashboard</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Feature Cards Grid */}
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {[
            {
              title: "Agmarknet Live APMC Stream",
              desc: "Direct integration with official live government commodity market databases.",
              icon: Globe,
              delay: 0.2,
            },
            {
              title: "Autonomous Python Margins",
              desc: "Calculates freight distance tariffs and true net farmer realization per quintal.",
              icon: TrendingUp,
              delay: 0.4,
            },
            {
              title: "Responsible AI HITL Protocol",
              desc: "Human-in-the-Loop administrative verification before automated email advisory dispatch.",
              icon: ShieldCheck,
              delay: 0.6,
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: feature.delay }}
              className="bg-slate-950/75 border border-emerald-500/25 backdrop-blur-xl p-6 rounded-2xl flex flex-col items-center text-center gap-3 shadow-xl hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold text-base drop-shadow-sm">{feature.title}</h3>
              <p className="text-slate-300 text-xs leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </>
  );
}


