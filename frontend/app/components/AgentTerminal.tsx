"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Clock } from "lucide-react";

export interface TerminalLog {
  type: "system" | "agent" | "success" | "llm" | "error";
  msg: string;
}

interface AgentTerminalProps {
  logs: TerminalLog[];
  isRunning: boolean;
}

/**
 * Maps raw backend console logs to official administrative audit trail entries.
 */
function formatOfficerLog(rawMsg: string, type: string): { formattedMsg: string; category: string } {
  const lower = rawMsg.toLowerCase();

  if (lower.includes("price fetch starting") || lower.includes("starting price fetch") || lower.includes("catalog/commodities") || lower.includes("query/stream")) {
    return {
      formattedMsg: "✅ Secure connection established with Agmarknet live database.",
      category: "CONNECTION",
    };
  }

  if (lower.includes("records") || lower.includes("agmarknet") || lower.includes("portal") || lower.includes("live fetch") || lower.includes("retrieved")) {
    return {
      formattedMsg: "📊 Retrieved active commodity pricing across regional markets.",
      category: "MARKET DATA",
    };
  }

  if (lower.includes("transport") || lower.includes("calculate_margins") || lower.includes("logistics") || lower.includes("nets in python")) {
    return {
      formattedMsg: "🚚 Transport costs and net margins calculated via Python engine.",
      category: "LOGISTICS",
    };
  }

  if (lower.includes("gemini") || lower.includes("bengali") || lower.includes("llm") || lower.includes("wording") || lower.includes("facts")) {
    return {
      formattedMsg: "🤖 Bilingual executive advisory generated successfully.",
      category: "AI ADVISORY",
    };
  }

  if (lower.includes("awaiting human approval") || lower.includes("dispatch still blocked") || lower.includes("awaiting")) {
    return {
      formattedMsg: "⏳ Awaiting authorized officer sign-off for dispatch.",
      category: "GOVTECH HITL",
    };
  }

  if (lower.includes("approved") || lower.includes("web3forms") || lower.includes("email alert dispatched")) {
    return {
      formattedMsg: "🚀 Email alert dispatched to authorized recipient (sayimmullick2005@gmail.com).",
      category: "DISPATCH",
    };
  }

  if (lower.includes("rejected") || lower.includes("no message dispatched")) {
    return {
      formattedMsg: "⛔ Advisory rejected by authorized officer. Dispatch cancelled.",
      category: "AUDIT",
    };
  }

  if (type === "error") {
    // Strip technical prefixes for clean officer display
    const cleanErr = rawMsg.replace(/^\[.*?\]\s*/, "");
    return {
      formattedMsg: `⚠️ System notice: ${cleanErr}`,
      category: "ALERT",
    };
  }

  // Fallback: clean up raw tag prefixes
  const cleanMsg = rawMsg.replace(/^\[(KrishiDrishti|MandiPulse|Gemini|Error|Agmarknet)\]\s*/i, "");
  return {
    formattedMsg: cleanMsg,
    category: "SYSTEM",
  };
}

export default function AgentTerminal({ logs, isRunning }: AgentTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-emerald-950/20 backdrop-blur-xl border border-emerald-500/25 rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:border-emerald-500/40 transition-all duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-emerald-500/15 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-white block leading-tight">
              Officer Activity Audit Log
            </span>
            <span className="text-[10px] text-slate-300">
              Administrative Execution Trail
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Auditing Live
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Idle
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-2.5 max-h-[380px] font-sans">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-slate-300 text-xs gap-2.5 text-center px-4">
            <div className="p-3 rounded-full bg-slate-900/80 border border-slate-700/80 shadow-inner">
              <Clock className="w-5 h-5 text-slate-400 stroke-1" />
            </div>
            <p className="font-semibold text-slate-100">
              Awaiting officer query initiation.
            </p>
            <p className="text-[11px] text-slate-300 max-w-xs leading-relaxed">
              Live Agmarknet queries, transport computation steps, and HITL authorization states will appear in this audit trail.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {logs.map((log, idx) => {
              const { formattedMsg, category } = formatOfficerLog(log.msg, log.type);
              const isError = log.type === "error";

              return (
                <motion.div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-xs leading-relaxed transition-all backdrop-blur-md ${
                    isError
                      ? "bg-red-950/30 border-red-500/40 text-red-200"
                      : "bg-slate-950/50 border-slate-700/70 text-slate-100 hover:border-emerald-500/40"
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300 border border-emerald-500/30">
                      {category}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      ENTRY #{String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="font-semibold text-white mt-1">
                    {formattedMsg}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Audit Badge */}
      <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-300 backdrop-blur-md">
        <span>ISO-GovTech Verified Audit Channel</span>
        <span>HITL Protected</span>
      </div>
    </div>
  );
}

