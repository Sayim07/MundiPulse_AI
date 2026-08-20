"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Send,
  AlertTriangle,
  Globe,
  Languages,
  User,
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
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
}

/**
 * ApprovalModal — Human-in-the-Loop glassmorphic approval modal.
 * Blurs the background. Shows the drafted alert in both languages.
 * "Approve & Send" button with loading spinner state.
 */
export default function ApprovalModal({
  isOpen,
  recommendation,
  onApprove,
  onReject,
  isApproving,
}: ApprovalModalProps) {
  const [showBengali, setShowBengali] = useState(false);

  if (!recommendation) return null;

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
            className="glass-modal rounded-3xl p-0 max-w-lg w-full mx-4 overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
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
                    Review the drafted alert before dispatch
                  </p>
                </div>
              </div>
            </div>

            {/* Guardrail Notice */}
            <div className="mx-6 mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-mp-amber/5 border border-mp-amber/15">
              <AlertTriangle className="w-4 h-4 text-mp-amber flex-shrink-0 mt-0.5" />
              <p className="text-xs text-mp-amber/80 leading-relaxed">
                <strong>Responsible AI Guardrail:</strong> No SMS or WhatsApp
                message will be sent to farmers without your explicit approval.
                Please review the content below carefully.
              </p>
            </div>

            {/* Recommendation Summary */}
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

            {/* Language Toggle */}
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

            {/* Alert Preview */}
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

            {/* Recipient Info */}
            <div className="mx-6 mb-5 flex items-center gap-2 text-xs text-mp-text-muted">
              <User className="w-3.5 h-3.5" />
              <span>
                Recipient: <strong className="text-mp-text-secondary">Farmer Group Alpha</strong> via SMS/WhatsApp
              </span>
            </div>

            {/* Action Buttons */}
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
                onClick={onApprove}
                disabled={isApproving}
                className="flex-[2] btn-neon flex items-center justify-center gap-2 py-3 rounded-xl text-sm disabled:opacity-60"
                whileHover={!isApproving ? { scale: 1.01 } : {}}
                whileTap={!isApproving ? { scale: 0.99 } : {}}
              >
                {isApproving ? (
                  <>
                    <div className="spinner" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Approve & Send</span>
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
