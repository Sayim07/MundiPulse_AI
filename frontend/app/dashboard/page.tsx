"use client";

import { useState, useCallback } from "react";
import CustomCursor from "../components/CustomCursor";
import Hero from "../components/Hero";
import QueryInput, { CatalogPick } from "../components/QueryInput";
import AgentTerminal, { TerminalLog } from "../components/AgentTerminal";
import PriceTable, { PriceRecord } from "../components/PriceTable";
import StatsCards from "../components/StatsCards";
import ApprovalModal from "../components/ApprovalModal";
import DispatchToast from "../components/DispatchToast";
import MarketMap from "../components/MarketMap";
import { Shield, Cpu, Zap } from "lucide-react";

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
  data_mode?: "live" | "demo";
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [currentCrop, setCurrentCrop] = useState("Paddy");

  const [showModal, setShowModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [dispatchInfo, setDispatchInfo] = useState<any>(null);

  const handleQuery = useCallback(async (pick: CatalogPick) => {
    setIsRunning(true);
    setLogs([]);
    setResult(null);
    setCurrentCrop(pick.crop);
    setShowToast(false);

    try {
      const response = await fetch(`${API_BASE}/api/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop: pick.crop,
          district: pick.district,
          state: pick.state,
          mode: "live",
          commodity_id: pick.commodity_id,
          district_id: pick.district_id,
          state_id: pick.state_id,
          market_id: pick.market_id,
          market_name: pick.market_name,
        }),
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
                setResult(data.payload);
                setShowModal(true);
              } else {
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

  const handleApprove = useCallback(async (recipients: string[]) => {
    if (!result) return;
    setIsApproving(true);

    try {
      if (!result.run_id) {
        throw new Error("No run_id on this result. Run Fetch again before approving.");
      }

      const response = await fetch(`${API_BASE}/api/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: result.run_id,
          approved: true,
          approved_by: "organizer",
          recipients,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail =
          typeof (data as { detail?: unknown }).detail === "string"
            ? (data as { detail: string }).detail
            : `Approval failed (${response.status})`;
        throw new Error(detail);
      }

      setDispatchInfo(data.dispatch);
      setShowModal(false);
      setShowToast(true);

      setLogs((prev) => [
        ...prev,
        { type: "success", msg: `[MandiPulse] ✓ Approved. SMS requested for ${recipients.join(", ")}.` },
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

  return (
    <>
      <CustomCursor />

      <main className="relative z-10 min-h-screen">
        <Hero />
        <QueryInput onSubmit={handleQuery} isLoading={isRunning} />

        {result?.data_mode && (
          <div className="max-w-7xl mx-auto px-6">
            <span
              className={`text-xs font-semibold tracking-wider ${
                result.data_mode === "live" ? "text-mp-emerald-400" : "text-mp-amber"
              }`}
            >
              {result.data_mode === "live" ? "● LIVE DATA" : "● DEMO DATA"}
            </span>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 py-8">
          <StatsCards
            recommendation={result?.recommendation || null}
            totalMandis={result?.price_records.length || 0}
            crop={currentCrop}
          />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
            <div className="lg:col-span-2 min-h-[420px]">
              <AgentTerminal logs={logs} isRunning={isRunning} />
            </div>

            <div className="lg:col-span-3 space-y-4">
              <PriceTable
                records={result?.price_records || []}
                bestMandi={result?.recommendation.best_mandi || ""}
              />
              <MarketMap
                records={result?.price_records || []}
                bestMandi={result?.recommendation.best_mandi || ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                <strong className="text-mp-text-secondary">Agmarknet JSON</strong> live portal data →{" "}
                <strong className="text-mp-text-secondary">Python</strong>{" "}
                computes transport-adjusted margins →{" "}
                <strong className="text-mp-text-secondary">Gemini</strong>{" "}
                translates to Bengali →{" "}
                <strong className="text-mp-text-secondary">HITL gate</strong>{" "}
                before dual SMS + WhatsApp dispatch.
              </p>
            </div>

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

        <footer className="border-t border-mp-border py-6 mt-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-mp-text-muted">
              <span className="gradient-text font-bold">MandiPulse AI</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-mp-text-muted">
              <span>100% Free & Open Source</span>
            </div>
          </div>
        </footer>
      </main>

      <ApprovalModal
        isOpen={showModal}
        recommendation={result?.recommendation || null}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={isApproving}
        region={result?.query?.district}
      />

      <DispatchToast
        isVisible={showToast}
        dispatch={dispatchInfo}
        onClose={() => setShowToast(false)}
      />
    </>
  );
}
