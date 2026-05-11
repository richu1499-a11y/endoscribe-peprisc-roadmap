"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

interface Props {
  mode: "login" | "signup";
  onSubmit: (email: string, password: string, fullName?: string) => Promise<void>;
  error: string | null;
}

export default function AuthForm({ mode, onSubmit, error }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(email, password, mode === "signup" ? fullName : undefined);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Full Name</label>
          <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" required />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
        <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
        <input type="password" className={inputCls} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required />
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <button type="submit" disabled={loading} className="w-full rounded bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
      </button>

      <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Do not use PHI, patient identifiers, or clinical data as credentials or account information.</span>
      </div>
    </form>
  );
}
