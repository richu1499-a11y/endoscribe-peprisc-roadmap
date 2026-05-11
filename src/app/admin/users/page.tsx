"use client";

import { useEffect, useState } from "react";
import { getProfiles, getTaskAssignments, getTasks } from "@/lib/roadmapStore";
import { getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { Profile, TaskAssignment, RoadmapTask } from "@/lib/roadmapTypes";
import ComplianceBanner from "@/components/ComplianceBanner";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured) { setAuthorized(false); return; }
      const role = await getCurrentRole();
      if (!checkIsAdmin(role)) { setAuthorized(false); return; }
      setAuthorized(true);
      const [p, a, t] = await Promise.all([getProfiles(), getTaskAssignments(), getTasks()]);
      setProfiles(p);
      setAssignments(a);
      setTasks(t);
    })();
  }, []);

  if (authorized === null) return <div className="pt-12 text-center text-sm text-slate-500">Loading...</div>;

  if (!authorized) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-12">
        <h1 className="text-xl font-bold text-slate-900">User Management</h1>
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <ShieldAlert className="mb-1 h-5 w-5" /> Admin access required. Sign in with an admin account.
        </div>
        <Link href="/login" className="text-sm text-indigo-600 hover:underline">Sign in</Link>
      </div>
    );
  }

  // Build stats per profile
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const stats = profiles.map(p => {
    const userAssigns = assignments.filter(a => a.user_id === p.id);
    const assignedTasks = userAssigns.map(a => taskMap.get(a.task_id)).filter(Boolean) as RoadmapTask[];
    return {
      ...p,
      assigned: assignedTasks.length,
      open: assignedTasks.filter(t => t.status !== "Complete" && t.status !== "Deferred").length,
      blocked: assignedTasks.filter(t => t.status === "Blocked").length,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">User Management</h1>
      <p className="text-sm text-slate-500">{profiles.length} registered users</p>

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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-800">{u.email}</td>
                <td className="px-4 py-2 text-slate-700">{u.full_name || "--"}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700">{u.role}</span>
                </td>
                <td className="px-4 py-2">{u.assigned}</td>
                <td className="px-4 py-2">{u.open}</td>
                <td className="px-4 py-2">{u.blocked > 0 ? <span className="text-red-600">{u.blocked}</span> : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Role Management</h3>
        <p className="text-xs text-slate-600">To change a user&apos;s role, run this in the Supabase SQL Editor:</p>
        <pre className="rounded bg-slate-50 p-3 text-xs font-mono text-slate-700">
{`update profiles set role = 'editor' where email = 'user@example.com';`}
        </pre>
      </div>

      <ComplianceBanner />
    </div>
  );
}
