"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal as TerminalIcon, Circle } from "lucide-react";

export interface TerminalLog {
  type: "system" | "agent" | "success" | "llm" | "error";
  msg: string;
}

interface AgentTerminalProps {
  logs: TerminalLog[];
  isRunning: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  system: "terminal-line-system",
  agent: "terminal-line-agent",
  success: "terminal-line-success",
  llm: "terminal-line-llm",
  error: "terminal-line-error",
};

/**
 * AgentTerminal — Live terminal window that simulates the webcmd backend logs.
 * Auto-scrolls to latest log. Animated line-by-line appearance.
 */
export default function AgentTerminal({ logs, isRunning }: AgentTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="terminal h-full flex flex-col">
      {/* Terminal Header */}
      <div className="terminal-header">
        <Circle className="w-2.5 h-2.5 fill-mp-red text-mp-red" />
        <Circle className="w-2.5 h-2.5 fill-mp-amber text-mp-amber" />
        <Circle className="w-2.5 h-2.5 fill-mp-emerald-500 text-mp-emerald-500" />
        <div className="flex items-center gap-2 ml-3">
          <TerminalIcon className="w-3.5 h-3.5 text-mp-text-muted" />
          <span className="text-xs text-mp-text-muted font-medium">
            MandiPulse Agent Terminal
          </span>
        </div>
        {isRunning && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="pulse-dot" />
            <span className="text-[10px] text-mp-emerald-400 font-medium uppercase tracking-wider">
              Live
            </span>
          </div>
        )}
      </div>

      {/* Terminal Body */}
      <div ref={scrollRef} className="terminal-body flex-1">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-mp-text-muted text-xs">
            <span>Waiting for query... Terminal will show agent activity here.</span>
          </div>
        ) : (
          <AnimatePresence>
            {logs.map((log, idx) => (
              <motion.div
                key={idx}
                className={`${TYPE_COLORS[log.type] || "terminal-line-agent"} leading-relaxed`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.05 }}
              >
                <span className="text-mp-text-muted/40 mr-2 select-none">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                {log.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Blinking cursor at end */}
        {isRunning && (
          <motion.span
            className="inline-block w-2 h-4 bg-mp-emerald-neon/80 ml-6 mt-1"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
          />
        )}
      </div>
    </div>
  );
}
