"use client";

import { useEffect, useState, useMemo } from "react";
import { getTasks, getTaskAssignments, getProfiles, getTasksWithAssignees } from "@/lib/roadmapStore";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/browser";
import type { TaskWithAssignees } from "@/lib/roadmapTypes";
import Image from "next/image";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import MetricCard from "@/components/MetricCard";
import { Plus, CalendarDays, Briefcase, ListChecks, Network } from "lucide-react";

interface Meeting { id: string; title: string; start_time: string | null }

const isDev = process.env.NODE_ENV === "development";

export default function HomePage() {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [rawTasks, profs, assigns] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments()]);
      const enriched = await getTasksWithAssignees(rawTasks, assigns, profs);
      setTasks(enriched);
      if (isSupabaseConfigured) {
        const user = await getCurrentUser();
        setCurrentUserId(user?.id ?? null);
        const sb = getSupabaseBrowser();
        if (sb) {
          const { data } = await sb.from("meetings").select("id, title, start_time").order("start_time", { ascending: true }).limit(5);
          if (data) setMeetings((data as Meeting[]).filter(m => !m.start_time || new Date(m.start_time) >= new Date()));
        }
      }
    })();
  }, []);

  const [now] = useState(() => new Date());
  const today = useMemo(() => now.toISOString().slice(0, 10), [now]);

  const myTasks = currentUserId ? tasks.filter(t => t.assignees.some(a => a.id === currentUserId)) : [];
  const myOpen = myTasks.filter(t => t.status !== "Complete" && t.status !== "Deferred");
  const myDueSoon = myTasks.filter(t => t.target_date && t.target_date >= today && t.status !== "Complete").sort((a, b) => (a.target_date ?? "").localeCompare(b.target_date ?? "")).slice(0, 5);
  const myOverdue = myTasks.filter(t => t.target_date && t.target_date < today && t.status !== "Complete");
  const totalActive = tasks.filter(t => t.status !== "Complete" && t.status !== "Deferred").length;
  const totalBlocked = tasks.filter(t => t.status === "Blocked").length;
  const totalCritical = tasks.filter(t => t.priority === "Critical" || t.priority === "High").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Image src="/endoscribe-mark.svg" alt="" width={44} height={44} />
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Welcome back</h1>
          <p className="text-sm text-slate-500">EndoScribe Workspace OS</p>
        </div>
      </div>

      {!isSupabaseConfigured && isDev && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-800">Demo mode. <Link href="/setup" className="underline">Configure</Link></div>
      )}
      {!isSupabaseConfigured && !isDev && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-800"><strong>Setup required.</strong> <Link href="/setup" className="underline">View setup</Link></div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Active Tasks" value={totalActive} accent="blue" />
        <MetricCard label="My Open" value={myOpen.length} />
        <MetricCard label="High Priority" value={totalCritical} accent={totalCritical > 0 ? "amber" : "default"} />
        <MetricCard label="Blocked" value={totalBlocked} accent={totalBlocked > 0 ? "red" : "default"} />
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { href: "/tasks", icon: Plus, label: "New Task" },
            { href: "/calendar", icon: CalendarDays, label: "New Meeting" },
            { href: "/workspaces", icon: Briefcase, label: "Workspaces" },
            { href: "/tasks", icon: ListChecks, label: "All Tasks" },
            { href: "/network", icon: Network, label: "Roadmap Map" },
          ].map(a => (
            <Link key={a.label} href={a.href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-5 hover:border-indigo-300 hover:shadow-lg transition-all">
              <a.icon className="h-6 w-6 text-indigo-600" />
              <span className="text-base font-semibold text-slate-800">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Overdue */}
      {myOverdue.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-red-700 mb-4">Overdue ({myOverdue.length})</h2>
          <div className="space-y-3">
            {myOverdue.slice(0, 5).map(t => (
              <Link key={t.id} href="/tasks" className="flex items-center justify-between rounded-xl border border-red-200 border-l-4 border-l-red-500 bg-red-50/40 px-6 py-5 hover:shadow-lg transition-all">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-base font-semibold text-slate-900">{t.title}</p>
                  <p className="text-sm text-red-600 mt-1 font-medium">Due {t.target_date}</p>
                  {t.owner && <p className="text-sm text-slate-500">Owner: {t.owner}</p>}
                </div>
                <PriorityBadge priority={t.priority} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Due soon */}
      {myDueSoon.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Due Soon</h2>
          <div className="space-y-3">
            {myDueSoon.map(t => (
              <Link key={t.id} href="/tasks" className="flex items-center justify-between rounded-xl border border-slate-200 border-l-4 border-l-blue-500 bg-white px-6 py-5 hover:shadow-lg transition-all">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-base font-semibold text-slate-900">{t.title}</p>
                  <p className="text-sm text-slate-500 mt-1">Due {t.target_date}</p>
                  {t.owner && <p className="text-sm text-slate-500">Owner: {t.owner}</p>}
                </div>
                <div className="flex gap-2"><StatusBadge status={t.status} /><PriorityBadge priority={t.priority} /></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* No tasks */}
      {currentUserId && myTasks.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-16 text-center">
          <p className="text-lg text-slate-600">No tasks assigned to you yet.</p>
          <Link href="/workspaces" className="mt-3 inline-block text-base text-indigo-600 hover:underline font-medium">Open a workspace to get started</Link>
        </div>
      )}

      {/* Upcoming meetings */}
      {meetings.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Upcoming Meetings</h2>
          <div className="space-y-3">
            {meetings.map(m => (
              <Link key={m.id} href="/calendar" className="flex items-center justify-between rounded-xl border border-slate-200 border-l-4 border-l-indigo-500 bg-white px-6 py-5 hover:shadow-lg transition-all">
                <p className="text-base font-semibold text-slate-900">{m.title}</p>
                <p className="text-sm text-slate-500">{m.start_time ? new Date(m.start_time).toLocaleDateString() : "No date"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
