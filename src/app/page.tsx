"use client";

import { useEffect, useState, useMemo } from "react";
import { getTasks, getTaskAssignments, getProfiles, getTasksWithAssignees } from "@/lib/roadmapStore";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import type { TaskWithAssignees } from "@/lib/roadmapTypes";
import Image from "next/image";
import Link from "next/link";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import ComplianceBanner from "@/components/ComplianceBanner";

const isDev = process.env.NODE_ENV === "development";

export default function HomePage() {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [rawTasks, profs, assigns] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments()]);
      const enriched = await getTasksWithAssignees(rawTasks, assigns, profs);
      setTasks(enriched.filter(t => !t.is_archived));
      if (isSupabaseConfigured) {
        const user = await getCurrentUser();
        setCurrentUserId(user?.id ?? null);
      }
    })();
  }, []);

  const [now] = useState(() => new Date());
  const today = useMemo(() => now.toISOString().slice(0, 10), [now]);

  const myTasks = currentUserId ? tasks.filter(t => t.assignees.some(a => a.id === currentUserId)) : [];
  const myOpen = myTasks.filter(t => t.status !== "Complete" && t.status !== "Deferred");
  const myOverdue = myTasks.filter(t => t.target_date && t.target_date < today && t.status !== "Complete");
  const myBlocked = myTasks.filter(t => t.status === "Blocked");
  const totalOpen = tasks.filter(t => t.status !== "Complete" && t.status !== "Deferred").length;
  const totalBlocked = tasks.filter(t => t.status === "Blocked").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hero */}
      <div className="flex items-center gap-3">
        <Image src="/endoscribe-mark.svg" alt="" width={36} height={36} />
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">EndoScribe</h1>
          <p className="text-xs text-slate-500">Workspace OS -- Command Center</p>
        </div>
      </div>

      <ComplianceBanner />

      {!isSupabaseConfigured && isDev && (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          Demo mode. <Link href="/setup" className="underline">Configure Supabase</Link>
        </div>
      )}
      {!isSupabaseConfigured && !isDev && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Configuration required.</strong> <Link href="/setup" className="underline">View setup</Link>
        </div>
      )}

      {/* My Work */}
      {currentUserId && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">My Work</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="My Open" value={myOpen.length} accent="blue" />
            <MetricCard label="Overdue" value={myOverdue.length} accent={myOverdue.length > 0 ? "red" : "default"} />
            <MetricCard label="Blocked" value={myBlocked.length} accent={myBlocked.length > 0 ? "red" : "default"} />
            <MetricCard label="My Total" value={myTasks.length} />
          </div>
          {myOpen.length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
              {myOpen.slice(0, 8).map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{t.title}</p>
                    <p className="text-xs text-slate-500">Due: {t.target_date ?? "--"} | Next: {t.next_action || "--"}</p>
                  </div>
                  <div className="flex gap-2"><StatusBadge status={t.status} /><PriorityBadge priority={t.priority} /></div>
                </div>
              ))}
            </div>
          )}
          {myOpen.length === 0 && myTasks.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">No tasks assigned to you yet. <Link href="/workspaces" className="text-indigo-600 hover:underline">Open a workspace</Link> to create tasks.</p>
          )}
        </section>
      )}

      {/* Team overview */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Team Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Active Tasks" value={totalOpen} />
          <MetricCard label="Blocked" value={totalBlocked} accent={totalBlocked > 0 ? "red" : "default"} />
          <MetricCard label="Total Tasks" value={tasks.length} />
          <MetricCard label="Workspaces" value={5} accent="blue" />
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/tasks" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors">
            <h3 className="text-sm font-semibold text-slate-800">Tasks</h3>
            <p className="text-xs text-slate-500 mt-1">View and manage all tasks with filters and assignments.</p>
          </Link>
          <Link href="/workspaces" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors">
            <h3 className="text-sm font-semibold text-slate-800">Workspaces</h3>
            <p className="text-xs text-slate-500 mt-1">Organized project verticals for the EndoScribe roadmap.</p>
          </Link>
          <Link href="/calendar" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors">
            <h3 className="text-sm font-semibold text-slate-800">Calendar</h3>
            <p className="text-xs text-slate-500 mt-1">Schedule and track meetings and reviews.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
