"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import AuthForm from "@/components/AuthForm";
import { ListChecks, Briefcase, CalendarDays, Network } from "lucide-react";

const FEATURES = [
  { icon: ListChecks, title: "Task Management", desc: "Create, assign, and track tasks across workspaces." },
  { icon: Briefcase, title: "Workspaces", desc: "Seven organized verticals for project execution." },
  { icon: Network, title: "Roadmap & Network", desc: "Interactive program board and dependency graph." },
  { icon: CalendarDays, title: "Calendar", desc: "Schedule meetings and export calendar invites." },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo + Tagline */}
      <div className="text-center mb-10">
        <Image src="/endoscribe-logo.svg" alt="EndoScribe" width={280} height={64} className="mx-auto" priority />
        <p className="mt-4 text-base text-slate-600 font-medium">Workspace OS</p>
        <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
          Ambient AI workflow and task-management workspace for the EndoScribe + PEPRisc team.
        </p>
      </div>

      {/* Sign in card */}
      <div className="w-full max-w-sm">
        {isSupabaseConfigured ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-5">Sign in</h2>
            <AuthForm mode="login" onSubmit={handleSubmit} error={error} />
            <p className="mt-5 text-center text-sm text-slate-400">
              No account? <Link href="/signup" className="text-indigo-600 hover:underline font-medium">Request access</Link>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center">
            <p className="text-base text-blue-800">Demo mode active. <Link href="/" className="underline font-medium">Enter app</Link></p>
          </div>
        )}
      </div>

      {/* Feature cards */}
      <div className="mt-12 grid grid-cols-2 gap-4 max-w-lg w-full sm:grid-cols-4">
        {FEATURES.map(f => (
          <div key={f.title} className="rounded-xl bg-white/70 border border-slate-200/60 p-4 text-center hover:shadow-md transition-all">
            <f.icon className="h-7 w-7 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">{f.title}</p>
            <p className="text-xs text-slate-400 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-slate-400">Access is limited to invited team members.</p>
    </div>
  );
}
