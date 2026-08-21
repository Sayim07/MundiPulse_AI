"use client";

import { MapPin, Navigation, Radio } from "lucide-react";
import type { PriceRecord } from "./PriceTable";

interface MarketMapProps {
  records: PriceRecord[];
  bestMandi: string;
}

export default function MarketMap({ records, bestMandi }: MarketMapProps) {
  const pinned =
    records.find((r) => r.mandi_name === bestMandi && r.maps_embed_url) ||
    records.find((r) => r.maps_embed_url) ||
    records[0];

  if (!pinned?.maps_embed_url) {
    return (
      <div className="bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-emerald-950/20 backdrop-blur-xl border border-emerald-500/25 rounded-2xl min-h-[220px] flex flex-col items-center justify-center p-6 text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
        <div className="p-3 rounded-full bg-slate-900/80 border border-slate-700/80 mb-2.5 shadow-inner">
          <Navigation className="w-5 h-5 text-slate-400 stroke-1" />
        </div>
        <h4 className="text-xs font-bold text-slate-100">Geospatial APMC Map View</h4>
        <p className="text-[11px] text-slate-300 mt-1 max-w-xs leading-relaxed">
          Interactive map pinpointing the optimal APMC market will load upon price discovery.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-emerald-950/20 backdrop-blur-xl border border-emerald-500/25 rounded-2xl p-0 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:border-emerald-500/40 transition-all duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/15 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight">
              APMC Geospatial Positioning
            </h3>
            <p className="text-[10px] text-slate-300">
              {pinned.mandi_name} · {pinned.district}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>LIVE GEO-SAT</span>
        </div>
      </div>

      <iframe
        title={`Map of ${pinned.mandi_name}`}
        src={pinned.maps_embed_url}
        className="w-full h-[250px] border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

