"use client";

import { motion } from "framer-motion";
import { TrendingUp, MapPin, Wheat, Award, Sparkles } from "lucide-react";

interface Recommendation {
  best_mandi: string;
  net_margin_per_quintal: number;
  reasoning_summary: string;
  confidence: string;
}

interface StatsCardsProps {
  recommendation: Recommendation | null;
  totalMandis: number;
  crop: string;
  district?: string;
}

/**
 * StatsCards — GovTech Executive KPI Dashboard Cards
 */
export default function StatsCards({
  recommendation,
  totalMandis,
  crop,
  district,
}: StatsCardsProps) {
  const stats = [
    {
      label: "RECOMMENDED APMC",
      value: recommendation?.best_mandi || "—",
      sublabel: recommendation
        ? `Base Location: ${district || "Selected District"} ➔ Optimal Regional Market Found: ${recommendation.best_mandi || "Regional APMC"}`
        : "Awaiting Query",
      icon: Award,
      color: "text-emerald-300",
      bgColor: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300",
      borderGlow: "border-emerald-500/40 shadow-emerald-950/40",
    },
    {
      label: "NET REALIZATION MARGIN",
      value: recommendation
        ? `₹${recommendation.net_margin_per_quintal.toLocaleString(undefined, { maximumFractionDigits: 0 })}/qtl`
        : "—",
      sublabel: recommendation ? "After Freight Deductions" : "Awaiting Calculation",
      icon: TrendingUp,
      color: "text-emerald-400 glow-emerald-text",
      bgColor: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400",
      borderGlow: "border-emerald-500/40 shadow-emerald-950/40",
    },
    {
      label: "REGIONAL APMCS SCANNED",
      value: totalMandis > 0 ? `${totalMandis} Markets` : "—",
      sublabel: totalMandis > 0 ? "Active Price Discoveries" : "Network Ready",
      icon: MapPin,
      color: "text-cyan-300",
      bgColor: "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300",
      borderGlow: "border-cyan-500/30 shadow-cyan-950/30",
    },
    {
      label: "TARGET COMMODITY",
      value: crop || "—",
      sublabel: "Agmarknet Live Grade",
      icon: Wheat,
      color: "text-amber-300",
      bgColor: "bg-amber-500/15 border border-amber-500/30 text-amber-300",
      borderGlow: "border-amber-500/30 shadow-amber-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          className="bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-emerald-950/25 backdrop-blur-xl border border-emerald-500/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:border-emerald-500/50 transition-all duration-300 rounded-2xl p-4 flex flex-col justify-between hover:scale-[1.02]"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: idx * 0.06 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
              {stat.label}
            </span>
            <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
              <stat.icon className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <span className={`text-xl font-black block truncate tabular-nums ${stat.color}`}>
              {stat.value}
            </span>
            <span className="text-[11px] text-slate-300 font-medium mt-0.5 block">
              {stat.sublabel}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

