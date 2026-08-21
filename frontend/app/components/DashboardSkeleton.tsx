"use client";

import { motion } from "framer-motion";
import { Loader2, Sparkles, TrendingUp, MapPin, Database, Cpu, Bot } from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardSkeletonProps {
  crop?: string;
  district?: string;
}

const SKELETON_STEPS = [
  { text: "Connecting to Agmarknet live APMC data stream...", icon: Database },
  { text: "Calculating freight logistics & transport tariffs in Python...", icon: Cpu },
  { text: "Synthesizing bilingual executive summary & net margins...", icon: Bot },
];

export default function DashboardSkeleton({ crop, district }: DashboardSkeletonProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SKELETON_STEPS.length);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const CurrentIcon = SKELETON_STEPS[stepIndex].icon;

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Live Textual Micro-Step Indicator Banner */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <CurrentIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                LIVE EXECUTION PIPELINE
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-sm font-bold text-white mt-0.5">
              {SKELETON_STEPS[stepIndex].text}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Processing {crop || "Commodity"} {district ? `in ${district}` : ""}</span>
        </div>
      </motion.div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-emerald-950/20 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-24 bg-slate-800/80 rounded-md animate-pulse" />
              <div className="h-7 w-7 rounded-lg bg-slate-800/80 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-6 w-36 bg-slate-800/90 rounded-md animate-pulse" />
              <div className="h-3 w-20 bg-slate-800/60 rounded-md animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton (Terminal + Price Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        
        {/* Terminal Skeleton (Left 2 Cols) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-emerald-950/20 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 shadow-lg min-h-[460px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="h-4 w-40 bg-slate-800 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-800 rounded-full animate-pulse" />
            </div>
            <div className="space-y-3 mt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-16 bg-slate-800 rounded animate-pulse" />
                    <div className="h-2 w-12 bg-slate-800 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-full bg-slate-800/70 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="h-3 w-48 bg-slate-800/60 rounded mt-4 animate-pulse" />
        </div>

        {/* Price Table & Map Skeleton (Right 3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Table Skeleton */}
          <div className="bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-emerald-950/20 backdrop-blur-xl border border-emerald-500/20 rounded-2xl overflow-hidden shadow-lg p-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="h-4 w-52 bg-slate-800 rounded animate-pulse" />
                <div className="h-3 w-32 bg-slate-800/60 rounded animate-pulse" />
              </div>
              <div className="h-6 w-28 bg-slate-800/80 rounded-full animate-pulse" />
            </div>

            <div className="space-y-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 w-full bg-slate-900/60 border border-slate-800/70 rounded-xl p-3 flex items-center justify-between animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-slate-800" />
                    <div className="space-y-1">
                      <div className="h-3.5 w-32 bg-slate-800 rounded" />
                      <div className="h-2.5 w-20 bg-slate-800/60 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-20 bg-slate-800 rounded" />
                  <div className="h-4 w-20 bg-slate-800 rounded" />
                  <div className="h-4 w-20 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Map Skeleton */}
          <div className="bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-emerald-950/20 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5 shadow-lg flex flex-col items-center justify-center min-h-[220px] text-center">
            <div className="h-10 w-10 rounded-full bg-slate-800 animate-pulse mb-3" />
            <div className="h-4 w-44 bg-slate-800 rounded animate-pulse mb-2" />
            <div className="h-3 w-64 bg-slate-800/60 rounded animate-pulse" />
          </div>

        </div>

      </div>

    </div>
  );
}
