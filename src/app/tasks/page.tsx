"use client";

import { useEffect, useState, useCallback } from "react";
import { getWorkstreams, getTasks, createTask, updateTask, subscribeToTasks, getProfiles, getTaskAssignments, getTasksWithAssignees, replaceTaskAssignees, getWorkspaceGroups } from "@/lib/roadmapStore";
import { uniqueValues } from "@/lib/roadmapUtils";
import type { RoadmapTask, Workstream, Profile, TaskAssignment, TaskWithAssignees, WorkspaceGroup } from "@/lib/roadmapTypes";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { getCurrentUser, getCurrentRole, canEdit as checkCanEdit, isAdmin as checkIsAdmin } from "@/lib/auth";
import TaskTable from "@/components/TaskTable";
import TaskForm from "@/components/TaskForm";
import TaskDetailDrawer from "@/components/TaskDetailDrawer";
import ComplianceBanner from "@/components/ComplianceBanner";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { ArrowDownUp, CalendarClock, LayoutGrid, Plus, Radio, Search, Table2, Users } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const isDev = process.env.NODE_ENV === "development";

type TabKey = "my-tasks" | "my-week" | "all";
type ViewMode = "verticals" | "deadline" | "assignee" | "table";
type SortKey = "priority" | "deadline";

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

function isActiveNow(t: RoadmapTask): boolean {
  if (!t.start_date || !t.target_date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return t.start_date <= today && t.target_date >= today;
}

export default function TasksPage() {
  const [allTasks, setAllTasks] = useState<TaskWithAssignees[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [workspaceGroups, setWorkspaceGroups] = useState<WorkspaceGroup[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("verticals");
  const [sortBy, setSortBy] = useState<SortKey>("priority");

  const [search, setSearch] = useState("");
  const [filterWs, setFilterWs] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterWorkspace, setFilterWorkspace] = useState("");

  const [selected, setSelected] = useState<RoadmapTask | TaskWithAssignees | null>(null);
  const [editing, setEditing] = useState<RoadmapTask | null | "new">(null);
  const [userCanEdit, setUserCanEdit] = useState(!isSupabaseConfigured && isDev);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [rawTasks, profs, assigns] = await Promise.all([getTasks(), getProfiles(), getTaskAssignments()]);
    setProfiles(profs);
    setAssignments(assigns);
    const enriched = await getTasksWithAssignees(rawTasks, assigns, profs);
    setAllTasks(enriched.filter(t => !t.is_archived));
  }, []);

  useEffect(() => {
    (async () => {
      const [ws, groups] = await Promise.all([getWorkstreams(), getWorkspaceGroups()]);
      setWorkstreams(ws);
      setWorkspaceGroups(groups.filter(g => g.is_visible));
      await refresh();
      if (isSupabaseConfigured) {
        const [role, user] = await Promise.all([getCurrentRole(), getCurrentUser()]);
        setUserCanEdit(checkCanEdit(role));
        setUserIsAdmin(checkIsAdmin(role));
        setCurrentUserId(user?.id ?? null);
        if (user) setTab("my-tasks");
      }
    })();
    const sub = subscribeToTasks(async () => { await refresh(); });
    return () => sub.unsubscribe();
  }, [refresh]);

  // Derived task sets
  const myAssignedIds = new Set(assignments.filter(a => a.user_id === currentUserId).map(a => a.task_id));
  const myTasks = allTasks.filter(t => myAssignedIds.has(t.id));
  const myWeekTasks = myTasks.filter(t =>
    isInCurrentWeek(t.target_date) || isActiveNow(t) || (t.status === "In progress")
  );

  // Which source list for current tab
  const baseTasks = tab === "my-tasks" ? myTasks : tab === "my-week" ? myWeekTasks : allTasks;

  // Apply filters
  let filtered = baseTasks;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(t =>
      t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.owner.toLowerCase().includes(q)
    );
  }
  if (filterWs) filtered = filtered.filter(t => t.workstream_id === filterWs);
  if (filterStatus) filtered = filtered.filter(t => t.status === filterStatus);
  if (filterPriority) filtered = filtered.filter(t => t.priority === filterPriority);
  if (filterOwner) filtered = filtered.filter(t => t.owner === filterOwner);
  if (filterAssignee) filtered = filtered.filter(t => t.assignees.some(p => p.id === filterAssignee));
  if (filterWorkspace) filtered = filtered.filter(t => t.workspace === filterWorkspace);

  const priorityRank: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (sortBy === "deadline") {
      return (a.target_date ?? "9999-99-99").localeCompare(b.target_date ?? "9999-99-99")
        || (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
    }
    return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9)
      || (a.target_date ?? "9999-99-99").localeCompare(b.target_date ?? "9999-99-99");
  });

  const openTasks = allTasks.filter(t => t.status !== "Complete" && t.status !== "Deferred");
  const criticalOpen = openTasks.filter(t => t.priority === "Critical");
  const overdue = openTasks.filter(t => t.target_date && t.target_date < new Date().toISOString().slice(0, 10));

  function showFeedback(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); }

  async function handleSave(task: RoadmapTask, assigneeIds?: string[]) {
    setError(null);
    try {
      if (editing === "new") {
        await createTask(task);
        showFeedback("Task created");
      } else {
        await updateTask(task.id, task);
        showFeedback("Task updated");
      }
      if (assigneeIds !== undefined) {
        await replaceTaskAssignees(task.id, assigneeIds);
      }
      setEditing(null);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  }

  async function handleDelete(id: string) {
    if (!userIsAdmin) return;
    if (!confirm("Archive this task?")) return;
    setError(null);
    try {
      await updateTask(id, { is_archived: true } as Partial<RoadmapTask>);
      setSelected(null);
      showFeedback("Task archived");
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Archive failed");
    }
  }

  async function handleDuplicate(task: RoadmapTask) {
    setError(null);
    try {
      const newId = `TASK-${Date.now().toString(36).toUpperCase()}`;
      await createTask({ ...task, id: newId, title: `${task.title} (Copy)`, status: "Not started", is_archived: false, is_seeded: false });
      showFeedback("Task duplicated");
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Duplicate failed");
    }
  }

  async function handleMoveWorkspace(id: string, workspace: string) {
    try {
      await updateTask(id, { workspace } as Partial<RoadmapTask>);
      showFeedback("Moved to workspace");
      await refresh();
    } catch {}
  }

  async function handleBulkUpdate(ids: string[], updates: Partial<RoadmapTask>) {
    setError(null);
    try {
      for (const id of ids) { await updateTask(id, updates); }
      showFeedback(`${ids.length} task(s) updated`);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bulk update failed");
    }
  }

  const selectCls = "app-field rounded-lg px-2 py-1.5 text-xs";
  const tabCls = (key: TabKey) => clsx(
    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
    tab === key ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--text)]"
  );
  const viewCls = (key: ViewMode) => clsx(
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    viewMode === key ? "bg-[var(--text)] text-[var(--surface)]" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-strong)]"
  );

  const editingTask = editing && editing !== "new" ? editing : null;
  const editingAssigneeIds = editingTask ? assignments.filter(a => a.task_id === editingTask.id).map(a => a.user_id) : [];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--accent-strong)]">Execution</p>
          <h1 className="text-3xl font-semibold text-[var(--text)]">Tasks</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Priority, deadline, assignee, and vertical views.</p>
        </div>
        <div className="flex items-center gap-3">
          {isSupabaseConfigured && <span className="flex items-center gap-1 text-xs text-green-600"><Radio className="h-3 w-3" /> Live</span>}
          {!isSupabaseConfigured && <span className="text-xs text-[var(--gold)]">Mock mode</span>}
          {userCanEdit && (
            <button onClick={() => setEditing("new")} className="app-button-primary flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium">
              <Plus className="h-4 w-4" /> Add Task
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
      {feedback && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200">{feedback}</div>}

      {!isSupabaseConfigured && isDev && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          Mock demo mode. <Link href="/setup" className="underline">Configure Supabase</Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <TaskMetric label="Open" value={openTasks.length} />
        <TaskMetric label="Critical" value={criticalOpen.length} tone="rose" />
        <TaskMetric label="Overdue" value={overdue.length} tone="gold" />
      </div>

      {currentUserId && (
        <div className="app-panel flex flex-wrap gap-1 rounded-xl p-1">
          <button className={tabCls("my-tasks")} onClick={() => setTab("my-tasks")}>My Tasks ({myTasks.length})</button>
          <button className={tabCls("my-week")} onClick={() => setTab("my-week")}>My Week ({myWeekTasks.length})</button>
          <button className={tabCls("all")} onClick={() => setTab("all")}>All Tasks ({allTasks.length})</button>
        </div>
      )}

      <ComplianceBanner />

      <div className="app-panel space-y-3 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button className={viewCls("verticals")} onClick={() => setViewMode("verticals")}><LayoutGrid className="h-4 w-4" /> Verticals</button>
          <button className={viewCls("deadline")} onClick={() => setViewMode("deadline")}><CalendarClock className="h-4 w-4" /> Deadlines</button>
          <button className={viewCls("assignee")} onClick={() => setViewMode("assignee")}><Users className="h-4 w-4" /> Assignees</button>
          <button className={viewCls("table")} onClick={() => setViewMode("table")}><Table2 className="h-4 w-4" /> Table</button>
          <div className="ml-auto flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-[var(--muted)]" />
            <select className={selectCls} value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}>
              <option value="priority">Priority first</option>
              <option value="deadline">Deadline first</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-[var(--subtle)]" />
          <input className="app-field w-44 rounded-lg py-1.5 pl-7 pr-3 text-xs" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={selectCls} value={filterWs} onChange={e => setFilterWs(e.target.value)}>
          <option value="">All Workstreams</option>
          {workstreams.map(ws => <option key={ws.id} value={ws.id}>{ws.label}</option>)}
        </select>
        <select className={selectCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {uniqueValues(allTasks, "status").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {uniqueValues(allTasks, "priority").map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
          <option value="">All Owners</option>
          {uniqueValues(allTasks, "owner").map(v => <option key={v}>{v}</option>)}
        </select>
        {profiles.length > 0 && (
          <select className={selectCls} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            <option value="">All Assignees</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
          </select>
        )}
        <select className={selectCls} value={filterWorkspace} onChange={e => setFilterWorkspace(e.target.value)}>
          <option value="">All Workspaces</option>
          {uniqueValues(allTasks, "workspace").map(v => <option key={v}>{v}</option>)}
        </select>
        </div>
      </div>

      <p className="text-xs text-[var(--muted)]">{sortedFiltered.length} of {baseTasks.length} tasks</p>

      {viewMode === "table" ? (
        <TaskTable
          tasks={sortedFiltered}
          profiles={profiles}
          onSelect={setSelected}
          onUpdate={userCanEdit ? async (id, updates) => { try { await updateTask(id, updates); showFeedback("Updated"); await refresh(); } catch {} } : undefined}
          onBulkUpdate={userCanEdit ? handleBulkUpdate : undefined}
          onDelete={userIsAdmin ? handleDelete : undefined}
          onDuplicate={userCanEdit ? handleDuplicate : undefined}
          onMoveWorkspace={userCanEdit ? handleMoveWorkspace : undefined}
          isAdmin={userIsAdmin}
          emptyMessage="No tasks yet. Click + Add Task to create one."
        />
      ) : (
        <TaskCardViews
          mode={viewMode}
          tasks={sortedFiltered}
          profiles={profiles}
          workspaces={workspaceGroups}
          onSelect={setSelected}
          onEdit={userCanEdit ? setEditing : undefined}
        />
      )}

      {selected && !editing && (
        <TaskDetailDrawer
          task={selected}
          onClose={() => setSelected(null)}
          onEdit={userCanEdit ? (t => { setEditing(t); setSelected(null); }) : (() => {})}
          onDuplicate={userCanEdit ? (t => { handleDuplicate(t); setSelected(null); }) : undefined}
          onDelete={userIsAdmin ? handleDelete : undefined}
          isAdmin={userIsAdmin}
        />
      )}

      {editing && userCanEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-16">
          <div className="app-card max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6">
            <TaskForm
              task={editing === "new" ? null : editing}
              profiles={profiles}
              currentAssigneeIds={editingAssigneeIds}
              workspaces={workspaceGroups.map(w => ({ slug: w.slug, title: w.title }))}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TaskMetric({ label, value, tone }: { label: string; value: number; tone?: "rose" | "gold" }) {
  const color = tone === "rose" ? "var(--rose)" : tone === "gold" ? "var(--gold)" : "var(--accent-strong)";
  return (
    <div className="app-card rounded-xl p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}

function TaskCardViews({
  mode,
  tasks,
  profiles,
  workspaces,
  onSelect,
  onEdit,
}: {
  mode: ViewMode;
  tasks: TaskWithAssignees[];
  profiles: Profile[];
  workspaces: WorkspaceGroup[];
  onSelect: (task: TaskWithAssignees) => void;
  onEdit?: (task: RoadmapTask) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
        No tasks match this view.
      </div>
    );
  }

  if (mode === "deadline") {
    const buckets = [
      { key: "overdue", title: "Overdue", items: tasks.filter(t => t.target_date && t.target_date < new Date().toISOString().slice(0, 10)) },
      { key: "dated", title: "Scheduled", items: tasks.filter(t => t.target_date && t.target_date >= new Date().toISOString().slice(0, 10)) },
      { key: "none", title: "No Deadline", items: tasks.filter(t => !t.target_date) },
    ];
    return <SectionGrid sections={buckets} onSelect={onSelect} onEdit={onEdit} />;
  }

  if (mode === "assignee") {
    const sections = profiles
      .map(p => ({ key: p.id, title: p.full_name || p.email, items: tasks.filter(t => t.assignees.some(a => a.id === p.id)) }))
      .filter(s => s.items.length > 0);
    const unassigned = tasks.filter(t => t.assignees.length === 0);
    if (unassigned.length > 0) sections.push({ key: "unassigned", title: "Unassigned", items: unassigned });
    return <SectionGrid sections={sections} onSelect={onSelect} onEdit={onEdit} />;
  }

  const workspaceSections = workspaces.map(ws => ({
    key: ws.slug,
    title: ws.title,
    items: tasks.filter(t => t.workspace === ws.slug),
  })).filter(s => s.items.length > 0);
  const noWorkspace = tasks.filter(t => !t.workspace || !workspaces.some(w => w.slug === t.workspace));
  if (noWorkspace.length > 0) workspaceSections.push({ key: "no-workspace", title: "Unassigned Vertical", items: noWorkspace });
  return <SectionGrid sections={workspaceSections} onSelect={onSelect} onEdit={onEdit} />;
}

function SectionGrid({
  sections,
  onSelect,
  onEdit,
}: {
  sections: { key: string; title: string; items: TaskWithAssignees[] }[];
  onSelect: (task: TaskWithAssignees) => void;
  onEdit?: (task: RoadmapTask) => void;
}) {
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
        No tasks match this grouping.
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {sections.map(section => (
        <section key={section.key} className="app-card rounded-xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">{section.title}</h2>
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]">{section.items.length}</span>
          </div>
          <div className="grid gap-3">
            {section.items.map(t => <TaskCard key={t.id} task={t} onSelect={onSelect} onEdit={onEdit} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function TaskCard({ task, onSelect, onEdit }: { task: TaskWithAssignees; onSelect: (task: TaskWithAssignees) => void; onEdit?: (task: RoadmapTask) => void }) {
  const assignees = task.assignees.map(a => a.full_name || a.email).join(", ") || "Unassigned";
  const priorityAccent: Record<string, string> = {
    Critical: "var(--rose)",
    High: "var(--gold)",
    Medium: "var(--accent)",
    Low: "var(--subtle)",
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <button onClick={() => onSelect(task)} className="w-full text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">{task.title}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{task.description || task.next_action || "No description"}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-semibold" style={{ color: priorityAccent[task.priority] ?? "var(--accent)" }}>{task.priority.slice(0, 1)}</p>
            <p className="text-[10px] uppercase text-[var(--subtle)]">priority</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <span className="rounded bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--muted)]">{task.target_date ? `Due ${task.target_date}` : "No deadline"}</span>
        </div>
        <p className="mt-3 truncate text-xs text-[var(--muted)]">{assignees}</p>
      </button>
      {onEdit && (
        <button onClick={() => onEdit(task)} className="mt-3 text-xs font-medium text-[var(--accent-strong)] hover:underline">
          Edit
        </button>
      )}
    </div>
  );
}
