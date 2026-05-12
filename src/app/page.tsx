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
      setTasks(enriched.filter(t => !t.is_archived));
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
  const myDueSoon = myTasks.filter(t => t.target_date && t.target_date >= today && t.status !== "Complete").sort((a, b) => (a.target_date ?? "").localeCompare(b.target_date ?? "")).slice(0, 5);
  const myOverdue = myTasks.filter(t => t.target_date && t.target_date < today && t.status !== "Complete");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Image src="/endoscribe-mark.svg" alt="" width={32} height={32} />
        <div>
          <h1 className="text-xl font-bold text-[#1e3a5f]">Welcome back</h1>
          <p className="text-xs text-slate-500">EndoScribe Workspace OS</p>
        </div>
      </div>

      {!isSupabaseConfigured && isDev && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">Demo mode. <Link href="/setup" className="underline">Configure</Link></div>
      )}
      {!isSupabaseConfigured && !isDev && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"><strong>Setup required.</strong> <Link href="/setup" className="underline">View setup</Link></div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Link href="/tasks" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-indigo-300 transition-colors">
          <Plus className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium text-slate-700">New Task</span>
        </Link>
        <Link href="/calendar" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-indigo-300 transition-colors">
          <CalendarDays className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium text-slate-700">New Meeting</span>
        </Link>
        <Link href="/workspaces" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-indigo-300 transition-colors">
          <Briefcase className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium text-slate-700">Workspaces</span>
        </Link>
        <Link href="/tasks" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-indigo-300 transition-colors">
          <ListChecks className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium text-slate-700">All Tasks</span>
        </Link>
        <Link href="/network" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-indigo-300 transition-colors">
          <Network className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium text-slate-700">Roadmap Map</span>
        </Link>
      </div>

      {/* Overdue */}
      {myOverdue.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-700 mb-2">Overdue ({myOverdue.length})</h2>
          <div className="rounded-lg border border-red-200 bg-white divide-y divide-slate-100">
            {myOverdue.slice(0, 5).map(t => (
              <Link key={t.id} href="/tasks" className="flex items-center justify-between px-4 py-2.5 hover:bg-red-50">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                  <p className="text-[10px] text-red-500">Due {t.target_date}</p>
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
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Due soon</h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {myDueSoon.map(t => (
              <Link key={t.id} href="/tasks" className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                  <p className="text-[10px] text-slate-500">Due {t.target_date}</p>
                </div>
                <div className="flex gap-1.5"><StatusBadge status={t.status} /><PriorityBadge priority={t.priority} /></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {currentUserId && myTasks.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">No tasks assigned to you yet.</p>
          <Link href="/workspaces" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">Open a workspace to get started</Link>
        </div>
      )}

      {/* Upcoming meetings */}
      {meetings.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Upcoming meetings</h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {meetings.map(m => (
              <Link key={m.id} href="/calendar" className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                <p className="text-sm text-slate-800">{m.title}</p>
                <p className="text-xs text-slate-500">{m.start_time ? new Date(m.start_time).toLocaleDateString() : "No date"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
