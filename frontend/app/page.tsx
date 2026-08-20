"use client";

import { useState, useCallback } from "react";
import CustomCursor from "./components/CustomCursor";
import Hero from "./components/Hero";
import QueryInput from "./components/QueryInput";
import AgentTerminal, { TerminalLog } from "./components/AgentTerminal";
import PriceTable, { PriceRecord } from "./components/PriceTable";
import StatsCards from "./components/StatsCards";
import ApprovalModal from "./components/ApprovalModal";
import DispatchToast from "./components/DispatchToast";
import { Shield, ExternalLink, Cpu, Zap } from "lucide-react";

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

interface QueryResult {
  run_id: string;
  query: { crop: string; district: string; state: string };
  price_records: PriceRecord[];
  recommendation: Recommendation;
  status: string;
}

/**
 * MandiPulse AI — Main Dashboard Page
 * Bento Box grid layout assembling all components:
 *   - Hero with fading titles
 *   - Command input bar
 *   - Agent Terminal (live logs)
 *   - Price comparison table
 *   - Stats cards
 *   - HITL Approval Modal
 */
export default function Home() {
  // ── State ──────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [currentCrop, setCurrentCrop] = useState("Paddy");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [dispatchInfo, setDispatchInfo] = useState<any>(null);

  // ── Query Handler (SSE stream) ─────────────────────────────────────────
  const handleQuery = useCallback(async (crop: string, district: string) => {
    setIsRunning(true);
    setLogs([]);
    setResult(null);
    setCurrentCrop(crop);
    setShowToast(false);

    try {
      const response = await fetch(`${API_BASE}/api/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop, district, state: "West Bengal" }),
      });

      if (!response.ok) throw new Error("Failed to start agent");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "result") {
                // Final result payload
                setResult(data.payload);
                setShowModal(true);
              } else {
                // Terminal log line
                setLogs((prev) => [...prev, data as TerminalLog]);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        {
          type: "error" as const,
          msg: `[Error] ${error instanceof Error ? error.message : "Connection failed"}. Is the backend running on ${API_BASE}?`,
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  }, []);

  // ── Approval Handler ───────────────────────────────────────────────────
  const handleApprove = useCallback(async () => {
    if (!result) return;
    setIsApproving(true);

    try {
      const response = await fetch(`${API_BASE}/api/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: result.run_id,
          approved: true,
          approved_by: "organizer",
        }),
      });

      if (!response.ok) throw new Error("Approval failed");

      const data = await response.json();
      setDispatchInfo(data.dispatch);
      setShowModal(false);
      setShowToast(true);

      setLogs((prev) => [
        ...prev,
        { type: "success", msg: "[MandiPulse] ✓ Alert approved and dispatched to Farmer Group Alpha!" },
      ]);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        { type: "error", msg: `[Error] Approval failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      ]);
    } finally {
      setIsApproving(false);
    }
  }, [result]);

  // ── Reject Handler ─────────────────────────────────────────────────────
  const handleReject = useCallback(async () => {
    if (!result) return;

    try {
      await fetch(`${API_BASE}/api/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: result.run_id,
          approved: false,
        }),
      });
    } catch {
      // Silent rejection
    }

    setShowModal(false);
    setLogs((prev) => [
      ...prev,
      { type: "error", msg: "[MandiPulse] ✗ Alert rejected by organizer. No message dispatched." },
    ]);
  }, [result]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <CustomCursor />

      <main className="relative z-10 min-h-screen">
        {/* ── Hero + Query ──────────────────────────────────────────── */}
        <Hero />
        <QueryInput onSubmit={handleQuery} isLoading={isRunning} />

        {/* ── Bento Dashboard Grid ──────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Row */}
          <StatsCards
            recommendation={result?.recommendation || null}
            totalMandis={result?.price_records.length || 0}
            crop={currentCrop}
          />

          {/* Main Grid: Terminal + Price Table */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
            {/* Agent Terminal — spans 2 cols */}
            <div className="lg:col-span-2 min-h-[420px]">
              <AgentTerminal logs={logs} isRunning={isRunning} />
            </div>

            {/* Price Table — spans 3 cols */}
            <div className="lg:col-span-3">
              <PriceTable
                records={result?.price_records || []}
                bestMandi={result?.recommendation.best_mandi || ""}
              />
            </div>
          </div>

          {/* Bottom Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Architecture Card */}
            <div className="bento-card">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-mp-cyan/10">
                  <Cpu className="w-4 h-4 text-mp-cyan" />
                </div>
                <h3 className="text-sm font-semibold text-mp-text-primary">
                  Architecture
                </h3>
              </div>
              <p className="text-xs text-mp-text-muted leading-relaxed">
                <strong className="text-mp-text-secondary">webcmd</strong> browser agent navigates e-NAM & Agmarknet portals →{" "}
                <strong className="text-mp-text-secondary">Gemini 1.5 Flash</strong>{" "}
                computes margins & translates to Bengali →{" "}
                <strong className="text-mp-text-secondary">HITL gate</strong>{" "}
                before Twilio dispatch.
              </p>
            </div>

            {/* Guardrail Card */}
            <div className="bento-card">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-mp-amber/10">
                  <Shield className="w-4 h-4 text-mp-amber" />
                </div>
                <h3 className="text-sm font-semibold text-mp-text-primary">
                  Responsible AI
                </h3>
              </div>
              <p className="text-xs text-mp-text-muted leading-relaxed">
                Human-in-the-loop approval is{" "}
                <strong className="text-mp-amber">non-negotiable</strong>. Every
                recommendation shows source portals, timestamps, and a confidence
                level. Prices include a fluctuation disclaimer.
              </p>
            </div>

            {/* Tech Stack Card */}
            <div className="bento-card">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-mp-emerald-500/10">
                  <Zap className="w-4 h-4 text-mp-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-mp-text-primary">
                  Tech Stack
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Next.js",
                  "FastAPI",
                  "webcmd",
                  "Gemini 1.5",
                  "Tailwind",
                  "Framer Motion",
                  "Twilio",
                  "Pydantic",
                ].map((tech) => (
                  <span key={tech} className="badge-cyan text-[9px]">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="border-t border-mp-border py-6 mt-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-mp-text-muted">
              <span className="gradient-text font-bold">MandiPulse AI</span>
              <span>·</span>
              <span>SLAB Hackathon & AgentForge 2026 @ GCELT, Kolkata</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-mp-text-muted">
              <a
                href="#"
                className="flex items-center gap-1.5 hover:text-mp-text-secondary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                GitHub
              </a>
              <span className="text-mp-text-muted/40">|</span>
              <span>100% Free & Open Source</span>
            </div>
          </div>
        </footer>
      </main>

      {/* ── Modals & Toasts ────────────────────────────────────────── */}
      <ApprovalModal
        isOpen={showModal}
        recommendation={result?.recommendation || null}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={isApproving}
      />

      <DispatchToast
        isVisible={showToast}
        dispatch={dispatchInfo}
        onClose={() => setShowToast(false)}
      />
    </>
  );
}
