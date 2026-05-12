"use client";

import { useEffect, useState, useCallback } from "react";
import { getProfiles, getTaskAssignments, getTasks, updateProfileRole, createAuditLog } from "@/lib/roadmapStore";
import { getCurrentUser, getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/browser";
import type { Profile, TaskAssignment, RoadmapTask } from "@/lib/roadmapTypes";
import { ROLE_OPTIONS } from "@/lib/roadmapTypes";
import ActionMenu from "@/components/ActionMenu";
import { clsx } from "clsx";
import { ShieldAlert, UserPlus, X } from "lucide-react";
import Link from "next/link";

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  function showFb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); }

  const refresh = useCallback(async () => {
    const [p, a, t] = await Promise.all([getProfiles(), getTaskAssignments(), getTasks()]);
    setProfiles(p); setAssignments(a); setTasks(t);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!isSupabaseConfigured) { setAuthorized(false); return; }
      const [role, user] = await Promise.all([getCurrentRole(), getCurrentUser()]);
      if (!checkIsAdmin(role)) { setAuthorized(false); return; }
      setAuthorized(true);
      setCurrentUserId(user?.id ?? null);
      await refresh();
    };
    init();
  }, [refresh]);

  if (authorized === null) return <div className="pt-12 text-center text-sm text-slate-500">Loading...</div>;
  if (!authorized) return (
    <div className="mx-auto max-w-md space-y-4 pt-16 text-center">
      <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto" />
      <h1 className="text-lg font-semibold text-slate-800">Access restricted</h1>
      <p className="text-sm text-slate-500">This page requires administrator access.</p>
      <Link href="/" className="text-sm text-indigo-600 hover:underline">Go to Home</Link>
    </div>
  );

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const adminCount = profiles.filter(p => p.role === "admin" || p.app_role === "admin").length;

  const stats = profiles.map(p => {
    const userAssigns = assignments.filter(a => a.user_id === p.id);
    const assignedTasks = userAssigns.map(a => taskMap.get(a.task_id)).filter(Boolean) as RoadmapTask[];
    const isActive = (p as unknown as { is_active?: boolean }).is_active !== false;
    return { ...p, assigned: assignedTasks.length, isActive };
  });

  let filtered = stats;
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter(u => u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q)); }
  if (filterRole) filtered = filtered.filter(u => (u.app_role ?? u.role) === filterRole);

  async function handleRoleChange(profileId: string, newRole: string) {
    if (profileId === currentUserId && newRole !== "admin" && adminCount <= 1) {
      setError("Cannot demote the only admin.");
      return;
    }
    setError(null);
    try {
      await updateProfileRole(profileId, newRole);
      showFb("Role updated");
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleToggleActive(profile: Profile & { isActive: boolean }) {
    if (profile.is_protected_admin && !confirm("This user is a protected admin. Are you sure?")) return;
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      if (!sb) return;
      const newActive = !profile.isActive;
      await sb.from("profiles").update({ is_active: newActive, deactivated_at: newActive ? null : new Date().toISOString() }).eq("id", profile.id);
      await createAuditLog({ action: newActive ? "user_reactivated" : "user_deactivated", entity_type: "profile", entity_id: profile.id, entity_label: profile.email });
      showFb(newActive ? "User reactivated" : "User deactivated");
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleToggleProtected(profile: Profile) {
    if (profile.is_protected_admin && profile.id === currentUserId) {
      if (!confirm("Remove your own protected admin status? This cannot be undone easily.")) return;
    }
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      if (!sb) return;
      const newVal = !profile.is_protected_admin;
      await sb.from("profiles").update({ is_protected_admin: newVal }).eq("id", profile.id);
      await createAuditLog({ action: "protected_admin_changed", entity_type: "profile", entity_id: profile.id, entity_label: profile.email, new_value: { is_protected_admin: newVal } });
      showFb(newVal ? "Marked as protected admin" : "Protection removed");
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleInvite(email: string, role: string) {
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      if (!sb) return;
      const { data: { user } } = await sb.auth.getUser();
      await sb.from("user_invites").insert({ email, app_role: role, invited_by: user?.id ?? null });
      await createAuditLog({ action: "invite_created", entity_type: "user_invite", entity_label: email, new_value: { email, app_role: role } });
      setShowInvite(false);
      showFb(`Invite created for ${email}`);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  const roleBg: Record<string, string> = { admin: "bg-indigo-50 text-indigo-700 border-indigo-200", user: "bg-slate-100 text-slate-600 border-slate-200" };
  const selCls = "rounded-lg border border-slate-300 px-2 py-1.5 text-xs bg-white focus:border-indigo-400 focus:outline-none";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">{profiles.length} team members | {adminCount} admin(s)</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <UserPlus className="h-4 w-4" /> Invite User
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {feedback && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{feedback}</div>}

      <div className="flex items-center gap-3">
        <input className={selCls + " w-56"} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className={selCls} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">User</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 hidden sm:table-cell">Tasks</th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(u => {
              const displayRole = u.app_role ?? (u.role === "admin" ? "admin" : "user");
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800">{u.full_name || u.email}</p>
                    <p className="text-[10px] text-slate-400">{u.email} {u.id === currentUserId && <span className="text-indigo-600">(you)</span>}</p>
                    {u.is_protected_admin && <span className="text-[10px] text-amber-600 font-medium">Protected</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <select value={displayRole} onChange={e => handleRoleChange(u.id, e.target.value)} className={clsx("rounded-lg border px-2 py-0.5 text-xs font-medium", roleBg[displayRole] ?? roleBg.user)}>
                      {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-medium", u.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>{u.isActive ? "Active" : "Deactivated"}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-xs text-slate-600">{u.assigned}</td>
                  <td className="px-1 py-2.5">
                    <ActionMenu isAdmin={true} actions={[
                      { label: u.isActive ? "Deactivate" : "Reactivate", onClick: () => handleToggleActive(u), danger: u.isActive },
                      { label: u.is_protected_admin ? "Remove protection" : "Mark protected admin", onClick: () => handleToggleProtected(u) },
                    ]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1">
        <p><strong>Admins</strong> can manage users, workspaces, and app structure. <strong>Users</strong> can create and edit tasks and meetings.</p>
        <p><strong>Protected admins</strong> cannot be accidentally demoted or deactivated.</p>
        <p>Deactivated users cannot access the workspace. This does not delete their account.</p>
      </div>

      {/* Invite modal */}
      {showInvite && <InviteModal onSave={handleInvite} onCancel={() => setShowInvite(false)} />}
    </div>
  );
}

function InviteModal({ onSave, onCancel }: { onSave: (email: string, role: string) => void; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const c = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="flex justify-between mb-4"><h3 className="text-lg font-semibold text-slate-800">Invite User</h3><button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button></div>
        <form onSubmit={e => { e.preventDefault(); if (email.trim()) onSave(email.trim(), role); }} className="space-y-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Email *</label><input type="email" className={c} value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@institution.edu" required autoFocus /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Role</label><select className={c} value={role} onChange={e => setRole(e.target.value)}>{ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}</select></div>
          <p className="text-[10px] text-slate-400">The user will need to sign up with this email. Their role will be applied when they join.</p>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Create Invite</button>
          </div>
        </form>
      </div>
    </div>
  );
}
