"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, Plus, Trash2, Users, ChevronDown, Wheat } from "lucide-react";
import {
  OFFICER_AUTH_EVENT,
  authHeaders,
  getOfficer,
  getToken,
  officerLocation,
  type OfficerProfile,
} from "@/lib/officerAuth";
import { apiError, getApiBase } from "@/lib/apiBase";

type FarmerRow = {
  mobile: string;
  label?: string;
  crop?: string;
  district?: string;
  address?: string;
};

export default function FarmerRegistry() {
  const [officer, setOfficer] = useState<OfficerProfile | null>(null);
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState<FarmerRow[]>([]);
  const [mobile, setMobile] = useState("");
  const [label, setLabel] = useState("");
  const [crop, setCrop] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const location = officerLocation(officer);

  useEffect(() => {
    const sync = () => setOfficer(getOfficer());
    sync();
    window.addEventListener(OFFICER_AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(OFFICER_AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!officer || !getToken()) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`${getApiBase()}/api/recipients`, {
      headers: { ...authHeaders() },
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(apiError(data.detail, "Could not load farmer registry."));
        setItems(data.items || []);
        setError("");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load farmer registry.");
      });
    return () => ctrl.abort();
  }, [officer]);

  const refresh = async () => {
    const r = await fetch(`${getApiBase()}/api/recipients`, { headers: { ...authHeaders() } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(apiError(data.detail, "Could not load farmer registry."));
    setItems(data.items || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officer) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`${getApiBase()}/api/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ mobile, label, crop }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(apiError(data.detail, "Could not add farmer."));
      setItems(data.items || []);
      setMobile("");
      setLabel("");
      setCrop("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add farmer.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (number: string) => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`${getApiBase()}/api/recipients/${encodeURIComponent(number)}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(apiError(data.detail, "Could not remove farmer."));
      setItems(data.items || []);
      await refresh().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove farmer.");
    } finally {
      setBusy(false);
    }
  };

  if (!officer) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-2">
      <div className="rounded-2xl bg-slate-900/85 border border-emerald-500/30 backdrop-blur-xl overflow-hidden shadow-xl shadow-emerald-950/20">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-white">
            <Users className="w-4 h-4 text-emerald-400" />
            Farmer registry
            {location ? (
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full max-w-[220px] truncate">
                {location}
              </span>
            ) : null}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
                <p className="text-[11px] text-slate-400 pt-3 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  Contacts are stored for {officer.email}
                  {location ? ` · ${location}` : ""}.
                </p>

                <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Farmer mobile (10 digit)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                    inputMode="numeric"
                  />
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Name / label (optional)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <input
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    placeholder="Crop / need"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="submit"
                    disabled={busy || !mobile.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </form>

                {error && <p className="text-[11px] text-amber-300 font-medium">{error}</p>}

                {items.length === 0 ? (
                  <p className="text-[11px] text-slate-500">No farmers in your registry yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {items.map((row) => (
                      <li
                        key={row.mobile}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="font-mono text-xs text-slate-100">{row.mobile}</span>
                          {row.label ? (
                            <span className="text-[11px] text-slate-400 truncate">{row.label}</span>
                          ) : null}
                          {row.crop ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                              <Wheat className="w-2.5 h-2.5" />
                              {row.crop}
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(row.mobile)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-950/40 disabled:opacity-40"
                          aria-label={`Remove ${row.mobile}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
