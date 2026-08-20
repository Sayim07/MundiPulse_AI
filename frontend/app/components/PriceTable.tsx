"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  ExternalLink,
  Trophy,
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
}

interface PriceTableProps {
  records: PriceRecord[];
  bestMandi: string;
}

/**
 * PriceTable — Clean data table comparing mandi prices.
 * Highlights the best mandi row with a green glow.
 * Shows transport cost and net margin calculations.
 */
export default function PriceTable({ records, bestMandi }: PriceTableProps) {
  if (records.length === 0) {
    return (
      <div className="bento-card flex items-center justify-center h-full">
        <p className="text-sm text-mp-text-muted">
          Price data will appear here after running a query.
        </p>
      </div>
    );
  }

  return (
    <div className="bento-card p-0 overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-mp-border">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-mp-emerald-500/10">
            <TrendingUp className="w-4 h-4 text-mp-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-mp-text-primary">
            Mandi Price Comparison
          </h3>
        </div>
        <span className="badge-emerald text-[10px]">
          {records.length} MANDIS
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Mandi</th>
              <th>Modal Price</th>
              <th>Range</th>
              <th>Distance</th>
              <th>Transport</th>
              <th>Net Margin</th>
              <th>Source</th>
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
                  className={
                    isBest
                      ? "bg-mp-emerald-neon/5 border-l-2 border-l-mp-emerald-neon"
                      : ""
                  }
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.08 }}
                >
                  <td className="w-8 text-center">
                    {isBest && (
                      <Trophy className="w-4 h-4 text-mp-emerald-neon mx-auto" />
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div>
                        <div
                          className={`text-sm font-medium ${isBest ? "text-mp-emerald-400" : "text-mp-text-primary"}`}
                        >
                          {record.mandi_name}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-mp-text-muted">
                          <MapPin className="w-3 h-3" />
                          {record.district}
                          {isLocal && (
                            <span className="ml-1 text-mp-cyan text-[9px] font-bold uppercase">
                              (Local)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`text-sm font-semibold tabular-nums ${isBest ? "text-mp-emerald-neon" : "text-mp-text-primary"}`}
                    >
                      ₹{record.modal_price_per_quintal.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-mp-text-muted ml-1">
                      /qtl
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-mp-text-muted tabular-nums">
                      ₹{record.min_price.toLocaleString()} – ₹
                      {record.max_price.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm tabular-nums text-mp-text-secondary">
                      {record.distance_km != null
                        ? `${record.distance_km} km`
                        : "—"}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm tabular-nums text-mp-amber">
                      {transport > 0
                        ? `₹${transport.toLocaleString()}`
                        : "—"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`text-sm font-bold tabular-nums ${isBest ? "text-mp-emerald-neon glow-emerald-text" : "text-mp-text-primary"}`}
                    >
                      ₹{net.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        record.source_portal === "e-NAM"
                          ? "bg-mp-cyan/10 text-mp-cyan"
                          : "bg-mp-amber/10 text-mp-amber"
                      }`}
                    >
                      {record.source_portal}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
