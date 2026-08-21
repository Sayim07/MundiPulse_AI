"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Circle } from "lucide-react";

export interface TerminalLog {
  type: "system" | "agent" | "success" | "llm" | "error";
  msg: string;
}

interface AgentTerminalProps {
  logs: TerminalLog[];
  isRunning: boolean;
}

export default function AgentTerminal({ logs, isRunning }: AgentTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col glass rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mp-border bg-white/5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-mp-emerald-500" />
          <span className="text-sm text-mp-text-primary font-medium">
            System Activity Log
          </span>
        </div>
        {isRunning && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mp-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-mp-emerald-500"></span>
            </span>
            <span className="text-xs text-mp-emerald-500 font-medium">
              Live
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-mp-text-muted text-sm gap-3">
             <Circle className="w-8 h-8 text-mp-text-muted/30 stroke-1" />
            <span>Waiting for query... Activity will appear here.</span>
          </div>
        ) : (
          <AnimatePresence>
            {logs.map((log, idx) => (
              <motion.div
                key={idx}
                className={`text-sm leading-relaxed ${
                  log.type === "error" ? "text-mp-red" : "text-mp-text-secondary"
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-mp-text-muted/40 text-xs mt-0.5 select-none shrink-0 w-5">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span>{log.msg}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
