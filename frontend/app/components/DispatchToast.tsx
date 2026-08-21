"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, Mail } from "lucide-react";

interface DispatchToastProps {
  isVisible: boolean;
  dispatch: {
    channel: string;
    recipient_group: string;
    demo_target?: string;
    channels?: { email?: string; sms?: string; whatsapp?: string };
    dispatched_at: string;
    delivery_status: string;
  } | null;
  onClose: () => void;
}

/**
 * DispatchToast — Official Authorization & Dispatch Confirmation Toast
 */
export default function DispatchToast({
  isVisible,
  dispatch,
  onClose,
}: DispatchToastProps) {
  const emailStatus = dispatch?.channels?.email || "sent";

  return (
    <AnimatePresence>
      {isVisible && dispatch && (
        <motion.div
          className="fixed bottom-6 right-6 z-[200] bg-slate-950/95 border border-emerald-500/40 backdrop-blur-2xl rounded-2xl p-5 max-w-sm shadow-2xl shadow-emerald-950/80"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-100 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  DISPATCH CONFIRMED
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-100 mb-1">
                Executive Email Advisory Transmitted
              </h4>
              <p className="text-xs text-slate-300 mb-2 leading-relaxed font-mono">
                {dispatch.recipient_group ||
                  "Transmitted to Official Registry (prototracedev@gmail.com) from Officer (sayimmullick2005@gmail.com)"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  emailStatus.startsWith("failed")
                    ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                }`}>
                  <Mail className="w-3 h-3" />
                  Web3Forms {emailStatus.startsWith("failed") ? "FAILED" : "DELIVERED"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

