"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getProfiles,
  getTaskAssignments,
  getTasks,
  getTasksWithAssignees,
  getWorkspaceGroups,
} from "@/lib/roadmapStore";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/browser";
import type { TaskWithAssignees, WorkspaceGroup } from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { Briefcase, CalendarDays, ListChecks, Plus, Radio, Target } from "lucide-react";

interface Meeting { id: string; title: string; start_time: string | null }

const isDev = process.env.NODE_ENV === "development";

function pct(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export default function HomePage() {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceGroup[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [rawTasks, profs, assigns, workspaceGroups] = await Promise.all([
        getTasks(),
        getProfiles(),
        getTaskAssignments(),
        getWorkspaceGroups(),
      ]);
      const enriched = await getTasksWithAssignees(rawTasks, assigns, profs);
      setTasks(enriched.filter(t => !t.is_archived));
      setWorkspaces(workspaceGroups.filter(w => w.is_visible));

      if (isSupabaseConfigured) {
        const user = await getCurrentUser();
        setCurrentUserId(user?.id ?? null);
        const sb = getSupabaseBrowser();
        if (sb) {
          const { data } = await sb
            .from("meetings")
            .select("id, title, start_time")
            .order("start_time", { ascending: true })
            .limit(5);
          if (data) setMeetings((data as Meeting[]).filter(m => !m.start_time || new Date(m.start_time) >= new Date()));
        }
      }
    })();
  }, []);

  const [now] = useState(() => new Date());
  const today = useMemo(() => now.toISOString().slice(0, 10), [now]);
  const cutoff = useMemo(() => new Date(now.getTime() + 21 * 86_400_000).toISOString().slice(0, 10), [now]);

  const complete = tasks.filter(t => t.status === "Complete").length;
  const critical = tasks.filter(t => t.priority === "Critical" && t.status !== "Complete");
  const overdue = tasks.filter(t => t.target_date && t.target_date < today && t.status !== "Complete");
  const dueSoon = tasks
    .filter(t => t.target_date && t.target_date >= today && t.target_date <= cutoff && t.status !== "Complete")
    .sort((a, b) => (a.target_date ?? "").localeCompare(b.target_date ?? ""))
    .slice(0, 6);
  const myTasks = currentUserId ? tasks.filter(t => t.assignees.some(a => a.id === currentUserId)) : [];
  const progress = pct(complete, tasks.length);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {!isSupabaseConfigured && isDev && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          Demo mode. <Link href="/setup" className="underline">Configure Supabase</Link>
        </div>
      )}
      {!isSupabaseConfigured && !isDev && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Setup required.</strong> <Link href="/setup" className="underline">View setup</Link>
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="app-card overflow-hidden rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <Image src="/endoscribe-mark.svg" alt="" width={34} height={34} />
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--accent-strong)]">Workspace OS</p>
                  <h1 className="text-3xl font-semibold tracking-normal text-[var(--text)]">Research Command Center</h1>
                </div>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
                A single operating view for verticals, milestones, assignments, deadlines, and decisions across EndoScribe and PEPRisc.
              </p>
            </div>
            {isSupabaseConfigured && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs text-green-700 dark:bg-green-950/50 dark:text-green-200"><Radio className="h-3 w-3" /> Live</span>}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            <Metric label="Completion" value={`${progress}%`} tone="accent" />
            <Metric label="Open Tasks" value={tasks.length - complete} />
            <Metric label="Critical" value={critical.length} tone="rose" />
            <Metric label="Overdue" value={overdue.length} tone="gold" />
          </div>
        </div>

        <div className="app-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">Priority Track</h2>
            <Link href="/tasks" className="text-xs font-medium text-[var(--accent-strong)]">Open tasks</Link>
          </div>
          <div className="mt-4 space-y-3">
            {(critical.length > 0 ? critical : dueSoon).slice(0, 4).map(t => (
              <Link key={t.id} href="/tasks" className="block rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3 transition hover:border-[var(--accent)]">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-semibold text-[var(--text)]">{t.title}</p>
                  <PriorityBadge priority={t.priority} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
                  <StatusBadge status={t.status} />
                  <span>{t.target_date ? `Due ${t.target_date}` : "No deadline"}</span>
                </div>
              </Link>
            ))}
            {tasks.length === 0 && <p className="rounded-lg border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--muted)]">No tasks yet.</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/tasks" icon={Plus} title="New Task" detail="Create, assign, prioritize" />
        <QuickLink href="/workspaces" icon={Briefcase} title="Workspaces" detail="Review verticals" />
        <QuickLink href="/roadmap" icon={Target} title="Roadmap" detail="Milestones by month" />
        <QuickLink href="/calendar" icon={CalendarDays} title="Meetings" detail="Schedule and export" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <div className="app-card rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">Verticals</h2>
            <Link href="/workspaces" className="text-xs font-medium text-[var(--accent-strong)]">Manage</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workspaces.map(ws => {
              const wsTasks = tasks.filter(t => t.workspace === ws.slug);
              const wsDone = wsTasks.filter(t => t.status === "Complete").length;
              return (
                <Link key={ws.slug} href="/workspaces" className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4 transition hover:border-[var(--accent)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text)]">{ws.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{ws.description}</p>
                    </div>
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]">{wsTasks.length}</span>
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-[var(--surface-strong)]">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct(wsDone, wsTasks.length)}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5">
          <CompactList title={currentUserId ? `My Tasks (${myTasks.length})` : "Due Soon"} tasks={currentUserId ? myTasks.slice(0, 5) : dueSoon} />
          {meetings.length > 0 && (
            <div className="app-card rounded-xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text)]">Upcoming Meetings</h2>
                <Link href="/calendar" className="text-xs font-medium text-[var(--accent-strong)]">Calendar</Link>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {meetings.map(m => (
                  <Link key={m.id} href="/calendar" className="flex items-center justify-between gap-3 py-3 text-sm hover:text-[var(--accent-strong)]">
                    <span className="truncate text-[var(--text)]">{m.title}</span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">{m.start_time ? new Date(m.start_time).toLocaleDateString() : "No date"}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "accent" | "rose" | "gold" }) {
  const color = tone === "rose" ? "var(--rose)" : tone === "gold" ? "var(--gold)" : tone === "accent" ? "var(--accent-strong)" : "var(--text)";
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, detail }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; detail: string }) {
  return (
    <Link href={href} className="app-card flex items-center gap-4 rounded-xl p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-[var(--text)]">{title}</span>
        <span className="text-xs text-[var(--muted)]">{detail}</span>
      </span>
    </Link>
  );
}

function CompactList({ title, tasks }: { title: string; tasks: TaskWithAssignees[] }) {
  return (
    <div className="app-card rounded-xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        <ListChecks className="h-4 w-4 text-[var(--muted)]" />
      </div>
      <div className="divide-y divide-[var(--border)]">
        {tasks.length === 0 && <p className="py-5 text-center text-sm text-[var(--muted)]">Nothing assigned yet.</p>}
        {tasks.map(t => (
          <Link key={t.id} href="/tasks" className="block py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="line-clamp-2 text-sm font-medium text-[var(--text)]">{t.title}</p>
              <PriorityBadge priority={t.priority} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{t.assignees.map(a => a.full_name || a.email).join(", ") || "Unassigned"}</span>
              <span>{t.target_date ?? "No date"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
