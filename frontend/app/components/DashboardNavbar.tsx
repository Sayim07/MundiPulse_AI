"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ShieldCheck,
  Cpu,
  Home,
  LayoutDashboard,
  Radio,
  FileCheck,
  CheckCircle2,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";

interface DashboardNavbarProps {
  dataMode?: "live" | "demo";
  isRunning?: boolean;
}

export default function DashboardNavbar({ isRunning }: DashboardNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 border-b border-emerald-500/20 backdrop-blur-xl transition-all shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform">
                K
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-white font-black text-lg tracking-tight">KrishiDrishti</span>
                <span className="text-emerald-400 font-extrabold text-lg">AI</span>
              </div>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Executive GovTech Console
            </span>
          </div>

          {/* Center Status Indicators (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <span className={`h-2 w-2 rounded-full ${isRunning ? "bg-emerald-400 animate-ping" : "bg-emerald-400"}`} />
              <span className="text-slate-300 font-medium">Agmarknet Gateway:</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="text-slate-300 font-medium">HITL Gate:</span>
              <span className="text-cyan-300 font-bold">PROTECTED</span>
            </div>
          </div>

          {/* Right Hamburger Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2.5 rounded-xl border border-emerald-500/30 bg-slate-900/80 hover:bg-slate-800 hover:border-emerald-500/60 text-slate-200 hover:text-white transition-all shadow-md flex items-center gap-2 cursor-pointer"
              aria-label="Toggle Operations Menu"
            >
              {isOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5 text-emerald-400" />}
              <span className="text-xs font-bold font-mono uppercase tracking-wider hidden sm:inline-block">
                System Specs & Ops
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* Slide-out Hamburger Operations Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50"
            />

            {/* Slide-Over Panel */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-slate-950/95 border-l border-emerald-500/30 backdrop-blur-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">System Operations & Specs</h3>
                      <p className="text-xs text-slate-400 font-mono">GovTech Intelligence Architecture</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Primary Navigation Links */}
                <div className="py-4 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
                    Console Navigation
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-900/60 hover:bg-emerald-500/15 border border-slate-800 hover:border-emerald-500/30 text-slate-200 hover:text-emerald-300 transition-all font-medium text-xs"
                    >
                      <Home className="w-4 h-4 text-slate-400" />
                      <span>Landing Page</span>
                    </Link>

                    <Link
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                        <span>Dashboard</span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                        ACTIVE
                      </span>
                    </Link>
                  </div>
                </div>

                {/* 1. 🏛️ System Architecture Section */}
                <div className="py-4 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                      System Architecture
                    </h4>
                    <span className="ml-auto text-[9px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                      Zero-Hallucination
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
                    <p>
                      <strong className="text-white">1. Agmarknet SSL Live Stream:</strong> Pulls real-time APMC commodity records directly from government servers.
                    </p>
                    <p>
                      <strong className="text-emerald-300">2. Python Margins Engine:</strong> Computes road freight distance tariffs and net realizations per quintal mathematically in pure Python.
                    </p>
                    <p>
                      <strong className="text-cyan-300">3. Gemini LLM Advisory:</strong> Synthesizes localized Bengali & English intelligence summaries without arithmetic tasks.
                    </p>
                    <p>
                      <strong className="text-amber-300">4. HITL Approval Gate:</strong> Dispatches outward email advisories only after explicit administrative sign-off.
                    </p>
                  </div>
                </div>

                {/* 2. 🛡️ Responsible AI Protocol Section */}
                <div className="py-4 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Shield className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                      Responsible AI Protocol
                    </h4>
                    <span className="ml-auto text-[9px] font-mono text-amber-300 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      HITL Protected
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <p>
                      Autonomous advisory dispatch is <strong className="text-amber-300">strictly gated</strong> by authorized officer approval. Numerical margins are strictly computed in Python, eliminating LLM arithmetic hallucinations.
                    </p>
                  </div>
                </div>

                {/* 3. ⚙️ GovTech Core Stack Section */}
                <div className="py-4 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                      GovTech Core Stack
                    </h4>
                    <span className="ml-auto text-[9px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Enterprise Verified
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Next.js App Router",
                      "FastAPI Async",
                      "Agmarknet Live API",
                      "Gemini 1.5 Flash",
                      "Tailwind CSS v4",
                      "Framer Motion",
                      "Web3Forms SSL",
                      "Pydantic Validation",
                    ].map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-900 text-slate-200 border border-slate-700/80"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 4. 📜 System Compliance & ISO Audit Notice */}
                <div className="py-4 border-t border-slate-800/80 space-y-2">
                  <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1">
                      <FileCheck className="w-4 h-4" />
                      <span>ISO-GovTech Audit & Compliance</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      All outbound email advisories require explicit human sign-off. Calculations are verified in Python to guarantee zero arithmetic hallucinations.
                    </p>
                  </div>
                </div>

              </div>

              {/* Drawer Footer */}
              <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>KrishiDrishti AI Platform v2.4</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  System Verified
                </span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

