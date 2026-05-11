"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { Database, HardDrive, ShieldAlert } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/roadmapTypes";
import Link from "next/link";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      if (u) setProfile(await getCurrentProfile());
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {/* Connection status */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          {isSupabaseConfigured ? <Database className="h-5 w-5 text-green-600" /> : <HardDrive className="h-5 w-5 text-amber-500" />}
          {isSupabaseConfigured ? "Supabase Live Mode" : "Mock Demo Mode"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {isSupabaseConfigured
            ? "Connected to Supabase. Tasks are persisted and real-time sync is active."
            : "Supabase is not configured. Using local mock data. Changes are lost on reload."
          }
        </p>

        <div className="mt-4 space-y-1 text-xs text-slate-600">
          <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing"}</p>
          <p>Anon key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "configured" : "missing"}</p>
          <p>Mode: <strong>{isSupabaseConfigured ? "Live" : "Mock demo"}</strong></p>
          {user && <p>Signed in: {user.email}</p>}
          {profile && <p>Role: <strong>{profile.role}</strong></p>}
        </div>
      </div>

      {/* Auth status */}
      {isSupabaseConfigured && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-800">Authentication</h2>
          {user ? (
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>Email: {user.email}</p>
              <p>Name: {profile?.full_name || "--"}</p>
              <p>Role: <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700">{profile?.role ?? "unknown"}</span></p>
              <Link href="/account" className="text-xs text-indigo-600 hover:underline">Manage account</Link>
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-600">
              <p>Not signed in.</p>
              <Link href="/login" className="text-xs text-indigo-600 hover:underline">Sign in</Link>
            </div>
          )}
        </div>
      )}

      {/* Setup instructions */}
      {!isSupabaseConfigured && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">How to Connect Supabase</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
            <li>Create a project at <span className="font-mono text-xs">supabase.com</span></li>
            <li>Run <code className="text-xs bg-slate-100 px-1 rounded">supabase/schema.sql</code> in the SQL Editor</li>
            <li>Run <code className="text-xs bg-slate-100 px-1 rounded">supabase/seed.sql</code> to load task data</li>
            <li>Copy URL and anon key from Settings &gt; API</li>
            <li>Create <code className="text-xs bg-slate-100 px-1 rounded">.env.local</code> with the keys</li>
            <li>Enable Realtime for the tasks table</li>
            <li>Restart: <code className="text-xs bg-slate-100 px-1 rounded">npm run dev</code></li>
          </ol>
          <Link href="/setup" className="text-xs text-indigo-600 hover:underline">Run setup diagnostics</Link>
        </div>
      )}

      <ComplianceBanner />

      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-red-800">
          <ShieldAlert className="h-5 w-5" /> Data Safety
        </h2>
        <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-red-700">
          <li>Do not enter PHI, patient identifiers, MRNs, DOBs, or accession numbers</li>
          <li>Do not upload patient audio, transcripts, or procedure notes</li>
          <li>This is a roadmap/task-management system only</li>
          <li>All clinical data must remain in Hopkins-approved environments</li>
        </ul>
      </div>
    </div>
  );
}
