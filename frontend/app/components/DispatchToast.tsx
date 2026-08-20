"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

interface DispatchToastProps {
  isVisible: boolean;
  dispatch: {
    channel: string;
    recipient_group: string;
    dispatched_at: string;
    delivery_status: string;
  } | null;
  onClose: () => void;
}

/**
 * DispatchToast — Success notification shown after SMS/WhatsApp dispatch.
 */
export default function DispatchToast({
  isVisible,
  dispatch,
  onClose,
}: DispatchToastProps) {
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
                Alert Dispatched Successfully
              </h4>
              <p className="text-xs text-mp-text-secondary mb-2">
                Message sent to{" "}
                <strong className="text-mp-text-primary">
                  {dispatch.recipient_group}
                </strong>{" "}
                via {dispatch.channel === "twilio_sms" ? "Twilio SMS" : "WhatsApp"}.
              </p>
              <div className="flex items-center gap-2">
                <span className="badge-emerald text-[9px]">
                  {dispatch.delivery_status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
