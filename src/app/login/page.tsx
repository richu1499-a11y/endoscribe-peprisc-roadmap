"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-12">
        <h1 className="text-xl font-bold text-slate-900">Sign In</h1>
        <div className="rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Supabase is not configured. The app is running in local demo mode.
          Configure Supabase credentials in <code className="text-xs">.env.local</code> to enable authentication.
        </div>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">Back to dashboard</Link>
      </div>
    );
  }

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
    <div className="mx-auto max-w-md space-y-4 pt-12">
      <div className="flex items-center gap-2 mb-2">
        <Image src="/endoscribe-logo.svg" alt="EndoScribe" width={140} height={32} />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Sign In</h1>
      <p className="text-sm text-slate-500">Sign in to the EndoScribe Workspace OS.</p>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <AuthForm mode="login" onSubmit={handleSubmit} error={error} />
      </div>
      <p className="text-center text-xs text-slate-500">
        No account? <Link href="/signup" className="text-indigo-600 hover:underline">Create one</Link>
      </p>
    </div>
  );
}
