"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import AuthForm from "@/components/AuthForm";
import ThemeToggle from "@/components/ThemeToggle";
import { ListChecks, Briefcase, CalendarDays, BarChart3, ShieldCheck } from "lucide-react";

const FEATURES = [
  { icon: ListChecks, title: "Tasks", desc: "Create, assign, and track tasks with inline editing." },
  { icon: Briefcase, title: "Workspaces", desc: "Organized project verticals for team execution." },
  { icon: CalendarDays, title: "Calendar", desc: "Schedule meetings and export calendar invites." },
  { icon: BarChart3, title: "Reports", desc: "Summaries, timelines, and advanced analysis." },
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
    <div className="min-h-screen bg-[var(--background)] p-3 text-[var(--text)] sm:p-5">
      <div className="fixed right-5 top-5 z-10">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-6xl overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] md:grid-cols-[1.08fr_1fr]">
        <section className="relative flex min-h-[420px] flex-col justify-between overflow-hidden bg-[#102321] p-8 text-white sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,197,170,.46),transparent_34%),radial-gradient(circle_at_82%_30%,rgba(200,138,44,.28),transparent_30%),linear-gradient(140deg,#0d3f37,#13202b_54%,#090d10)]" />
          <div className="relative">
            <Image src="/endoscribe-mark.svg" alt="" width={38} height={38} className="mb-8 opacity-90" />
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/75">
              <ShieldCheck className="h-3.5 w-3.5" /> Invitation-only workspace
            </p>
            <h1 className="max-w-md text-3xl font-semibold leading-tight sm:text-4xl">
              Platform for Research and Internal Systems Management
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/68">
              Track verticals, milestones, tasks, assignees, deadlines, and meetings from one secure project operating layer.
            </p>
          </div>
          <div className="relative grid gap-3 sm:grid-cols-2">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-lg border border-white/12 bg-white/[0.07] p-4 backdrop-blur">
                <f.icon className="mb-3 h-5 w-5 text-[#5ee0ca]" />
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/58">{f.desc}</p>
              </div>
            ))}
          </div>
          <p className="relative text-[11px] text-white/45">Johns Hopkins University - LEAD-CDS Center - Akshintala Lab</p>
        </section>

        <section className="flex items-center justify-center bg-[var(--surface)] px-5 py-12 sm:px-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center">
              <Image src="/endoscribe-logo.svg" alt="EndoScribe" width={170} height={38} className="mx-auto dark:brightness-0 dark:invert" />
              <h2 className="mt-7 text-xl font-semibold text-[var(--text)]">Welcome back</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Sign in to your account to continue</p>
            </div>

            {isSupabaseConfigured ? (
              <div className="app-panel rounded-xl p-5">
                <AuthForm mode="login" onSubmit={handleSubmit} error={error} />
                <p className="mt-4 text-center text-xs text-[var(--muted)]">
                  No account? <Link href="/signup" className="text-[var(--accent-strong)] hover:underline">Request access</Link>
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
                Demo mode active. <Link href="/" className="underline">Enter app</Link>
              </div>
            )}
            <p className="mt-6 text-center text-[10px] text-[var(--subtle)]">
              Access is by invitation. Contact your workspace administrator for an account.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
