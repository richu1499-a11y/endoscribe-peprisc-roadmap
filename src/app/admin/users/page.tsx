"use client";

import { useEffect, useState, useCallback } from "react";
import { getProfiles, getTaskAssignments, getTasks, updateProfileRole } from "@/lib/roadmapStore";
import { getCurrentUser, getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { Profile, TaskAssignment, RoadmapTask } from "@/lib/roadmapTypes";
import { ROLE_OPTIONS } from "@/lib/roadmapTypes";
import ComplianceBanner from "@/components/ComplianceBanner";
import { clsx } from "clsx";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");

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
    <div className="mx-auto max-w-md space-y-4 pt-12">
      <h1 className="text-xl font-bold text-slate-900">User Management</h1>
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert className="mb-1 h-5 w-5" /> Admin access required.</div>
      <Link href="/login" className="text-sm text-indigo-600 hover:underline">Sign in</Link>
    </div>
  );

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const adminCount = profiles.filter(p => p.role === "admin").length;

  const stats = profiles.map(p => {
    const userAssigns = assignments.filter(a => a.user_id === p.id);
    const assignedTasks = userAssigns.map(a => taskMap.get(a.task_id)).filter(Boolean) as RoadmapTask[];
    return { ...p, assigned: assignedTasks.length, open: assignedTasks.filter(t => t.status !== "Complete" && t.status !== "Deferred").length, blocked: assignedTasks.filter(t => t.status === "Blocked").length };
  });

  let filtered = stats;
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter(u => u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q)); }
  if (filterRole) filtered = filtered.filter(u => u.role === filterRole);

  async function handleRoleChange(profileId: string, newRole: string) {
    // Prevent demoting the only admin
    if (profileId === currentUserId && newRole !== "admin" && adminCount <= 1) {
      setError("Cannot demote the only admin. Promote another user to admin first.");
      return;
    }
    setError(null);
    try {
      await updateProfileRole(profileId, newRole);
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to update role"); }
  }

  const selCls = "rounded border border-slate-300 px-2 py-1 text-xs bg-white focus:border-indigo-400 focus:outline-none";
  const roleBg: Record<string, string> = { admin: "bg-red-50 text-red-700 border-red-200", editor: "bg-blue-50 text-blue-700 border-blue-200", viewer: "bg-slate-100 text-slate-600 border-slate-200" };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-xl font-bold text-slate-900">User Management</h1>
      <p className="text-sm text-slate-500">{profiles.length} registered users | {adminCount} admin(s)</p>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex items-center gap-3">
        <input className={selCls + " w-56"} placeholder="Search email or name..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className={selCls} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Assigned</th>
              <th className="px-4 py-2.5">Open</th>
              <th className="px-4 py-2.5">Blocked</th>
              <th className="px-4 py-2.5">Change Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-800">{u.email} {u.id === currentUserId && <span className="text-[10px] text-indigo-600">(you)</span>}</td>
                <td className="px-4 py-2 text-slate-700">{u.full_name || "--"}</td>
                <td className="px-4 py-2"><span className={clsx("rounded border px-1.5 py-0.5 text-xs font-medium", roleBg[u.role] ?? roleBg.viewer)}>{u.role}</span></td>
                <td className="px-4 py-2">{u.assigned}</td>
                <td className="px-4 py-2">{u.open}</td>
                <td className="px-4 py-2">{u.blocked > 0 ? <span className="text-red-600">{u.blocked}</span> : 0}</td>
                <td className="px-4 py-2">
                  <select className={clsx(selCls, "w-24")} value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}>
                    {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1">
        <p><strong>Role changes take effect immediately.</strong> The user may need to refresh their browser.</p>
        <p>Admins can manage all data. Editors can create/edit tasks and items. Viewers can read only.</p>
        <p>Role changes are recorded in the audit log.</p>
      </div>

      <ComplianceBanner />
    </div>
  );
}
