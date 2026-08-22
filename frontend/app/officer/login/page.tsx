"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { setToken } from "@/lib/officerAuth";
import { apiError, getApiBase } from "@/lib/apiBase";
import { Suspense } from "react";

function OfficerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await fetch(`${getApiBase()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) {
          throw new Error("Invalid email or password. Register first if you have not created an officer account yet.");
        }
        throw new Error(apiError(data.detail, "Could not sign in.", r.status));
      }
      setToken(data.token, data.officer);
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not sign in.";
      if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
        setError("Cannot reach the local API. Start it with: cd backend && python -m uvicorn main:app --reload --port 8000");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.14),transparent_70%)]" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-slate-900/85 border border-emerald-500/30 backdrop-blur-xl rounded-3xl p-6 shadow-2xl shadow-emerald-950/40"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-black text-white">Officer login</h1>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Sign in with your officer email. The dashboard (search, prices, map, HITL, farmer registry) is available after login.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Officer email"
            className="officer-field w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
            autoComplete="email"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="officer-field w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
            autoComplete="current-password"
          />
          {error && <p className="text-[11px] text-amber-300">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-sm font-extrabold disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-4 text-center">
          New officer?{" "}
          <Link href="/officer/register" className="text-emerald-300 font-semibold hover:underline">
            Register
          </Link>
          {" · "}
          <Link href="/" className="text-slate-300 hover:underline">
            Landing
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function OfficerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center text-sm text-slate-400">
          Loading…
        </div>
      }
    >
      <OfficerLoginForm />
    </Suspense>
  );
}
