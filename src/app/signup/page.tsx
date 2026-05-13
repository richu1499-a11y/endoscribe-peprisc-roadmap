"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import AuthForm from "@/components/AuthForm";
import ThemeToggle from "@/components/ThemeToggle";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-12">
        <h1 className="text-xl font-bold text-[var(--text)]">Create Account</h1>
        <div className="rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          Supabase is not configured. Configure credentials in <code className="text-xs">.env.local</code> first.
        </div>
        <Link href="/" className="text-sm text-[var(--accent-strong)] hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  async function handleSubmit(email: string, password: string, fullName?: string) {
    setError(null);
    try {
      await signUp(email, password, fullName ?? "");
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-12">
        <h1 className="text-xl font-bold text-[var(--text)]">Account Created</h1>
        <div className="rounded border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-100">
          Check your email for a confirmation link. After confirming, invited accounts are admitted automatically.
        </div>
        <Link href="/login" className="text-sm text-[var(--accent-strong)] hover:underline">Go to Sign In</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="fixed right-5 top-5"><ThemeToggle /></div>
      <div className="w-full max-w-md space-y-4">
      <h1 className="text-2xl font-semibold text-[var(--text)]">Request Access</h1>
      <p className="text-sm text-[var(--muted)]">
        Use the email your administrator pre-approved. Uninvited accounts remain pending.
      </p>
      <div className="app-card rounded-xl p-6">
        <AuthForm mode="signup" onSubmit={handleSubmit} error={error} />
      </div>
      <p className="text-center text-xs text-[var(--muted)]">
        Already have an account? <Link href="/login" className="text-[var(--accent-strong)] hover:underline">Sign in</Link>
      </p>
      </div>
    </div>
  );
}
