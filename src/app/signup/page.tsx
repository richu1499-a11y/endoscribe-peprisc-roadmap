"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-12">
        <h1 className="text-xl font-bold text-slate-900">Create Account</h1>
        <div className="rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Supabase is not configured. Configure credentials in <code className="text-xs">.env.local</code> first.
        </div>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">Back to dashboard</Link>
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
        <h1 className="text-xl font-bold text-slate-900">Account Created</h1>
        <div className="rounded border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Check your email for a confirmation link. After confirming, you can sign in.
          New accounts start with <strong>viewer</strong> role. An admin can upgrade your role.
        </div>
        <Link href="/login" className="text-sm text-indigo-600 hover:underline">Go to Sign In</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 pt-12">
      <h1 className="text-xl font-bold text-slate-900">Create Account</h1>
      <p className="text-sm text-slate-500">
        New accounts receive <strong>viewer</strong> access. Contact an admin for editor/admin role.
      </p>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <AuthForm mode="signup" onSubmit={handleSubmit} error={error} />
      </div>
      <p className="text-center text-xs text-slate-500">
        Already have an account? <Link href="/login" className="text-indigo-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
