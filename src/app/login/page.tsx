"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import AuthForm from "@/components/AuthForm";

const FEATURE_PILLS = [
  "Documentation Engine",
  "Prediction Models",
  "Recommendation Engine",
  "Analytics & Quality",
  "Validation Roadmap",
];

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(email: string, password: string) {
    setError(null);
    try {
      await signIn(email, password);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo + Hero */}
      <div className="text-center mb-10">
        <Image src="/endoscribe-logo.svg" alt="EndoScribe" width={320} height={72} className="mx-auto" priority />
        <p className="mt-5 text-lg text-teal-600 font-semibold tracking-tight">
          Ambient Endoscopy Intelligence Platform
        </p>
        <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          Documentation, prediction models, recommendations, analytics, and validation — from one workspace.
        </p>
      </div>

      {/* Sign in card */}
      <div className="w-full max-w-sm">
        {isSupabaseConfigured ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50">
            <h2 className="text-xl font-bold text-slate-900 mb-5">Sign in</h2>
            <AuthForm mode="login" onSubmit={handleSubmit} error={error} />
            <p className="mt-5 text-center text-sm text-slate-400">
              No account? <Link href="/signup" className="text-teal-600 hover:underline font-medium">Request access</Link>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-8 text-center">
            <p className="text-base text-teal-800">Demo mode active. <Link href="/" className="underline font-medium">Enter app</Link></p>
          </div>
        )}
      </div>

      {/* Feature pills */}
      <div className="mt-10 flex flex-wrap justify-center gap-2 max-w-lg">
        {FEATURE_PILLS.map(pill => (
          <span
            key={pill}
            className="rounded-full bg-white/80 border border-slate-200/60 px-4 py-1.5 text-xs font-medium text-slate-600 backdrop-blur-sm"
          >
            {pill}
          </span>
        ))}
      </div>

      <p className="mt-10 text-xs text-slate-400">Access is restricted to approved workspace members.</p>
    </div>
  );
}
