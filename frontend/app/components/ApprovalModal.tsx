"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  XCircle,
  Send,
  Globe,
  Languages,
  Mail,
  Lock,
  FileCheck2,
  CheckCircle2,
} from "lucide-react";

interface Recommendation {
  best_mandi: string;
  net_margin_per_quintal: number;
  reasoning_summary: string;
  alert_bengali: string;
  alert_english: string;
  requires_approval: boolean;
  confidence: string;
}

interface ApprovalModalProps {
  isOpen: boolean;
  recommendation: Recommendation | null;
  onApprove: (messageText: string) => void;
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

  if (!recommendation) return null;

  const currentMessage = showBengali
    ? recommendation.alert_bengali
    : recommendation.alert_english;

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
            className="bg-slate-950/95 border border-emerald-500/40 backdrop-blur-2xl rounded-3xl p-0 max-w-xl w-full mx-4 overflow-hidden shadow-2xl shadow-emerald-950/70 max-h-[92vh] flex flex-col"
            initial={{ opacity: 0, scale: 0.94, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 25 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            {/* Security Top Bar */}
            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-slate-950 px-6 py-4 border-b border-emerald-500/25 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ACTION REQUIRED
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      PROTOCOL: HITL-SEC-V4
                    </span>
                  </div>
                  <h2 className="text-base font-extrabold text-slate-100 mt-0.5">
                    Executive Arbitrage Dispatch Authorization
                  </h2>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>GovTech Gate</span>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 font-sans">
              
              {/* Region & Policy Notice */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <FileCheck2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">
                    Jurisdiction: <span className="text-emerald-300">{region || "Regional Mandi Network"}</span>
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                    Under the Responsible AI Framework, outward dissemination of price intelligence requires explicit sign-off by an authorized administrative officer.
                  </p>
                </div>
              </div>

              {/* Recommendation Summary */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/25 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    RECOMMENDED APMC MANDI
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      recommendation.confidence === "high"
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {recommendation.confidence.toUpperCase()} CONFIDENCE
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <p className="text-lg font-black text-emerald-300">
                    {recommendation.best_mandi}
                  </p>
                  <span className="text-xs font-bold text-slate-300">
                    (₹{recommendation.net_margin_per_quintal.toLocaleString()}/qtl net)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {recommendation.reasoning_summary}
                </p>
              </div>

              {/* Target Recipient Card */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        OFFICIAL REGISTRY & OFFICER ROUTING
                      </span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                    <p className="text-xs font-mono font-bold text-slate-100 truncate mt-0.5">
                      To: <span className="text-emerald-300">prototracedev@gmail.com</span>
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 truncate">
                      From Officer: sayimmullick2005@gmail.com
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                  Web3Forms SSL
                </span>
              </div>

              {/* Language Selection Tabs & Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    ADVISORY MESSAGE PAYLOAD
                  </span>
                  <div className="flex gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowBengali(false)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        !showBengali
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBengali(true)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        showBengali
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Languages className="w-3 h-3" />
                      বাংলা (Bengali)
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 max-h-36 overflow-y-auto">
                  <pre className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                    {currentMessage}
                  </pre>
                </div>
              </div>

            </div>

            {/* Action Buttons Footer */}
            <div className="p-6 pt-3 bg-slate-900/60 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
              <motion.button
                onClick={onReject}
                disabled={isApproving}
                className="order-2 sm:order-1 flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-red-950/40 hover:border-red-500/40 text-slate-300 hover:text-red-300 text-xs font-bold transition-all disabled:opacity-40"
                whileHover={!isApproving ? { scale: 1.01 } : {}}
                whileTap={!isApproving ? { scale: 0.99 } : {}}
              >
                <XCircle className="w-4 h-4" />
                Reject Advisory
              </motion.button>

              <motion.button
                onClick={() => onApprove(currentMessage)}
                disabled={isApproving}
                className="order-1 sm:order-2 flex-[2] bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold px-6 py-3.5 rounded-xl text-sm shadow-xl shadow-emerald-950/70 border border-emerald-400/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                whileHover={!isApproving ? { scale: 1.02, boxShadow: "0 0 30px rgba(16, 185, 129, 0.5)" } : {}}
                whileTap={!isApproving ? { scale: 0.98 } : {}}
              >
                {isApproving ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner" />
                    <span>Authorizing & Dispatched...</span>
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Authorize & Dispatch Email</span>
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


