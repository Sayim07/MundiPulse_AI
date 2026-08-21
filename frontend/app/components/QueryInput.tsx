"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Wheat, MapPin } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CatalogPick {
  crop: string;
  district: string;
  state: string;
  commodity_id: number;
  district_id: number;
  state_id: number;
  market_id?: number;
  market_name?: string;
}

interface QueryInputProps {
  onSubmit: (pick: CatalogPick) => void;
  isLoading: boolean;
}

interface CommodityHit {
  id: number;
  name: string;
}

interface MarketHit {
  id: number;
  name: string;
}

interface DistrictHit {
  id: number;
  name: string;
  state_id: number;
  state_name: string;
  label: string;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Searchable crop + district fields fed by live Agmarknet catalog APIs.
 */
export default function QueryInput({ onSubmit, isLoading }: QueryInputProps) {
  const [cropQuery, setCropQuery] = useState("");
  const [areaQuery, setAreaQuery] = useState("");
  const [cropHits, setCropHits] = useState<CommodityHit[]>([]);
  const [areaHits, setAreaHits] = useState<DistrictHit[]>([]);
  const [cropOpen, setCropOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [cropPick, setCropPick] = useState<CommodityHit | null>(null);
  const [areaPick, setAreaPick] = useState<DistrictHit | null>(null);
  const [markets, setMarkets] = useState<MarketHit[]>([]);
  const [marketPick, setMarketPick] = useState<MarketHit | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const cropDebounced = useDebounced(cropQuery, 250);
  const areaDebounced = useDebounced(areaQuery, 250);

  useEffect(() => {
    const q = cropDebounced.trim();
    if (q.length < 2) {
      setCropHits([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`${API_BASE}/api/catalog/commodities?q=${encodeURIComponent(q)}`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("commodity catalog failed");
        return r.json();
      })
      .then((data) => {
        setCatalogError("");
        setCropHits(data.items || []);
        setCropOpen(true);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setCatalogError("Could not load live commodities from Agmarknet.");
        setCropHits([]);
      });
    return () => ctrl.abort();
  }, [cropDebounced]);

  useEffect(() => {
    const q = areaDebounced.trim();
    if (q.length < 2) {
      setAreaHits([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`${API_BASE}/api/catalog/districts?q=${encodeURIComponent(q)}`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("district catalog failed");
        return r.json();
      })
      .then((data) => {
        setCatalogError("");
        setAreaHits(data.items || []);
        setAreaOpen(true);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setCatalogError("Could not load live districts from Agmarknet.");
        setAreaHits([]);
      });
    return () => ctrl.abort();
  }, [areaDebounced]);

  useEffect(() => {
    if (!areaPick) {
      setMarkets([]);
      setMarketPick(null);
      return;
    }
    const ctrl = new AbortController();
    fetch(`${API_BASE}/api/catalog/markets?district_id=${areaPick.id}`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("market catalog failed");
        return r.json();
      })
      .then((data) => {
        setMarkets(data.items || []);
        setMarketPick(null);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setCatalogError("Could not load live markets for this district.");
        setMarkets([]);
      });
    return () => ctrl.abort();
  }, [areaPick]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !cropPick || !areaPick || !areaPick.state_id) return;
    onSubmit({
      crop: cropPick.name,
      district: areaPick.name,
      state: areaPick.state_name || "West Bengal",
      commodity_id: cropPick.id,
      district_id: areaPick.id,
      state_id: areaPick.state_id,
      market_id: marketPick?.id,
      market_name: marketPick?.name,
    });
  };

  const ready = Boolean(cropPick && areaPick && !isLoading);

  return (
    <motion.section
      className="w-full max-w-3xl mx-auto px-6 py-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <form onSubmit={handleSubmit}>
        <div className="glass rounded-2xl p-1.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Wheat className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mp-emerald-400 pointer-events-none z-10" />
              <input
                id="crop-search"
                value={cropQuery}
                onChange={(e) => {
                  setCropQuery(e.target.value);
                  setCropPick(null);
                }}
                onFocus={() => cropHits.length && setCropOpen(true)}
                placeholder="Search crop (e.g. Mustard)"
                autoComplete="off"
                className="select-glow w-full pl-10 pr-3 py-3.5 rounded-xl text-sm bg-mp-bg-deep/80 text-white placeholder:text-slate-300"
                disabled={isLoading}
              />
              {cropOpen && cropHits.length > 0 && (
                <ul className="absolute z-30 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-mp-border bg-mp-bg-deep shadow-lg">
                  {cropHits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-mp-emerald-500/15 hover:text-mp-emerald-400"
                        onClick={() => {
                          setCropPick(hit);
                          setCropQuery(hit.name);
                          setCropOpen(false);
                        }}
                      >
                        {hit.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mp-cyan pointer-events-none z-10" />
              <input
                id="district-search"
                value={areaQuery}
                onChange={(e) => {
                  setAreaQuery(e.target.value);
                  setAreaPick(null);
                }}
                onFocus={() => areaHits.length && setAreaOpen(true)}
                placeholder="Search district (e.g. Nadia)"
                autoComplete="off"
                className="select-glow w-full pl-10 pr-3 py-3.5 rounded-xl text-sm bg-mp-bg-deep/80 text-white placeholder:text-slate-300"
                disabled={isLoading}
              />
              {areaOpen && areaHits.length > 0 && (
                <ul className="absolute z-30 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-mp-border bg-mp-bg-deep shadow-lg">
                  {areaHits.map((hit) => (
                    <li key={`${hit.state_id}-${hit.id}`}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-mp-cyan/15 hover:text-mp-cyan"
                        onClick={() => {
                          setAreaPick(hit);
                          setAreaQuery(hit.label);
                          setAreaOpen(false);
                        }}
                      >
                        {hit.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={!ready}
              className="btn-neon flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={ready ? { scale: 1.02 } : {}}
              whileTap={ready ? { scale: 0.98 } : {}}
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  <span>Agent Running...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Fetch Prices</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {areaPick && (
          <div className="px-1 pt-2">
            <label className="block text-[11px] text-slate-200 drop-shadow-md mb-1">
              Market in this area (optional — leave All to scan every APMC listed)
            </label>
            <select
              className="select-glow w-full px-3 py-2 rounded-xl text-sm bg-mp-bg-deep/80 text-white"
              value={marketPick?.id ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                setMarketPick(markets.find((m) => m.id === id) || null);
              }}
              disabled={isLoading}
            >
              <option value="">All listed markets in {areaPick.name}</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-200 drop-shadow-md mt-1">
              {markets.length} APMC(s) from Agmarknet for this district.
            </p>
          </div>
        )}

        <p className="text-center text-sm text-slate-200 drop-shadow-md font-medium mt-3">
          Type at least 2 letters and pick a live Agmarknet crop and district — the agent
          will compare prices across nearby mandis
        </p>
        {catalogError && (
          <p className="text-center text-xs text-mp-amber mt-1">{catalogError}</p>
        )}
      </form>
    </motion.section>
  );
}
