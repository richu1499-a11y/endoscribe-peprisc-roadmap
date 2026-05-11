"use client";

import { useEffect, useState } from "react";
import { getWorkstreams, getTasks, getTaskAssignments, getProfiles, getTasksWithAssignees } from "@/lib/roadmapStore";
import type { RoadmapTask, Workstream, TaskWithAssignees, TaskAssignment } from "@/lib/roadmapTypes";
import { summarizeRoadmapHealth } from "@/lib/validation";
import { tasksDueSoon } from "@/lib/roadmapUtils";
import { getCurrentUser } from "@/lib/auth";
import ComplianceBanner from "@/components/ComplianceBanner";
import MetricCard from "@/components/MetricCard";
import WorkstreamSummary from "@/components/WorkstreamSummary";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import Link from "next/link";

const isDev = process.env.NODE_ENV === "development";

function isInCurrentWeek(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return d >= startOfWeek && d <= endOfWeek;
}

export default function HomePage() {
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [enrichedTasks, setEnrichedTasks] = useState<TaskWithAssignees[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);

  useEffect(() => {
    (async () => {
      const [ws, rawTasks, profs, assigns] = await Promise.all([
        getWorkstreams(), getTasks(), getProfiles(), getTaskAssignments(),
      ]);
      setWorkstreams(ws);
      setTasks(rawTasks);
      setAssignments(assigns);
      setEnrichedTasks(await getTasksWithAssignees(rawTasks, assigns, profs));
      if (isSupabaseConfigured) {
        const user = await getCurrentUser();
        setCurrentUserId(user?.id ?? null);
      }
    })();
  }, []);

  const health = summarizeRoadmapHealth(tasks);
  const dueSoon = tasksDueSoon(tasks, 30);
  const criticalTasks = tasks.filter(t => t.priority === "Critical");

  // My week
  const myAssignedIds = new Set(assignments.filter(a => a.user_id === currentUserId).map(a => a.task_id));
  const myTasks = enrichedTasks.filter(t => myAssignedIds.has(t.id));
  const myWeekTasks = myTasks.filter(t =>
    isInCurrentWeek(t.target_date) || t.status === "In progress"
  );
  const myOverdue = myTasks.filter(t => t.target_date && t.target_date < new Date().toISOString().slice(0, 10) && t.status !== "Complete");
  const myBlocked = myTasks.filter(t => t.status === "Blocked");
  const myCritical = myTasks.filter(t => t.priority === "Critical");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">EndoScribe + PEPRisc Roadmap OS</h1>
        <p className="mt-1 text-sm text-slate-500">Shared GSD execution dashboard</p>
      </div>

      <ComplianceBanner />

      {!isSupabaseConfigured && isDev && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          Demo mode. <Link href="/setup" className="underline">Configure Supabase</Link>
        </div>
      )}
      {!isSupabaseConfigured && !isDev && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Configuration required.</strong> <Link href="/setup" className="underline">View setup</Link>
        </div>
      )}

      {/* My Week -- shown when signed in with assignments */}
      {currentUserId && myTasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">My Week</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-4">
            <MetricCard label="My Assigned" value={myTasks.length} />
            <MetricCard label="This Week" value={myWeekTasks.length} accent="blue" />
            <MetricCard label="Overdue" value={myOverdue.length} accent={myOverdue.length > 0 ? "red" : "default"} />
            <MetricCard label="Blocked" value={myBlocked.length} accent={myBlocked.length > 0 ? "red" : "default"} />
            <MetricCard label="Critical" value={myCritical.length} accent={myCritical.length > 0 ? "amber" : "default"} />
          </div>
          {myWeekTasks.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
              {myWeekTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="mr-2 font-mono text-xs text-slate-500">{t.id}</span>
                    <span className="text-sm font-medium text-slate-800">{t.title}</span>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Due: {t.target_date ?? "--"} | Next: {t.next_action || "--"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {myWeekTasks.length === 0 && myTasks.length > 0 && (
            <p className="text-sm text-slate-500">No tasks due this week. <Link href="/tasks" className="text-indigo-600 underline">View all your tasks</Link></p>
          )}
        </section>
      )}

      {currentUserId && myTasks.length === 0 && isSupabaseConfigured && (
        <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No tasks assigned to you yet. An admin can assign tasks from the Tasks page.
        </div>
      )}

      {/* Global metrics */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Project Status</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Total Tasks" value={health.total} />
          <MetricCard label="Blocked" value={health.blocked} accent={health.blocked > 0 ? "red" : "default"} />
          <MetricCard label="Critical" value={health.critical} accent={health.critical > 0 ? "amber" : "default"} />
          <MetricCard label="High FDA" value={health.highFda} accent={health.highFda > 0 ? "amber" : "default"} />
          <MetricCard label="High HIPAA" value={health.highHipaa} accent={health.highHipaa > 0 ? "red" : "default"} />
          <MetricCard label="Due (30d)" value={dueSoon.length} accent="blue" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Workstreams</h2>
        <WorkstreamSummary workstreams={workstreams} tasks={tasks} />
      </section>

      {criticalTasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Critical Next Actions</h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {criticalTasks.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="mr-2 font-mono text-xs text-slate-500">{t.id}</span>
                  <span className="text-sm font-medium text-slate-800">{t.title}</span>
                  <p className="mt-0.5 text-xs text-slate-500">Next: {t.next_action || "--"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
