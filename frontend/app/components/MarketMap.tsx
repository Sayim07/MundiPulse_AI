"use client";

import { MapPin } from "lucide-react";
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
      <div className="bento-card h-full min-h-[280px] flex items-center justify-center">
        <p className="text-sm text-mp-text-muted px-6 text-center">
          Map appears after a live fetch finds a market in the selected area.
        </p>
      </div>
    );
  }

  return (
    <div className="bento-card p-0 overflow-hidden h-full min-h-[280px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-mp-border">
        <MapPin className="w-4 h-4 text-mp-cyan" />
        <div>
          <h3 className="text-sm font-semibold text-mp-text-primary">Market location</h3>
          <p className="text-[11px] text-mp-text-muted">
            {pinned.mandi_name} · {pinned.district}
          </p>
        </div>
      </div>
      <iframe
        title={`Map of ${pinned.mandi_name}`}
        src={pinned.maps_embed_url}
        className="w-full h-[240px] border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
