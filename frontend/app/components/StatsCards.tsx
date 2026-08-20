"use client";

import { motion } from "framer-motion";
import { TrendingUp, MapPin, Truck, Award } from "lucide-react";

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
}

/**
 * StatsCards — Bento grid stat cards showing key metrics from the analysis.
 */
export default function StatsCards({
  recommendation,
  totalMandis,
  crop,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Best Mandi",
      value: recommendation?.best_mandi || "—",
      icon: Award,
      color: "text-mp-emerald-400",
      bgColor: "bg-mp-emerald-500/10",
    },
    {
      label: "Net Margin",
      value: recommendation
        ? `₹${recommendation.net_margin_per_quintal.toLocaleString(undefined, { maximumFractionDigits: 0 })}/qtl`
        : "—",
      icon: TrendingUp,
      color: "text-mp-emerald-neon",
      bgColor: "bg-mp-emerald-neon/10",
    },
    {
      label: "Mandis Compared",
      value: totalMandis > 0 ? `${totalMandis} mandis` : "—",
      icon: MapPin,
      color: "text-mp-cyan",
      bgColor: "bg-mp-cyan/10",
    },
    {
      label: "Commodity",
      value: crop || "—",
      icon: Truck,
      color: "text-mp-amber",
      bgColor: "bg-mp-amber/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          className="bento-card flex flex-col gap-2 py-4 px-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.08 }}
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-mp-text-muted">
              {stat.label}
            </span>
          </div>
          <span className={`text-lg font-bold ${stat.color} tabular-nums`}>
            {stat.value}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
