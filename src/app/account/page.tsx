"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getCurrentProfile, signOut, isSupabaseConfigured } from "@/lib/auth";
import type { Profile } from "@/lib/roadmapTypes";
import type { User } from "@supabase/supabase-js";
import { LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      const u = await getCurrentUser();
      if (cancelled) return;
      setUser(u);
      if (u) {
        const p = await getCurrentProfile();
        if (!cancelled) setProfile(p);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-12">
        <h1 className="text-xl font-bold text-slate-900">Account</h1>
        <p className="text-sm text-slate-500">Supabase not configured. Running in demo mode.</p>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="pt-12 text-center text-sm text-slate-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-12">
        <h1 className="text-xl font-bold text-slate-900">Account</h1>
        <p className="text-sm text-slate-500">You are not signed in.</p>
        <Link href="/login" className="text-sm text-indigo-600 hover:underline">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-8">
      <h1 className="text-xl font-bold text-slate-900">Account</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
        <div>
          <span className="text-xs font-medium text-slate-500">Email</span>
          <p className="text-sm text-slate-800">{user.email}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">Name</span>
          <p className="text-sm text-slate-800">{profile?.full_name || user.user_metadata?.full_name || "--"}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">Role</span>
          <p className="text-sm">
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {profile?.role ?? "unknown"}
            </span>
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">User ID</span>
          <p className="font-mono text-xs text-slate-500">{user.id}</p>
        </div>
      </div>

      <button
        onClick={async () => { await signOut(); router.push("/login"); router.refresh(); }}
        className="flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </button>

      <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Do not store PHI, patient identifiers, or clinical data in your account or this application.</span>
      </div>
    </div>
  );
}
