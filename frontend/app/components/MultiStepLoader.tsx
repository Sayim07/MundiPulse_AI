"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Database, Calculator, Bot, ShieldCheck } from "lucide-react";

interface MultiStepLoaderProps {
  isLoading: boolean;
  crop?: string;
  district?: string;
}

const STEPS = [
  {
    id: 1,
    label: "Querying official Agmarknet APMC portal...",
    detail: "Establishing secure SSL connection to Agmarknet live commodity pricing database",
    icon: Database,
  },
  {
    id: 2,
    label: "Computing regional transport logistics and net margins...",
    detail: "Running geospatial freight distance matrix and real-time net realization formulas",
    icon: Calculator,
  },
  {
    id: 3,
    label: "Generating bilingual executive summary...",
    detail: "Formulating localized Bengali & English intelligence briefings via Gemini LLM",
    icon: Bot,
  },
];

export default function MultiStepLoader({
  isLoading,
  crop,
  district,
}: MultiStepLoaderProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setActiveStep(1);
      setElapsedMs(0);
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedMs(elapsed);

      if (elapsed < 1400) {
        setActiveStep(1);
      } else if (elapsed < 2800) {
        setActiveStep(2);
      } else {
        setActiveStep(3);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isLoading]);

  if (!isLoading) return null;

  const progressPercent =
    activeStep === 1 ? 33 : activeStep === 2 ? 66 : 95;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-6"
    >
      <div className="bg-gradient-to-br from-slate-950/85 via-slate-900/65 to-emerald-950/30 border border-emerald-500/35 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-emerald-500/15">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Autonomous Execution Pipeline Active
                </span>
                <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  {(elapsedMs / 1000).toFixed(1)}s
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Discovering Market Arbitrage for {crop || "Selected Crop"} in {district || "Target District"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-300 self-start sm:self-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>GovTech Secure Channel</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900/80 rounded-full h-1.5 mb-6 overflow-hidden border border-slate-700/60">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-400 rounded-full"
            initial={{ width: "10%" }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((step) => {
            const isCompleted = activeStep > step.id;
            const isCurrent = activeStep === step.id;
            const isPending = activeStep < step.id;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`relative rounded-xl p-4 transition-all duration-300 border flex flex-col justify-between backdrop-blur-md ${
                  isCurrent
                    ? "bg-slate-900/80 border-emerald-500/60 shadow-lg shadow-emerald-950/50"
                    : isCompleted
                    ? "bg-slate-950/50 border-emerald-500/30 opacity-95"
                    : "bg-slate-950/30 border-slate-800/60 opacity-50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div
                      className={`p-2 rounded-lg ${
                        isCurrent
                          ? "bg-emerald-500/20 text-emerald-300"
                          : isCompleted
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex items-center">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          STEP {step.id}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4
                    className={`text-xs font-bold leading-snug mb-1.5 ${
                      isCurrent
                        ? "text-emerald-300"
                        : isCompleted
                        ? "text-slate-100"
                        : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {step.detail}
                  </p>
                </div>

                {isCurrent && (
                  <div className="mt-3 pt-2 border-t border-emerald-500/20 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-emerald-400 animate-pulse">
                      Processing in real-time...
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </motion.div>
  );
}
