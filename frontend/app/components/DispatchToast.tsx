"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, MessageSquare, Phone } from "lucide-react";

interface DispatchToastProps {
  isVisible: boolean;
  dispatch: {
    channel: string;
    recipient_group: string;
    demo_target?: string;
    channels?: { sms?: string; whatsapp?: string };
    dispatched_at: string;
    delivery_status: string;
  } | null;
  onClose: () => void;
}

/**
 * DispatchToast — Success notification showing dual SMS + WhatsApp dispatch status.
 */
export default function DispatchToast({
  isVisible,
  dispatch,
  onClose,
}: DispatchToastProps) {
  const smsStatus = dispatch?.channels?.sms || "sent";
  const waStatus = dispatch?.channels?.whatsapp;
  const demoTarget = dispatch?.demo_target;

  return (
    <AnimatePresence>
      {isVisible && dispatch && (
        <motion.div
          className="fixed bottom-6 right-6 z-[200] glass-modal rounded-2xl p-5 max-w-sm"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-mp-text-muted hover:text-mp-text-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-mp-emerald-500/15 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-mp-emerald-neon" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-mp-emerald-400 mb-1">
                Alert dispatched
              </h4>
              <p className="text-xs text-mp-text-secondary mb-2">
                Sent via <strong className="text-mp-text-primary">{dispatch.channel}</strong> to{" "}
                <strong className="text-mp-text-primary">
                  {demoTarget ? `+91${demoTarget}` : dispatch.recipient_group}
                </strong>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {/* SMS status */}
                <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                  smsStatus === "failed"
                    ? "bg-mp-amber/15 text-mp-amber"
                    : "bg-mp-emerald-500/15 text-mp-emerald-400"
                }`}>
                  <Phone className="w-2.5 h-2.5" />
                  SMS {smsStatus.toUpperCase()}
                </span>
                {/* WhatsApp status */}
                {waStatus && (
                  <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                    waStatus === "failed"
                      ? "bg-mp-amber/15 text-mp-amber"
                      : "bg-mp-emerald-500/15 text-mp-emerald-400"
                  }`}>
                    <MessageSquare className="w-2.5 h-2.5" />
                    WhatsApp {waStatus.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
