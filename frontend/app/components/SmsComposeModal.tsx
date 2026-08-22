"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Languages,
  Lock,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { authHeaders, getOfficer, officerLocation } from "@/lib/officerAuth";
import { apiError, getApiBase } from "@/lib/apiBase";

export interface SmsRecommendation {
  best_mandi: string;
  net_margin_per_quintal: number;
  reasoning_summary: string;
  alert_bengali: string;
  alert_english: string;
  requires_approval: boolean;
  confidence: string;
  home_mandi?: string | null;
  home_net_price_per_quintal?: number | null;
}

type FarmerRow = {
  mobile: string;
  label?: string;
  crop?: string;
};

interface SmsComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string | null;
  crop: string;
  recommendation: SmsRecommendation | null;
}

function inr(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function cropMatches(farmerCrop: string | undefined, queryCrop: string) {
  const a = (farmerCrop || "").trim().toLowerCase();
  const b = (queryCrop || "").trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function buildSmsBody(
  rec: SmsRecommendation,
  bengali: boolean,
  crop: string,
): string {
  const officer = getOfficer();
  const name = (officer?.name || "Officer").trim();
  const email = officer?.email || "";
  const location = officerLocation(officer);
  const alert = bengali ? rec.alert_bengali : rec.alert_english;
  const homeBits = [
    rec.home_mandi ? rec.home_mandi : "",
    rec.home_net_price_per_quintal != null
      ? `${inr(rec.home_net_price_per_quintal)}/qtl`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const lines = [
    "KrishiDrishti AI",
    `Officer: ${name}${email ? ` <${email}>` : ""}`,
    location ? `Officer address: ${location}` : "",
    crop ? `Crop / need: ${crop}` : "",
    `Best mandi: ${rec.best_mandi}`,
    `Net ₹/quintal: ${inr(rec.net_margin_per_quintal)}`,
    homeBits ? `Home comparison: ${homeBits}` : "",
    "",
    alert,
    "",
    "— KrishiDrishti AI",
  ];
  return lines.filter((line, i) => line !== "" || i === 7).join("\n");
}

export default function SmsComposeModal({
  isOpen,
  onClose,
  runId,
  crop,
  recommendation,
}: SmsComposeModalProps) {
  const [showBengali, setShowBengali] = useState(false);
  const [message, setMessage] = useState("");
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentNote, setSentNote] = useState("");

  useEffect(() => {
    if (!isOpen || !recommendation) return;
    setShowBengali(false);
    setMessage(buildSmsBody(recommendation, false, crop));
    setError("");
    setSentNote("");
    setSelected([]);
  }, [isOpen, recommendation, crop]);

  useEffect(() => {
    if (!isOpen) return;
    const ctrl = new AbortController();
    fetch(`${getApiBase()}/api/recipients`, {
      headers: { ...authHeaders() },
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(apiError(data.detail, "Could not load farmer mobiles.", r.status));
        const items = (data.items || []) as FarmerRow[];
        setFarmers(items);
        const preferred = items.filter((row) => cropMatches(row.crop, crop)).map((r) => r.mobile);
        setSelected(preferred.length ? preferred : []);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load farmer mobiles.");
      });
    return () => ctrl.abort();
  }, [isOpen, crop]);

  const applyLang = (bengali: boolean) => {
    setShowBengali(bengali);
    if (recommendation) setMessage(buildSmsBody(recommendation, bengali, crop));
  };

  const sortedFarmers = useMemo(() => {
    return [...farmers].sort((a, b) => {
      const am = cropMatches(a.crop, crop) ? 0 : 1;
      const bm = cropMatches(b.crop, crop) ? 0 : 1;
      return am - bm;
    });
  }, [farmers, crop]);

  const toggle = (mobile: string) => {
    setSelected((prev) =>
      prev.includes(mobile) ? prev.filter((m) => m !== mobile) : [...prev, mobile]
    );
  };

  const selectAll = () => setSelected(sortedFarmers.map((f) => f.mobile));
  const selectMatching = () =>
    setSelected(sortedFarmers.filter((f) => cropMatches(f.crop, crop)).map((f) => f.mobile));

  const handleSend = async () => {
    if (!runId) {
      setError("No run_id. Fetch prices again before sending SMS.");
      return;
    }
    if (!selected.length) {
      setError("Select at least one farmer mobile.");
      return;
    }
    setBusy(true);
    setError("");
    setSentNote("");
    try {
      const r = await fetch(`${getApiBase()}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          run_id: runId,
          mobiles: selected,
          message,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(apiError(data.detail, "Could not send SMS.", r.status));
      }
      setSentNote(
        `SMS sent via ${data.provider || "provider"} to ${data.count ?? selected.length} number(s). Email dispatch still available.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send SMS.");
    } finally {
      setBusy(false);
    }
  };

  if (!recommendation) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="bg-slate-950/95 border border-cyan-500/40 backdrop-blur-2xl rounded-3xl p-0 max-w-xl w-full mx-4 overflow-hidden shadow-2xl shadow-emerald-950/70 max-h-[92vh] flex flex-col"
            initial={{ opacity: 0, scale: 0.94, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 25 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-slate-950 px-6 py-4 border-b border-cyan-500/25 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      HITL SMS
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">IN-APP COMPOSE</span>
                  </div>
                  <h2 className="text-base font-extrabold text-slate-100 mt-0.5">
                    Send farmer SMS from KrishiDrishti AI
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close SMS compose"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <Lock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Message is composed in-app (not the device SMS app). Numbers come from Python margins. Email HITL is unchanged.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Recipients (your registry)
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={selectMatching}
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                  >
                    Matching crop
                  </button>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Select all
                  </button>
                </div>
              </div>

              {sortedFarmers.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  No farmer mobiles in your registry. Add them on the dashboard, then return here.
                </p>
              ) : (
                <ul className="max-h-36 overflow-y-auto space-y-1.5">
                  {sortedFarmers.map((row) => {
                    const match = cropMatches(row.crop, crop);
                    const on = selected.includes(row.mobile);
                    return (
                      <li key={row.mobile}>
                        <label
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer ${
                            on
                              ? "bg-cyan-950/40 border-cyan-500/40"
                              : "bg-slate-950/80 border-slate-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(row.mobile)}
                            className="accent-cyan-500"
                          />
                          <Phone className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-mono text-xs text-slate-100">{row.mobile}</span>
                          {row.label ? (
                            <span className="text-[11px] text-slate-400 truncate">{row.label}</span>
                          ) : null}
                          {row.crop ? (
                            <span
                              className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full border ${
                                match
                                  ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                                  : "text-slate-400 border-slate-700"
                              }`}
                            >
                              {row.crop}
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Message
                </span>
                <div className="flex gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => applyLang(false)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                      !showBengali
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => applyLang(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                      showBengali
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Languages className="w-3 h-3" />
                    বাংলা
                  </button>
                </div>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans resize-none focus:outline-none focus:border-cyan-500/40"
              />

              {error && <p className="text-[11px] text-amber-300 font-medium">{error}</p>}
              {sentNote && (
                <p className="text-[11px] text-emerald-300 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {sentNote}
                </p>
              )}
            </div>

            <div className="p-6 pt-3 bg-slate-900/60 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-5 py-3 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
              <motion.button
                type="button"
                onClick={handleSend}
                disabled={busy}
                className="flex-[2] bg-gradient-to-r from-cyan-600 via-cyan-500 to-teal-500 text-white font-extrabold px-6 py-3.5 rounded-xl text-sm shadow-xl border border-cyan-400/40 flex items-center justify-center gap-2 disabled:opacity-50"
                whileHover={!busy ? { scale: 1.02 } : {}}
                whileTap={!busy ? { scale: 0.98 } : {}}
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner" />
                    Sending SMS…
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send SMS
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
