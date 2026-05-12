"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import AuthForm from "@/components/AuthForm";
import { ListChecks, Briefcase, CalendarDays, BarChart3 } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo + Tagline */}
      <div className="text-center mb-8">
        <Image src="/endoscribe-logo.svg" alt="EndoScribe" width={180} height={40} className="mx-auto" />
        <p className="mt-3 text-sm text-slate-600">Ambient AI workflow and task-management workspace</p>
        <p className="mt-1 text-xs text-slate-400">Coordinate tasks, meetings, and project execution from one secure workspace.</p>
      </div>

      {/* Sign in card */}
      <div className="w-full max-w-sm">
        {isSupabaseConfigured ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Sign in</h2>
            <AuthForm mode="login" onSubmit={handleSubmit} error={error} />
            <p className="mt-4 text-center text-xs text-slate-400">
              No account? <Link href="/signup" className="text-indigo-600 hover:underline">Request access</Link>
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
            <p className="text-sm text-blue-800">Demo mode active. <Link href="/" className="underline">Enter app</Link></p>
          </div>
        )}
      </div>

      {/* Feature cards */}
      <div className="mt-10 grid grid-cols-2 gap-3 max-w-md w-full sm:grid-cols-4">
        {FEATURES.map(f => (
          <div key={f.title} className="rounded-lg bg-white/60 border border-slate-200/50 p-3 text-center">
            <f.icon className="h-5 w-5 text-indigo-500 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-700">{f.title}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-[10px] text-slate-400">Access is limited to invited team members.</p>
    </div>
  );
}
