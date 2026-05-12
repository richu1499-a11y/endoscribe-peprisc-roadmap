"use client";

import { useEffect, useState, useMemo } from "react";
import { getTasks, getTaskAssignments, getProfiles, getTasksWithAssignees, getWorkspaceGroups } from "@/lib/roadmapStore";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/browser";
import type { TaskWithAssignees, WorkspaceGroup } from "@/lib/roadmapTypes";
import Image from "next/image";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";

const WS_COLORS: Record<string, string> = {
  "endoscribe-core": "#3b82f6", "peprisc": "#8b5cf6", "hardware-workflow": "#f59e0b",
  "irb-fda-translation": "#ef4444", "research-study-trial": "#10b981",
};

export default function HomePage() {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [raw, profs, assigns, ws] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments(), getWorkspaceGroups()]);
      setTasks(await getTasksWithAssignees(raw, assigns, profs));
      setWorkspaces(ws);
      if (isSupabaseConfigured) {
        const user = await getCurrentUser();
        setCurrentUserId(user?.id ?? null);
      }
    })();
  }, []);

  const [now] = useState(() => new Date());
  const today = useMemo(() => now.toISOString().slice(0, 10), [now]);

  const active = tasks.filter(t => t.status !== "Complete" && t.status !== "Deferred");
  const highPriority = active.filter(t => t.priority === "Critical" || t.priority === "High");
  const blocked = active.filter(t => t.status === "Blocked");
  const overdue = active.filter(t => t.target_date && t.target_date < today);
  const dueSoon = active.filter(t => t.target_date && t.target_date >= today).sort((a, b) => (a.target_date ?? "").localeCompare(b.target_date ?? "")).slice(0, 6);

  // Group by owner
  const byOwner = useMemo(() => {
    const map = new Map<string, TaskWithAssignees[]>();
    for (const t of active) {
      const owner = t.owner || (t.assignees.length > 0 ? (t.assignees[0].full_name || t.assignees[0].email) : "Unassigned");
      const list = map.get(owner) ?? [];
      list.push(t);
      map.set(owner, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [active]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Image src="/endoscribe-mark.svg" alt="" width={44} height={44} />
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">EndoScribe</h1>
          <p className="text-sm text-slate-500">Project Command Center</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active Tasks" value={active.length} color="bg-blue-500" />
        <StatCard label="High Priority" value={highPriority.length} color="bg-amber-500" />
        <StatCard label="Blocked" value={blocked.length} color={blocked.length > 0 ? "bg-red-500" : "bg-slate-400"} />
        <StatCard label="Overdue" value={overdue.length} color={overdue.length > 0 ? "bg-red-500" : "bg-slate-400"} />
      </div>

      {/* Two columns: Who's doing what + What's due */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* LEFT: Who's doing what */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Who&apos;s doing what</h2>
          <div className="space-y-4">
            {byOwner.slice(0, 6).map(([owner, ownerTasks]) => (
              <div key={owner} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-indigo-700">{owner}</h3>
                  <span className="text-sm text-slate-500">{ownerTasks.length} task{ownerTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {ownerTasks.slice(0, 4).map(t => (
                    <Link key={t.id} href="/workspaces" className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                        <p className="text-xs text-slate-400">{t.workspace}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </Link>
                  ))}
                  {ownerTasks.length > 4 && <p className="text-xs text-slate-400 text-center">+{ownerTasks.length - 4} more</p>}
                </div>
              </div>
            ))}
            {byOwner.length === 0 && <p className="text-sm text-slate-500 p-4">No active tasks yet.</p>}
          </div>
        </section>

        {/* RIGHT: What's due + Workspaces */}
        <div className="space-y-6">

          {/* Overdue */}
          {overdue.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-red-700 mb-4">Overdue ({overdue.length})</h2>
              <div className="space-y-2">
                {overdue.slice(0, 4).map(t => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {/* Due soon */}
          {dueSoon.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Coming up</h2>
              <div className="space-y-2">
                {dueSoon.map(t => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {/* Workspace overview */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Workspaces</h2>
            <div className="grid gap-3 grid-cols-1">
              {workspaces.map(ws => {
                const count = tasks.filter(t => t.workspace === ws.slug && t.status !== "Complete").length;
                const color = WS_COLORS[ws.slug] ?? "#64748b";
                return (
                  <Link key={ws.slug} href="/workspaces" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:shadow-md transition-all">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{ws.title}</p>
                    </div>
                    <span className="text-lg font-bold text-slate-700">{count}</span>
                    <span className="text-xs text-slate-400">active</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Blocked tasks */}
      {blocked.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-red-700 mb-4">Blocked ({blocked.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {blocked.map(t => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 flex items-center gap-4">
      <div className={clsx("h-12 w-12 rounded-xl flex items-center justify-center text-white text-xl font-bold", color)}>{value}</div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
    </div>
  );
}

function TaskRow({ task: t }: { task: TaskWithAssignees }) {
  const owner = t.owner || (t.assignees.length > 0 ? (t.assignees[0].full_name || t.assignees[0].email) : "");
  const borderColor = t.priority === "Critical" ? "border-l-red-500" : t.priority === "High" ? "border-l-amber-500" : t.status === "Blocked" ? "border-l-red-400" : "border-l-slate-200";
  return (
    <Link href="/workspaces" className={clsx("flex items-center justify-between rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 hover:shadow-md transition-all", borderColor)}>
      <div className="min-w-0 flex-1 mr-3">
        <p className="text-sm font-semibold text-slate-900">{t.title}</p>
        <div className="flex gap-3 mt-1 text-xs text-slate-500">
          {owner && <span className="text-indigo-600 font-medium">{owner}</span>}
          <span>{t.workspace}</span>
          {t.target_date && <span>Due {t.target_date}</span>}
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <PriorityBadge priority={t.priority} />
        <StatusBadge status={t.status} />
      </div>
    </Link>
  );
}

function clsx(...args: (string | boolean | undefined)[]) { return args.filter(Boolean).join(" "); }
