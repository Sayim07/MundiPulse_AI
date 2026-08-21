"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  MapPin,
  Sparkles,
  Award,
  ArrowUpRight,
} from "lucide-react";

export interface PriceRecord {
  mandi_name: string;
  district: string;
  crop: string;
  variety: string;
  modal_price_per_quintal: number;
  min_price: number;
  max_price: number;
  date: string;
  source_portal: string;
  distance_km: number | null;
  transport_cost_per_quintal: number | null;
  latitude?: number | null;
  longitude?: number | null;
  maps_url?: string | null;
  maps_embed_url?: string | null;
}

interface PriceTableProps {
  records: PriceRecord[];
  bestMandi: string;
}

/**
 * Premium Mandi Price Comparison Table — Executive Data Grid
 * Formats market prices, freight deductions, and net realization margins.
 */
export default function PriceTable({ records, bestMandi }: PriceTableProps) {
  if (records.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-emerald-950/20 backdrop-blur-xl border border-emerald-500/25 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[220px] text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
        <div className="p-3 rounded-full bg-slate-900/80 border border-slate-700/80 mb-3 shadow-inner">
          <TrendingUp className="w-6 h-6 text-slate-400 stroke-1" />
        </div>
        <h4 className="text-sm font-bold text-slate-100">Price Intelligence Awaiting Query</h4>
        <p className="text-xs text-slate-300 mt-1 max-w-sm leading-relaxed">
          Run a commodity and district search above to generate the regional APMC price comparison matrix.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-emerald-950/20 backdrop-blur-xl border border-emerald-500/25 rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:border-emerald-500/40 transition-all duration-300">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-500/15 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Regional Mandi Price Comparison Matrix
            </h3>
            <p className="text-[11px] text-slate-300">
              Live APMC prices adjusted for transport logistics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            {records.length} MANDIS ANALYZED
          </span>
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr className="bg-slate-900/60 backdrop-blur-md">
              <th className="w-8 text-center text-slate-300">RANK</th>
              <th className="text-slate-300">MARKET NAME</th>
              <th className="text-slate-300">LOCATION</th>
              <th className="text-slate-300">MODAL PRICE</th>
              <th className="text-slate-300">FREIGHT COST</th>
              <th className="text-slate-300">NET MARGIN</th>
              <th className="text-slate-300">SOURCE</th>
              <th className="text-right pr-4 text-slate-300">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => {
              const isBest = record.mandi_name === bestMandi;
              const transport = record.transport_cost_per_quintal || 0;
              const net = record.modal_price_per_quintal - transport;
              const isLocal = record.distance_km === 0;

              return (
                <motion.tr
                  key={record.mandi_name}
                  className={`group ${
                    isBest
                      ? "bg-emerald-950/30 border-l-4 border-l-emerald-400 !hover:bg-emerald-950/40"
                      : ""
                  }`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                >
                  {/* Rank / Top badge */}
                  <td className="text-center font-mono text-xs">
                    {isBest ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-sm shadow-emerald-500/30">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <span className="text-slate-500 font-medium">#{idx + 1}</span>
                    )}
                  </td>

                  {/* Market Name */}
                  <td>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold ${
                            isBest ? "text-emerald-300 drop-shadow-sm" : "text-slate-100"
                          }`}
                        >
                          {record.mandi_name}
                        </span>
                        {isBest && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                            <Sparkles className="w-2.5 h-2.5" />
                            TOP NET MARGIN
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {record.crop} {record.variety && `· ${record.variety}`}
                      </span>
                    </div>
                  </td>

                  {/* Location */}
                  <td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="font-medium">{record.district}</span>
                      {isLocal && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
                          HOME APMC
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Modal Price */}
                  <td>
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            isBest ? "text-emerald-300" : "text-slate-100"
                          }`}
                        >
                          ₹{record.modal_price_per_quintal.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          /qtl
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Range: ₹{record.min_price} - ₹{record.max_price}
                      </span>
                    </div>
                  </td>

                  {/* Freight Cost */}
                  <td>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold tabular-nums text-amber-400">
                        {transport > 0 ? `-₹${transport.toLocaleString()}` : "₹0 (Local)"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {record.distance_km != null ? `${record.distance_km} km distance` : "Local area"}
                      </span>
                    </div>
                  </td>

                  {/* Net Margin */}
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-base font-extrabold tabular-nums ${
                          isBest
                            ? "text-emerald-400 glow-emerald-text"
                            : "text-slate-100"
                        }`}
                      >
                        ₹{net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        /qtl
                      </span>
                    </div>
                  </td>

                  {/* Source */}
                  <td>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        record.source_portal === "e-NAM"
                          ? "bg-cyan-950/70 text-cyan-300 border border-cyan-500/30"
                          : "bg-emerald-950/70 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {record.source_portal}
                    </span>
                  </td>

                  {/* Action / Map */}
                  <td className="text-right pr-4">
                    {record.maps_url ? (
                      <a
                        href={record.maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-1.5 rounded-lg transition-all"
                      >
                        <span>Directions</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Footer Disclaimer */}
      <div className="px-5 py-2.5 bg-slate-900/40 border-t border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[10px] text-slate-400">
        <span>Freight formula derived from standard regional transport tariff matrix per quintal/km.</span>
        <span>Agmarknet Official API Synchronized</span>
      </div>
    </div>
  );
}

