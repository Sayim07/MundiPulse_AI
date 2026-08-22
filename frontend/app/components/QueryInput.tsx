"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Wheat, MapPin, Building2, Sparkles, ChevronRight, X } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://krishidrishti-ai-jtp6.onrender.com";

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
  /** Officer address shown as a hint only — never treated as a catalog district_id. */
  homeDistrictHint?: string;
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
 * Unified Glassmorphic Search Header — Executive Command Bar
 * Connects directly to live Agmarknet catalog APIs.
 */
export default function QueryInput({ onSubmit, isLoading, homeDistrictHint = "" }: QueryInputProps) {
  const [cropQuery, setCropQuery] = useState("");
  const [areaQuery, setAreaQuery] = useState("");
  const [hintApplied, setHintApplied] = useState(false);
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
    if (hintApplied || areaPick || !homeDistrictHint.trim()) return;
    setAreaQuery(homeDistrictHint.trim());
    setHintApplied(true);
  }, [homeDistrictHint, areaPick, hintApplied]);

  useEffect(() => {
    const q = cropDebounced.trim();
    if (q.length < 2) return;

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
    if (q.length < 2) return;

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
    if (!areaPick) return;

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
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <form onSubmit={handleSubmit}>
        {/* Floating Command-Bar Container */}
        <div className="bg-slate-900/85 backdrop-blur-xl border border-emerald-500/40 shadow-2xl shadow-emerald-950/40 rounded-2xl p-4 relative">
          
          {/* Top subtle badge header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Official APMC Real-Time Intelligence Search
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium">Agmarknet Verified Source</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            {/* Field 1: Commodity / Crop Search */}
            <div className="md:col-span-4 relative">
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none z-10">
                  <Wheat className={`w-4 h-4 transition-colors ${cropPick ? "text-emerald-400" : "text-slate-300"}`} />
                </div>
                <input
                  id="crop-search"
                  value={cropQuery}
                  onChange={(e) => {
                    setCropQuery(e.target.value);
                    setCropPick(null);
                  }}
                  onFocus={() => cropHits.length > 0 && setCropOpen(true)}
                  placeholder="Target Crop (e.g. Mustard, Paddy)"
                  autoComplete="off"
                  className={`w-full pl-10 pr-8 py-3 rounded-xl text-sm font-medium transition-all duration-200 outline-none
                    ${cropPick 
                      ? "bg-slate-950/75 border border-emerald-500/60 text-emerald-200 shadow-inner" 
                      : "bg-slate-950/50 border border-slate-700/80 text-white placeholder:text-slate-300 focus:border-emerald-400 focus:bg-slate-950/70"}`}
                  disabled={isLoading}
                />
                {cropPick && (
                  <button
                    type="button"
                    onClick={() => {
                      setCropPick(null);
                      setCropQuery("");
                    }}
                    className="absolute right-3 p-1 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Crop Autocomplete Dropdown */}
              <AnimatePresence>
                {cropOpen && cropHits.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-40 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-emerald-500/40 bg-slate-950/90 backdrop-blur-2xl shadow-2xl divide-y divide-slate-800/80"
                  >
                    {cropHits.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3.5 py-2.5 text-sm text-slate-100 hover:bg-emerald-500/25 hover:text-emerald-300 transition-colors flex items-center justify-between"
                          onClick={() => {
                            setCropPick(hit);
                            setCropQuery(hit.name);
                            setCropOpen(false);
                          }}
                        >
                          <span className="font-semibold">{hit.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Field 2: District Search */}
            <div className="md:col-span-5 relative">
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none z-10">
                  <MapPin className={`w-4 h-4 transition-colors ${areaPick ? "text-cyan-400" : "text-slate-300"}`} />
                </div>
                <input
                  id="district-search"
                  value={areaQuery}
                  onChange={(e) => {
                    setAreaQuery(e.target.value);
                    setAreaPick(null);
                  }}
                  onFocus={() => areaHits.length > 0 && setAreaOpen(true)}
                  placeholder={
                    homeDistrictHint
                      ? `Pick live district (hint: ${homeDistrictHint})`
                      : "Home District (e.g. Nadia, Hooghly)"
                  }
                  autoComplete="off"
                  className={`w-full pl-10 pr-8 py-3 rounded-xl text-sm font-medium transition-all duration-200 outline-none
                    ${areaPick 
                      ? "bg-slate-950/75 border border-cyan-500/60 text-cyan-200 shadow-inner" 
                      : "bg-slate-950/50 border border-slate-700/80 text-white placeholder:text-slate-300 focus:border-cyan-400 focus:bg-slate-950/70"}`}
                  disabled={isLoading}
                />
                {areaPick && (
                  <button
                    type="button"
                    onClick={() => {
                      setAreaPick(null);
                      setAreaQuery("");
                    }}
                    className="absolute right-3 p-1 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* District Autocomplete Dropdown */}
              <AnimatePresence>
                {areaOpen && areaHits.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-40 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-cyan-500/40 bg-slate-950/90 backdrop-blur-2xl shadow-2xl divide-y divide-slate-800/80"
                  >
                    {areaHits.map((hit) => (
                      <li key={`${hit.state_id}-${hit.id}`}>
                        <button
                          type="button"
                          className="w-full text-left px-3.5 py-2.5 text-sm text-slate-100 hover:bg-cyan-500/25 hover:text-cyan-300 transition-colors flex items-center justify-between"
                          onClick={() => {
                            setAreaPick(hit);
                            setAreaQuery(hit.label);
                            setAreaOpen(false);
                          }}
                        >
                          <span className="font-semibold">{hit.label}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                            {hit.state_name || "WB"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Field 3: Action Trigger Button */}
            <div className="md:col-span-3">
              <motion.button
                type="submit"
                disabled={!ready}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold px-5 py-3 rounded-xl text-sm shadow-xl shadow-emerald-950/60 border border-emerald-400/50 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                whileHover={ready ? { scale: 1.02, boxShadow: "0 0 25px rgba(16, 185, 129, 0.45)" } : {}}
                whileTap={ready ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner" />
                    <span className="tracking-wide">Analyzing APMCs...</span>
                  </div>
                ) : (
                  <>
                    <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="tracking-wide font-bold">Fetch Prices</span>
                  </>
                )}
              </motion.button>
            </div>

          </div>

          {/* Optional Market Filter (if District selected) */}
          <AnimatePresence>
            {areaPick && markets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs"
              >
                <div className="flex items-center gap-1.5 text-slate-400 whitespace-nowrap">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Specific Mandi Focus:</span>
                </div>
                <select
                  className="bg-slate-950/80 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/50 flex-1 w-full sm:w-auto"
                  value={marketPick?.id ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setMarketPick(markets.find((m) => m.id === id) || null);
                  }}
                  disabled={isLoading}
                >
                  <option value="">Scan all APMC Mandis in {areaPick.name} ({markets.length} available)</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} APMC
                    </option>
                  ))}
                </select>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Instructions / Status bar */}
        <div className="flex items-center justify-center gap-2 mt-2.5">
          <p className="text-center text-xs text-slate-300 drop-shadow font-medium">
            Search live Agmarknet commodities & districts to Fetch. Officer address is a hint only — pick a catalog district.
          </p>
        </div>

        {catalogError && (
          <p className="text-center text-xs font-semibold text-amber-400 mt-1.5 bg-amber-500/10 py-1 px-3 rounded-lg border border-amber-500/20 max-w-md mx-auto">
            {catalogError}
          </p>
        )}
      </form>
    </motion.section>
  );
}

