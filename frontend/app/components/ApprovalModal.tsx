"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  XCircle,
  Send,
  AlertTriangle,
  Globe,
  Languages,
  User,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Recommendation {
  best_mandi: string;
  net_margin_per_quintal: number;
  reasoning_summary: string;
  alert_bengali: string;
  alert_english: string;
  requires_approval: boolean;
  confidence: string;
}

interface SavedNumber {
  mobile: string;
  label: string;
}

interface ApprovalModalProps {
  isOpen: boolean;
  recommendation: Recommendation | null;
  onApprove: (recipients: string[]) => void;
  onReject: () => void;
  isApproving: boolean;
  region?: string;
}

export default function ApprovalModal({
  isOpen,
  recommendation,
  onApprove,
  onReject,
  isApproving,
  region,
}: ApprovalModalProps) {
  const [showBengali, setShowBengali] = useState(false);
  const [saved, setSaved] = useState<SavedNumber[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetch(`${API_BASE}/api/recipients`)
      .then((r) => r.json())
      .then((data) => {
        const items: SavedNumber[] = data.items || [];
        setSaved(items);
        setSelected(items.map((i) => i.mobile));
      })
      .catch(() => undefined);
  }, [isOpen]);

  if (!recommendation) return null;

  const addNumber = async () => {
    setPhoneError("");
    try {
      const response = await fetch(`${API_BASE}/api/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: draft, label: draftLabel }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Could not save number"
        );
      }
      const items: SavedNumber[] = data.items || [];
      setSaved(items);
      const added = data.item?.mobile;
      if (added && !selected.includes(added)) {
        setSelected([...selected, added]);
      }
      setDraft("");
      setDraftLabel("");
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Invalid number");
    }
  };

  const toggle = (mobile: string) => {
    setSelected((prev) =>
      prev.includes(mobile) ? prev.filter((n) => n !== mobile) : [...prev, mobile]
    );
  };

  const canSend = selected.length > 0 && !isApproving;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="glass-modal rounded-3xl p-0 max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-xl bg-mp-amber/10">
                  <Shield className="w-5 h-5 text-mp-amber" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-mp-text-primary">
                    Human-in-the-Loop Approval
                  </h2>
                  <p className="text-xs text-mp-text-muted">
                    Sending to: <strong className="text-mp-emerald-400">Farmer Group {region || "Selected Region"}</strong> via SMS + WhatsApp
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-6 mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-mp-amber/5 border border-mp-amber/15">
              <AlertTriangle className="w-4 h-4 text-mp-amber flex-shrink-0 mt-0.5" />
              <p className="text-xs text-mp-amber/80 leading-relaxed">
                <strong>Responsible AI Guardrail:</strong> Both SMS and WhatsApp
                are sent only after you approve. Demo mode routes all messages
                to the verified hackathon number for safety.
              </p>
            </div>

            <div className="mx-6 mb-4 px-4 py-3 rounded-xl bg-mp-bg-deep/60 border border-mp-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mp-text-muted">
                  Best Mandi
                </span>
                <span
                  className={`badge-${recommendation.confidence === "high" ? "emerald" : "amber"} text-[9px]`}
                >
                  {recommendation.confidence.toUpperCase()} CONFIDENCE
                </span>
              </div>
              <p className="text-base font-bold text-mp-emerald-400 mb-1">
                {recommendation.best_mandi}
              </p>
              <p className="text-xs text-mp-text-muted leading-relaxed">
                {recommendation.reasoning_summary}
              </p>
            </div>

            <div className="mx-6 mb-3 flex gap-2">
              <button
                onClick={() => setShowBengali(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !showBengali
                    ? "bg-mp-emerald-500/15 text-mp-emerald-400 border border-mp-emerald-500/30"
                    : "text-mp-text-muted hover:text-mp-text-secondary"
                }`}
              >
                <Globe className="w-3 h-3" />
                English
              </button>
              <button
                onClick={() => setShowBengali(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  showBengali
                    ? "bg-mp-emerald-500/15 text-mp-emerald-400 border border-mp-emerald-500/30"
                    : "text-mp-text-muted hover:text-mp-text-secondary"
                }`}
              >
                <Languages className="w-3 h-3" />
                বাংলা
              </button>
            </div>

            <div className="mx-6 mb-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={showBengali ? "bn" : "en"}
                  className="px-4 py-3 rounded-xl bg-mp-bg-deepest/80 border border-mp-border max-h-40 overflow-y-auto"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <pre className="text-xs text-mp-text-secondary whitespace-pre-wrap leading-relaxed font-[var(--mp-font-sans)]">
                    {showBengali
                      ? recommendation.alert_bengali
                      : recommendation.alert_english}
                  </pre>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mx-6 mb-5 space-y-2">
              <div className="flex items-center gap-2 text-xs text-mp-text-muted">
                <User className="w-3.5 h-3.5" />
                <span>Recipients (Indian 10-digit mobiles)</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="9876543210"
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-mp-bg-deep border border-mp-border text-mp-text-primary"
                />
                <input
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  placeholder="Label"
                  className="w-24 px-3 py-2 rounded-lg text-sm bg-mp-bg-deep border border-mp-border text-mp-text-primary"
                />
                <button
                  type="button"
                  onClick={addNumber}
                  className="px-3 py-2 rounded-lg text-xs border border-mp-border text-mp-text-secondary hover:text-mp-emerald-400"
                >
                  Add
                </button>
              </div>
              {phoneError && <p className="text-[11px] text-mp-amber">{phoneError}</p>}
              <ul className="max-h-28 overflow-y-auto space-y-1">
                {saved.map((row) => (
                  <li key={row.mobile} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.mobile)}
                      onChange={() => toggle(row.mobile)}
                    />
                    <span className="text-mp-text-primary">{row.mobile}</span>
                    {row.label && (
                      <span className="text-mp-text-muted">({row.label})</span>
                    )}
                  </li>
                ))}
              </ul>
              {saved.length === 0 && (
                <p className="text-[11px] text-mp-text-muted">
                  Add at least one number. Nothing is hardcoded.
                </p>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <motion.button
                onClick={onReject}
                disabled={isApproving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-mp-border text-sm font-medium text-mp-text-secondary hover:bg-mp-bg-elevated/50 hover:text-mp-red transition-all disabled:opacity-40"
                whileHover={!isApproving ? { scale: 1.01 } : {}}
                whileTap={!isApproving ? { scale: 0.99 } : {}}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </motion.button>
              <motion.button
                onClick={() => onApprove(selected)}
                disabled={!canSend}
                className="flex-[2] btn-neon flex items-center justify-center gap-2 py-3 rounded-xl text-sm disabled:opacity-60"
                whileHover={canSend ? { scale: 1.01 } : {}}
                whileTap={canSend ? { scale: 0.99 } : {}}
              >
                {isApproving ? (
                  <>
                    <div className="spinner" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Approve & Send SMS</span>
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
