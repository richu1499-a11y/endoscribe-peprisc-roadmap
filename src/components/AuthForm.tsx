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

  const inputCls = "app-field w-full rounded-lg px-3 py-2 text-sm placeholder:text-[var(--subtle)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Full Name</label>
          <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" required />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Email</label>
        <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Password</label>
        <input type="password" className={inputCls} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">{error}</div>
      )}

      <button type="submit" disabled={loading} className="app-button-primary w-full rounded-lg py-2 text-sm font-semibold disabled:opacity-50">
        {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
      </button>

      <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--muted)]">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Do not use PHI, patient identifiers, or clinical data as credentials or account information.</span>
      </div>
    </form>
  );
}
