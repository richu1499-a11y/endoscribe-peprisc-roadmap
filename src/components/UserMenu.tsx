"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/browser";
import { signOut } from "@/lib/auth";
import { User, LogIn, LogOut } from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

export default function UserMenu() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabaseBrowser();
    if (!sb) return;

    sb.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) {
        sb.from("profiles").select("role, app_role").eq("id", u.id).single()
          .then(({ data }) => setRole(data?.app_role === "admin" || data?.role === "admin" ? "admin" : "user"));
      }
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        sb.from("profiles").select("role, app_role").eq("id", session.user.id).single()
          .then(({ data }) => setRole(data?.app_role === "admin" || data?.role === "admin" ? "admin" : "user"));
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <span className="text-xs text-[var(--subtle)]">Demo mode</span>;
  }

  if (!user) {
    return (
      <Link href="/login" className="flex items-center gap-1 text-xs text-[var(--accent-strong)] hover:underline">
        <LogIn className="h-3.5 w-3.5" /> Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/account" className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--text)]">
        <User className="h-3.5 w-3.5" />
        <span className="max-w-[140px] truncate">{user.email}</span>
        {role && <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-strong)]">{role}</span>}
      </Link>
      <button onClick={async () => { await signOut(); window.location.href = "/"; }} className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--rose)]">
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
