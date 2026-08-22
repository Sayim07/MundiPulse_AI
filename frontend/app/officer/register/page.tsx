"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, ShieldCheck } from "lucide-react";
import { setToken } from "@/lib/officerAuth";
import { apiError, getApiBase } from "@/lib/apiBase";

export default function OfficerRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!address.trim()) {
      setError("Address / location is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const pwd = password;
    const conf = confirm || password;
    if (pwd !== conf) {
      setError("Passwords do not match. Fill Confirm password (browser autofill often skips it).");
      return;
    }

    setBusy(true);
    try {
      const body = {
        email,
        password: pwd,
        name: name.trim(),
        address: address.trim(),
      };
      const r = await fetch(`${getApiBase()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.token) {
        setToken(data.token, data.officer);
        router.push("/dashboard");
        return;
      }
      const detail = String(data.detail || "");
      if (r.status === 400 && detail.toLowerCase().includes("already exists")) {
        const login = await fetch(`${getApiBase()}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pwd }),
        });
        const loginData = await login.json().catch(() => ({}));
        if (login.ok && loginData.token) {
          setToken(loginData.token, loginData.officer);
          router.push("/dashboard");
          return;
        }
        throw new Error("This email is already registered. Open Officer login and use the same password.");
      }
      throw new Error(apiError(data.detail, "Could not register.", r.status));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not register.";
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
          <h1 className="text-lg font-black text-white">Officer register</h1>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Create an officer account with your name, email, and address. That address is stored as your officer location — you still pick a live Agmarknet district when fetching prices.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="officer-field w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Officer email"
            className="officer-field w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => {
              const v = e.target.value;
              setPassword(v);
              setConfirm((c) => (!c || c === password ? v : c));
            }}
            placeholder="Password (min 8 characters)"
            className="officer-field w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password (same as above)"
            className="officer-field w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-emerald-400" />
            <textarea
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address / location (free text — this is your officer address)"
              rows={3}
              className="officer-field w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Type your KVK / office location. No Agmarknet catalog pick is required here.
            </p>
          </div>
          {error && <p className="text-[11px] text-amber-300">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-sm font-extrabold disabled:opacity-50"
          >
            {busy ? "Creating account…" : "Create officer account"}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-4 text-center">
          Already registered?{" "}
          <Link href="/officer/login" className="text-emerald-300 font-semibold hover:underline">
            Officer login
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
