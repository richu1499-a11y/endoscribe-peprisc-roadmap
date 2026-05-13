"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser";
import { createAuditLog } from "@/lib/roadmapStore";
import { dbRoleForAppRole, normalizeAppRole } from "@/lib/auth";

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

      const applyPendingInvite = async () => {
        const fullName = user.user_metadata?.full_name ?? "";
        const { data: accepted, error: rpcError } = await sb.rpc("accept_user_invite", { p_full_name: fullName });
        if (!rpcError) return Boolean(accepted);

        // Backward-compatible fallback for databases that have not run migration 015 yet.
        const { data: invite } = await sb
          .from("user_invites")
          .select("*")
          .eq("email", user.email)
          .eq("status", "pending")
          .maybeSingle();
        if (!invite) return false;

        const appRole = normalizeAppRole((invite as { app_role?: string }).app_role);
        await sb.from("profiles").upsert({
          id: user.id,
          email: user.email,
          role: dbRoleForAppRole(appRole),
          app_role: appRole,
          is_active: true,
          full_name: fullName,
        });
        await sb.from("user_invites").update({
          status: "accepted",
          accepted_by: user.id,
          accepted_at: new Date().toISOString(),
        }).eq("id", (invite as { id: string }).id);
        await createAuditLog({ action: "invite_accepted", entity_type: "user_invite", entity_id: (invite as { id: string }).id, entity_label: user.email ?? "" });
        return true;
      };

      const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
      if (cancelled) return;

      if (!profile) {
        if (await applyPendingInvite()) {
          setStatus("ok");
        } else {
          setStatus("done");
          router.replace("/pending-approval");
        }
        return;
      }

      // Check if user is active
      const isActive = (profile as unknown as { is_active?: boolean }).is_active;
      if (isActive === false) {
        setStatus("done");
        router.replace("/access-deactivated");
        return;
      }

      // Check for pending invite that wasn't yet applied
      if (!profile.app_role || profile.role === "viewer") {
        const accepted = await applyPendingInvite();
        if (!accepted && profile.role === "viewer" && profile.app_role !== "admin") {
          setStatus("done");
          router.replace("/pending-approval");
          return;
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
          <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-xs text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
