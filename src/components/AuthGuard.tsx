"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser";
import { createAuditLog } from "@/lib/roadmapStore";

const PUBLIC_PATHS = ["/login", "/signup", "/access-restricted", "/access-deactivated", "/pending-approval"];
function isPublicPath(p: string) { return PUBLIC_PATHS.some(pub => p.startsWith(pub)); }

interface Props { children: React.ReactNode }

export default function AuthGuard({ children }: Props) {
  const pathname = usePathname();
  const skipGuard = !isSupabaseConfigured || isPublicPath(pathname);
  const [status, setStatus] = useState<"loading" | "ok" | "done">(skipGuard ? "ok" : "loading");
  const router = useRouter();

  useEffect(() => {
    if (skipGuard) return;

    let cancelled = false;
    (async () => {
      const sb = getSupabaseBrowser();
      if (!sb) { setStatus("ok"); return; }

      const { data: { user } } = await sb.auth.getUser();
      if (!user) { if (!cancelled) router.replace("/login"); return; }

      const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
      if (cancelled) return;

      if (!profile) {
        // New user — check allowed_users first, then fall back to user_invites
        const { data: allowed } = await sb.from("allowed_users").select("*").eq("email", user.email).single();

        if (allowed && allowed.status === "active") {
          // Pre-approved user: create profile with assigned role
          const role = allowed.role === "admin" ? "admin" : allowed.role === "editor" ? "editor" : "viewer";
          const appRole = allowed.role === "admin" ? "admin" : "user";
          await sb.from("profiles").upsert({
            id: user.id, email: user.email, role, app_role: appRole,
            is_active: true, full_name: allowed.full_name || user.user_metadata?.full_name || "",
          });
          await sb.from("allowed_users").update({ accepted_at: new Date().toISOString(), last_seen_at: new Date().toISOString() }).eq("id", allowed.id);
          await createAuditLog({ action: "allowed_user_accepted", entity_type: "allowed_users", entity_id: allowed.id, entity_label: user.email ?? "" });
          setStatus("ok");
          return;
        }

        // Fall back to user_invites (legacy)
        const { data: invite } = await sb.from("user_invites").select("*").eq("email", user.email).eq("status", "pending").single();
        if (invite) {
          await sb.from("profiles").upsert({ id: user.id, email: user.email, role: invite.app_role === "admin" ? "admin" : "editor", app_role: invite.app_role, is_active: true, full_name: user.user_metadata?.full_name ?? "" });
          await sb.from("user_invites").update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString() }).eq("id", invite.id);
          await createAuditLog({ action: "invite_accepted", entity_type: "user_invite", entity_id: invite.id, entity_label: user.email ?? "" });
          setStatus("ok");
        } else {
          setStatus("done");
          router.replace("/pending-approval");
        }
        return;
      }

      // Existing user — check if active
      const isActive = (profile as unknown as { is_active?: boolean }).is_active;
      if (isActive === false) {
        setStatus("done");
        router.replace("/access-deactivated");
        return;
      }

      // Update last_seen on allowed_users if exists
      if (user.email) {
        sb.from("allowed_users").update({ last_seen_at: new Date().toISOString() }).eq("email", user.email).then(() => {});
      }

      // Check for pending invite that wasn't yet applied (legacy)
      if (!profile.app_role || profile.app_role === "user") {
        const { data: invite } = await sb.from("user_invites").select("*").eq("email", user.email).eq("status", "pending").single();
        if (invite) {
          await sb.from("profiles").update({ app_role: invite.app_role, role: invite.app_role === "admin" ? "admin" : "editor" }).eq("id", user.id);
          await sb.from("user_invites").update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString() }).eq("id", invite.id);
        }
      }

      setStatus("ok");
    })();

    return () => { cancelled = true; };
  }, [pathname, router, skipGuard]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-xs text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
