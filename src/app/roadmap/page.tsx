"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createMilestone,
  createTask,
  getMilestones,
  getProfiles,
  getTaskAssignments,
  getTasks,
  getTasksWithAssignees,
  getWorkstreams,
  replaceTaskAssignees,
  updateMilestone,
  updateTask,
} from "@/lib/roadmapStore";
import { canEdit as checkCanEdit, getCurrentRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { Milestone, Profile, RoadmapTask, TaskAssignment, TaskWithAssignees, Workstream } from "@/lib/roadmapTypes";
import { MILESTONE_STATUSES } from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import TaskForm from "@/components/TaskForm";
import { CalendarClock, Layers, Plus, Target, X } from "lucide-react";
import { clsx } from "clsx";

type ViewMode = "milestones" | "tasks";

function monthYear(date: string | null) {
  if (!date) return "TBD";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function blankMilestone(): Milestone {
  return { id: "", title: "", description: "", target_date: null, status: "Not started", workstream_id: null };
}

export default function RoadmapPage() {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [view, setView] = useState<ViewMode>("milestones");
  const [canEdit, setCanEdit] = useState(!isSupabaseConfigured);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | "new" | null>(null);
  const [editingTask, setEditingTask] = useState<RoadmapTask | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function refresh() {
    const [ws, rawTasks, ms, profs, assigns] = await Promise.all([
      getWorkstreams(),
      getTasks(),
      getMilestones(),
      getProfiles(),
      getTaskAssignments(),
    ]);
    setWorkstreams(ws);
    setMilestones(ms);
    setProfiles(profs);
    setAssignments(assigns);
    setTasks((await getTasksWithAssignees(rawTasks, assigns, profs)).filter(t => !t.is_archived));
  }

  useEffect(() => {
    (async () => {
      await refresh();
      if (isSupabaseConfigured) setCanEdit(checkCanEdit(await getCurrentRole()));
    })();
  }, []);

  const sortedMilestones = useMemo(
    () => [...milestones].sort((a, b) => (a.target_date ?? "9999-99-99").localeCompare(b.target_date ?? "9999-99-99")),
    [milestones],
  );

  const completeMilestones = milestones.filter(m => m.status === "Complete").length;
  const groupedTasks = workstreams.map(ws => ({
    workstream: ws,
    tasks: tasks
      .filter(t => t.workstream_id === ws.id)
      .sort((a, b) => (a.target_date ?? "9999-99-99").localeCompare(b.target_date ?? "9999-99-99")),
  })).filter(g => g.tasks.length > 0);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  }

  async function handleMilestoneSave(form: Milestone) {
    setError(null);
    try {
      if (editingMilestone === "new") {
        const id = form.id || `M-${Date.now().toString(36).toUpperCase()}`;
        await createMilestone({ ...form, id });
        showFeedback("Milestone created");
      } else {
        await updateMilestone(form.id, form);
        showFeedback("Milestone updated");
      }
      setEditingMilestone(null);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Milestone save failed");
    }
  }

  async function handleTaskSave(task: RoadmapTask, assigneeIds?: string[]) {
    setError(null);
    try {
      let savedTaskId = task.id;
      if (editingTask === "new") {
        const id = task.id || `TASK-${Date.now().toString(36).toUpperCase()}`;
        savedTaskId = id;
        await createTask({ ...task, id });
      } else {
        await updateTask(task.id, task);
      }
      if (assigneeIds !== undefined) await replaceTaskAssignees(savedTaskId, assigneeIds);
      setEditingTask(null);
      showFeedback("Task saved");
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Task save failed");
    }
  }

  const activeCls = (key: ViewMode) => clsx(
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    view === key ? "bg-[var(--text)] text-[var(--surface)]" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-strong)]",
  );
  const editingAssigneeIds = editingTask && editingTask !== "new" ? assignments.filter(a => a.task_id === editingTask.id).map(a => a.user_id) : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--accent-strong)]">Roadmap</p>
          <h1 className="text-3xl font-semibold text-[var(--text)]">Milestones and Execution Path</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Monthly targets, vertical work, and priority tasks in one view.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={activeCls("milestones")} onClick={() => setView("milestones")}><Target className="h-4 w-4" /> Milestones</button>
          <button className={activeCls("tasks")} onClick={() => setView("tasks")}><Layers className="h-4 w-4" /> Tasks</button>
          {canEdit && (
            <button onClick={() => view === "milestones" ? setEditingMilestone("new") : setEditingTask("new")} className="app-button-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold">
              <Plus className="h-4 w-4" /> Add
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
      {feedback && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200">{feedback}</div>}

      <section className="grid gap-3 sm:grid-cols-3">
        <RoadMetric label="Milestones" value={milestones.length} />
        <RoadMetric label="Complete" value={completeMilestones} tone="accent" />
        <RoadMetric label="Active Tasks" value={tasks.filter(t => t.status !== "Complete").length} tone="gold" />
      </section>

      {view === "milestones" ? (
        <section className="grid gap-5 lg:grid-cols-2">
          {sortedMilestones.map((ms, index) => (
            <article key={ms.id} className="app-card rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent-strong)]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]"><CalendarClock className="h-3.5 w-3.5" /> {monthYear(ms.target_date)}</p>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">{ms.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{ms.description || "No description"}</p>
                  </div>
                </div>
                <StatusBadge status={ms.status} />
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
                <span>{ms.target_date ?? "No target date"}</span>
                {canEdit && <button onClick={() => setEditingMilestone(ms)} className="font-medium text-[var(--accent-strong)] hover:underline">Edit</button>}
              </div>
            </article>
          ))}
          {sortedMilestones.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">No milestones yet.</div>
          )}
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {groupedTasks.map(group => (
            <article key={group.workstream.id} className="app-card rounded-xl p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text)]">{group.workstream.label}</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{group.workstream.purpose}</p>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]">{group.tasks.length}</span>
              </div>
              <div className="space-y-3">
                {group.tasks.map(t => (
                  <button key={t.id} onClick={() => canEdit ? setEditingTask(t) : undefined} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-left transition hover:border-[var(--accent)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">{t.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{t.target_date ? `${monthYear(t.target_date)} target` : "No target month"}</p>
                      </div>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge status={t.status} />
                      <span className="rounded bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--muted)]">{t.assignees.map(a => a.full_name || a.email).join(", ") || "Unassigned"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {editingMilestone && (
        <MilestoneModal
          milestone={editingMilestone === "new" ? blankMilestone() : editingMilestone}
          isNew={editingMilestone === "new"}
          workstreams={workstreams}
          onSave={handleMilestoneSave}
          onCancel={() => setEditingMilestone(null)}
        />
      )}

      {editingTask && canEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-16">
          <div className="app-card max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6">
            <TaskForm
              task={editingTask === "new" ? null : editingTask}
              profiles={profiles}
              currentAssigneeIds={editingAssigneeIds}
              onSave={handleTaskSave}
              onCancel={() => setEditingTask(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RoadMetric({ label, value, tone }: { label: string; value: number; tone?: "accent" | "gold" }) {
  const color = tone === "gold" ? "var(--gold)" : tone === "accent" ? "var(--accent-strong)" : "var(--text)";
  return (
    <div className="app-card rounded-xl p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}

function MilestoneModal({
  milestone,
  isNew,
  workstreams,
  onSave,
  onCancel,
}: {
  milestone: Milestone;
  isNew: boolean;
  workstreams: Workstream[];
  onSave: (milestone: Milestone) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(milestone);
  const inputCls = "app-field w-full rounded-lg px-3 py-2 text-sm";
  const labelCls = "mb-1 block text-xs font-medium text-[var(--muted)]";
  const set = <K extends keyof Milestone>(key: K, value: Milestone[K]) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-16">
      <div className="app-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl p-6">
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text)]">{isNew ? "New Milestone" : "Edit Milestone"}</h3>
            <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-strong)]"><X className="h-4 w-4" /></button>
          </div>
          {isNew && (
            <div>
              <label className={labelCls}>ID</label>
              <input className={inputCls} value={form.id} onChange={e => set("id", e.target.value)} placeholder="Auto if blank" />
            </div>
          )}
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} required autoFocus />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} h-24`} value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Target date</label>
              <input type="date" className={inputCls} value={form.target_date ?? ""} onChange={e => set("target_date", e.target.value || null)} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => set("status", e.target.value)}>
                {MILESTONE_STATUSES.map(status => <option key={status}>{status}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Workstream</label>
            <select className={inputCls} value={form.workstream_id ?? ""} onChange={e => set("workstream_id", e.target.value || null)}>
              <option value="">No workstream</option>
              {workstreams.map(ws => <option key={ws.id} value={ws.id}>{ws.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-strong)]">Cancel</button>
            <button type="submit" className="app-button-primary rounded-lg px-4 py-2 text-sm font-semibold">{isNew ? "Create" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
