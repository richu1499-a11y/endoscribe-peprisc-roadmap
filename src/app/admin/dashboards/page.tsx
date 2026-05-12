"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getDashboardRegistry, updateDashboardRegistryItem, createDashboardRegistryItem, deleteDashboardRegistryItem,
  getDashboardWidgets, createDashboardWidget, updateDashboardWidget, deleteDashboardWidget,
  getDashboardTaskLinks, linkTaskToDashboard, unlinkTaskFromDashboard, moveTaskBetweenDashboards, getTasks,
  getWorkspaceGroups, createWorkspaceGroup, updateWorkspaceGroup, deleteWorkspaceGroup,
} from "@/lib/roadmapStore";
import type { WorkspaceGroup } from "@/lib/roadmapTypes";
import { getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { DashboardRegistryItem, DashboardWidget, DashboardTaskLink, RoadmapTask } from "@/lib/roadmapTypes";
import { DASHBOARD_CATEGORIES, DASHBOARD_REQUIRED_ROLES, DASHBOARD_ICON_OPTIONS, DASHBOARD_WIDGET_TYPES, DASHBOARD_WIDGET_SOURCE_TYPES, DASHBOARD_WIDGET_WIDTHS } from "@/lib/roadmapTypes";
import MetricCard from "@/components/MetricCard";
import ComplianceBanner from "@/components/ComplianceBanner";
import StatusBadge from "@/components/StatusBadge";
import { clsx } from "clsx";
import { ShieldAlert, Plus, X, ArrowUp, ArrowDown, Eye, EyeOff, Link2, Unlink } from "lucide-react";
import Link from "next/link";

type TabKey = "dashboards" | "layout" | "task-links" | "workspace-groups";

export default function DashboardManagerPage() {
  const [items, setItems] = useState<DashboardRegistryItem[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboards");
  const [editing, setEditing] = useState<DashboardRegistryItem | null | "new">(null);
  const [error, setError] = useState<string | null>(null);

  // Layout editor state
  const [selectedDashId, setSelectedDashId] = useState<string>("");
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null | "new">(null);

  // Workspace state
  const [wsDashId, setWsDashId] = useState<string>("");
  const [wsTargetDashId, setWsTargetDashId] = useState<string>("");
  const [taskLinks, setTaskLinks] = useState<DashboardTaskLink[]>([]);
  const [allTasks, setAllTasks] = useState<RoadmapTask[]>([]);
  const [taskSearch, setTaskSearch] = useState("");

  // Workspace groups state
  const [wsGroups, setWsGroups] = useState<WorkspaceGroup[]>([]);
  const [editingWsGroup, setEditingWsGroup] = useState<WorkspaceGroup | null | "new">(null);

  const refresh = useCallback(async () => {
    setItems(await getDashboardRegistry());
  }, []);

  const refreshWidgets = useCallback(async () => {
    if (selectedDashId) setWidgets(await getDashboardWidgets(selectedDashId));
  }, [selectedDashId]);

  const refreshLinks = useCallback(async () => {
    if (wsDashId) setTaskLinks(await getDashboardTaskLinks(wsDashId));
  }, [wsDashId]);

  useEffect(() => {
    const init = async () => {
      if (!isSupabaseConfigured) { setAuthorized(false); return; }
      const role = await getCurrentRole();
      if (!checkIsAdmin(role)) { setAuthorized(false); return; }
      setAuthorized(true);
      await refresh();
      setAllTasks(await getTasks());
      setWsGroups(await getWorkspaceGroups());
    };
    init();
  }, [refresh]);

  useEffect(() => { const load = async () => { await refreshWidgets(); }; load(); }, [refreshWidgets]);
  useEffect(() => { const load = async () => { await refreshLinks(); }; load(); }, [refreshLinks]);

  if (authorized === null) return <div className="pt-12 text-center text-sm text-slate-500">Loading...</div>;
  if (!authorized) return (
    <div className="mx-auto max-w-md space-y-4 pt-12">
      <h1 className="text-xl font-bold text-slate-900">Dashboard Manager</h1>
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert className="mb-1 h-5 w-5" /> Admin access required.</div>
      <Link href="/login" className="text-sm text-indigo-600 hover:underline">Sign in</Link>
    </div>
  );

  const sorted = [...items].sort((a, b) => a.order_index - b.order_index);
  const thCls = "px-3 py-2 text-left text-[10px] uppercase text-slate-500 border-b bg-slate-50";
  const tdCls = "px-3 py-2 text-xs text-slate-700";
  const tabCls = (k: TabKey) => clsx("px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors", tab === k ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700");
  const inputCls = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  // --- Dashboard tab handlers ---
  async function toggleVis(item: DashboardRegistryItem) {
    setError(null);
    try { await updateDashboardRegistryItem(item.id, { is_visible: !item.is_visible }); await refresh(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }
  async function moveItem(item: DashboardRegistryItem, dir: "up" | "down") {
    const idx = sorted.findIndex(i => i.id === item.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    try {
      await updateDashboardRegistryItem(sorted[idx].id, { order_index: sorted[swapIdx].order_index });
      await updateDashboardRegistryItem(sorted[swapIdx].id, { order_index: sorted[idx].order_index });
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }
  async function handleSaveDash(form: Partial<DashboardRegistryItem>) {
    setError(null);
    try {
      if (editing === "new") await createDashboardRegistryItem(form);
      else if (editing) await updateDashboardRegistryItem(editing.id, form);
      setEditing(null); await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }
  async function handleDeleteDash(item: DashboardRegistryItem) {
    if (item.is_system) { setError("Cannot delete system dashboards."); return; }
    if (!confirm(`Delete "${item.title}"?`)) return;
    try { await deleteDashboardRegistryItem(item.id); await refresh(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  // --- Widget handlers ---
  async function handleSaveWidget(form: Partial<DashboardWidget>) {
    setError(null);
    try {
      if (editingWidget === "new") await createDashboardWidget({ ...form, dashboard_id: selectedDashId });
      else if (editingWidget) await updateDashboardWidget(editingWidget.id, form);
      setEditingWidget(null); await refreshWidgets();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }
  async function handleDeleteWidget(id: string) {
    if (!confirm("Delete this widget?")) return;
    try { await deleteDashboardWidget(id); await refreshWidgets(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }
  async function moveWidget(w: DashboardWidget, dir: "up" | "down") {
    const ws = [...widgets].sort((a, b) => a.order_index - b.order_index);
    const idx = ws.findIndex(x => x.id === w.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ws.length) return;
    try {
      await updateDashboardWidget(ws[idx].id, { order_index: ws[swapIdx].order_index });
      await updateDashboardWidget(ws[swapIdx].id, { order_index: ws[idx].order_index });
      await refreshWidgets();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  // --- Task link handlers ---
  const linkedTaskIds = new Set(taskLinks.map(l => l.task_id));
  const filteredTasks = allTasks.filter(t => {
    if (!taskSearch) return true;
    const q = taskSearch.toLowerCase();
    return t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q);
  });

  async function handleLinkTask(taskId: string) {
    if (!wsDashId) return;
    setError(null);
    try { await linkTaskToDashboard(wsDashId, taskId); await refreshLinks(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }
  async function handleUnlinkTask(taskId: string) {
    if (!wsDashId) return;
    try { await unlinkTaskFromDashboard(wsDashId, taskId); await refreshLinks(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }
  async function handleMoveTask(taskId: string) {
    if (!wsDashId || !wsTargetDashId || wsDashId === wsTargetDashId) return;
    try { await moveTaskBetweenDashboards(taskId, wsDashId, wsTargetDashId); await refreshLinks(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">Dashboards, widgets, and task workspace management</p>
        </div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button className={tabCls("dashboards")} onClick={() => setTab("dashboards")}>Dashboards</button>
        <button className={tabCls("workspace-groups")} onClick={() => setTab("workspace-groups")}>Workspaces</button>
        <button className={tabCls("layout")} onClick={() => setTab("layout")}>Layout</button>
        <button className={tabCls("task-links")} onClick={() => setTab("task-links")}>Task Links</button>
      </div>

      {/* ====== TAB: Dashboards ====== */}
      {tab === "dashboards" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Add Dashboard</button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="Total" value={items.length} />
            <MetricCard label="Visible" value={items.filter(i => i.is_visible).length} accent="green" />
            <MetricCard label="Hidden" value={items.filter(i => !i.is_visible).length} accent={items.some(i => !i.is_visible) ? "amber" : "default"} />
            <MetricCard label="Admin" value={items.filter(i => i.required_role === "admin").length} />
            <MetricCard label="System" value={items.filter(i => i.is_system).length} />
            <MetricCard label="Custom" value={items.filter(i => !i.is_system).length} accent="blue" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left">
              <thead><tr>
                <th className={thCls}>Ord</th><th className={thCls}>Title</th><th className={thCls}>Route</th><th className={thCls}>Cat</th><th className={thCls}>Vis</th><th className={thCls}>Role</th><th className={thCls}>Type</th><th className={thCls + " text-right"}>Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className={tdCls + " font-mono text-slate-500"}>{item.order_index}</td>
                    <td className={tdCls + " font-medium text-slate-800"}>{item.title}</td>
                    <td className={tdCls + " font-mono text-[10px]"}>{item.route}</td>
                    <td className={tdCls}><span className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">{item.category}</span></td>
                    <td className={tdCls}>{item.is_visible ? <span className="text-green-600">Yes</span> : <span className="text-slate-400">No</span>}</td>
                    <td className={tdCls}><span className={clsx("rounded px-1 py-0.5 text-[10px] font-medium", item.required_role === "admin" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600")}>{item.required_role}</span></td>
                    <td className={tdCls}>{item.is_system ? "Sys" : <span className="text-indigo-600">Custom</span>}</td>
                    <td className={tdCls + " text-right whitespace-nowrap"}>
                      <button onClick={() => toggleVis(item)} className="mr-1 text-slate-400 hover:text-slate-700">{item.is_visible ? <EyeOff className="h-3.5 w-3.5 inline" /> : <Eye className="h-3.5 w-3.5 inline" />}</button>
                      <button onClick={() => moveItem(item, "up")} className="mr-1 text-slate-400 hover:text-slate-700"><ArrowUp className="h-3.5 w-3.5 inline" /></button>
                      <button onClick={() => moveItem(item, "down")} className="mr-1 text-slate-400 hover:text-slate-700"><ArrowDown className="h-3.5 w-3.5 inline" /></button>
                      <button onClick={() => setEditing(item)} className="mr-1 text-xs text-indigo-600 hover:underline">Edit</button>
                      {!item.is_system && <button onClick={() => handleDeleteDash(item)} className="text-xs text-red-500 hover:underline">Del</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====== TAB: Layout Editor ====== */}
      {tab === "layout" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select className={inputCls + " w-64"} value={selectedDashId} onChange={e => setSelectedDashId(e.target.value)}>
              <option value="">Select dashboard...</option>
              {sorted.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
            {selectedDashId && <button onClick={() => setEditingWidget("new")} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"><Plus className="h-3.5 w-3.5" /> Add Widget</button>}
          </div>
          {selectedDashId && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left">
                <thead><tr><th className={thCls}>Ord</th><th className={thCls}>Title</th><th className={thCls}>Type</th><th className={thCls}>Source</th><th className={thCls}>Width</th><th className={thCls}>Vis</th><th className={thCls + " text-right"}>Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {widgets.sort((a, b) => a.order_index - b.order_index).map(w => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className={tdCls + " font-mono"}>{w.order_index}</td>
                      <td className={tdCls + " font-medium text-slate-800"}>{w.title}</td>
                      <td className={tdCls}>{w.widget_type}</td>
                      <td className={tdCls}>{w.source_type}</td>
                      <td className={tdCls}>{w.width}</td>
                      <td className={tdCls}>{w.is_visible ? <span className="text-green-600">Yes</span> : <span className="text-slate-400">No</span>}</td>
                      <td className={tdCls + " text-right whitespace-nowrap"}>
                        <button onClick={() => moveWidget(w, "up")} className="mr-1 text-slate-400 hover:text-slate-700"><ArrowUp className="h-3.5 w-3.5 inline" /></button>
                        <button onClick={() => moveWidget(w, "down")} className="mr-1 text-slate-400 hover:text-slate-700"><ArrowDown className="h-3.5 w-3.5 inline" /></button>
                        <button onClick={() => setEditingWidget(w)} className="mr-1 text-xs text-indigo-600 hover:underline">Edit</button>
                        <button onClick={() => handleDeleteWidget(w.id)} className="text-xs text-red-500 hover:underline">Del</button>
                      </td>
                    </tr>
                  ))}
                  {widgets.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">No widgets. Click Add Widget.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {!selectedDashId && <p className="py-8 text-center text-sm text-slate-500">Select a dashboard to manage its widgets.</p>}
        </div>
      )}

      {/* ====== TAB: Task Links ====== */}
      {tab === "task-links" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Tasks are canonical records. Linking a task to a dashboard does not duplicate it. Removing from a dashboard does NOT delete the task.
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className={labelCls}>Source Dashboard</label>
              <select className={inputCls + " w-56"} value={wsDashId} onChange={e => setWsDashId(e.target.value)}>
                <option value="">Select...</option>
                {sorted.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Target (for move)</label>
              <select className={inputCls + " w-56"} value={wsTargetDashId} onChange={e => setWsTargetDashId(e.target.value)}>
                <option value="">Select...</option>
                {sorted.filter(d => d.id !== wsDashId).map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
          </div>

          {wsDashId && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Linked Tasks ({taskLinks.length})</h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-left">
                    <thead><tr><th className={thCls}>Task ID</th><th className={thCls}>Title</th><th className={thCls}>Status</th><th className={thCls}>Section</th><th className={thCls + " text-right"}>Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {taskLinks.map(link => {
                        const task = allTasks.find(t => t.id === link.task_id);
                        return (
                          <tr key={link.id} className="hover:bg-slate-50">
                            <td className={tdCls + " font-mono"}>{link.task_id}</td>
                            <td className={tdCls + " font-medium text-slate-800"}>{task?.title ?? "--"}</td>
                            <td className={tdCls}>{task ? <StatusBadge status={task.status} /> : "--"}</td>
                            <td className={tdCls}>{link.section}</td>
                            <td className={tdCls + " text-right whitespace-nowrap"}>
                              {wsTargetDashId && <button onClick={() => handleMoveTask(link.task_id)} className="mr-2 text-xs text-amber-600 hover:underline" title="Move to target">Move</button>}
                              <button onClick={() => handleUnlinkTask(link.task_id)} className="text-xs text-red-500 hover:underline" title="Remove from dashboard"><Unlink className="h-3 w-3 inline" /></button>
                            </td>
                          </tr>
                        );
                      })}
                      {taskLinks.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-sm text-slate-500">No tasks linked.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Add Tasks</h3>
                <input className={inputCls + " w-64 mb-2"} placeholder="Search task ID or title..." value={taskSearch} onChange={e => setTaskSearch(e.target.value)} />
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                  {filteredTasks.filter(t => !linkedTaskIds.has(t.id)).slice(0, 20).map(t => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50">
                      <span className="text-xs"><span className="font-mono text-slate-500 mr-2">{t.id}</span>{t.title}</span>
                      <button onClick={() => handleLinkTask(t.id)} className="text-xs text-indigo-600 hover:underline"><Link2 className="h-3 w-3 inline" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {!wsDashId && <p className="py-8 text-center text-sm text-slate-500">Select a source dashboard to manage its task links.</p>}
        </div>
      )}

      {/* ====== TAB: Workspace Groups ====== */}
      {tab === "workspace-groups" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setEditingWsGroup("new")} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Add Workspace</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left">
              <thead><tr><th className={thCls}>Order</th><th className={thCls}>Name</th><th className={thCls}>Slug</th><th className={thCls}>Description</th><th className={thCls}>Tasks</th><th className={thCls + " text-right"}>Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {wsGroups.sort((a, b) => a.order_index - b.order_index).map(ws => {
                  const taskCount = allTasks.filter(t => (t as unknown as { workspace?: string }).workspace === ws.slug).length;
                  return (
                    <tr key={ws.id} className="hover:bg-slate-50">
                      <td className={tdCls + " font-mono text-slate-500"}>{ws.order_index}</td>
                      <td className={tdCls + " font-medium text-slate-800"}>{ws.title}</td>
                      <td className={tdCls + " font-mono text-[10px]"}>{ws.slug}</td>
                      <td className={tdCls + " max-w-[200px] truncate"}>{ws.description ?? "--"}</td>
                      <td className={tdCls}>{taskCount}</td>
                      <td className={tdCls + " text-right whitespace-nowrap"}>
                        <button onClick={() => setEditingWsGroup(ws)} className="mr-2 text-xs text-indigo-600 hover:underline">Edit</button>
                        {!ws.is_system && <button onClick={async () => { if (confirm(`Delete workspace "${ws.title}"?`)) { try { await deleteWorkspaceGroup(ws.id); setWsGroups(await getWorkspaceGroups()); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); } } }} className="text-xs text-red-500 hover:underline">Delete</button>}
                      </td>
                    </tr>
                  );
                })}
                {wsGroups.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">No workspaces. Click Add Workspace.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workspace group edit modal */}
      {editingWsGroup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-20">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <WsGroupForm ws={editingWsGroup === "new" ? null : editingWsGroup} onSave={async (form) => {
              try {
                if (editingWsGroup === "new") {
                  const slug = (form.title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  await createWorkspaceGroup({ ...form, slug, order_index: (wsGroups.length + 1) * 10 });
                } else if (editingWsGroup) {
                  await updateWorkspaceGroup(editingWsGroup.id, form);
                }
                setEditingWsGroup(null);
                setWsGroups(await getWorkspaceGroups());
              } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
            }} onCancel={() => setEditingWsGroup(null)} />
          </div>
        </div>
      )}

      <ComplianceBanner />

      {/* Dashboard edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-16">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <DashboardForm item={editing === "new" ? null : editing} onSave={handleSaveDash} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}

      {/* Widget edit modal */}
      {editingWidget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-16">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <WidgetForm widget={editingWidget === "new" ? null : editingWidget} onSave={handleSaveWidget} onCancel={() => setEditingWidget(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function DashboardForm({ item, onSave, onCancel }: { item: DashboardRegistryItem | null; onSave: (f: Partial<DashboardRegistryItem>) => void; onCancel: () => void }) {
  const isNew = !item;
  const [form, setForm] = useState<Partial<DashboardRegistryItem>>(item ?? { slug: "", title: "", description: "", route: "", icon: "FileText", category: "Custom", order_index: 100, is_visible: true, required_role: "viewer", notes: "" });
  function set(k: string, v: unknown) { setForm(p => ({ ...p, [k]: v })); }
  const c = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  const l = "block text-xs font-medium text-slate-600 mb-1";
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
      <div className="flex justify-between"><h3 className="text-lg font-semibold text-slate-800">{isNew ? "Add Dashboard" : `Edit: ${item?.title}`}</h3><button type="button" onClick={onCancel}><X className="h-4 w-4" /></button></div>
      {isNew && <div><label className={l}>Slug</label><input className={c} value={form.slug ?? ""} onChange={e => set("slug", e.target.value)} required /></div>}
      <div><label className={l}>Title</label><input className={c} value={form.title ?? ""} onChange={e => set("title", e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={l}>Route</label><input className={c} value={form.route ?? ""} onChange={e => set("route", e.target.value)} disabled={item?.is_system} placeholder="/d/my-slug" /></div>
        <div><label className={l}>Icon</label><select className={c} value={form.icon ?? "FileText"} onChange={e => set("icon", e.target.value)}>{DASHBOARD_ICON_OPTIONS.map(i => <option key={i}>{i}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className={l}>Category</label><select className={c} value={form.category ?? "Custom"} onChange={e => set("category", e.target.value)}>{DASHBOARD_CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></div>
        <div><label className={l}>Order</label><input type="number" className={c} value={form.order_index ?? 100} onChange={e => set("order_index", parseInt(e.target.value) || 100)} /></div>
        <div><label className={l}>Role</label><select className={c} value={form.required_role ?? "viewer"} onChange={e => set("required_role", e.target.value)}>{DASHBOARD_REQUIRED_ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="checkbox" checked={form.is_visible ?? true} onChange={e => set("is_visible", e.target.checked)} className="rounded" /> Visible</label>
      <div><label className={l}>Description</label><textarea className={c + " h-14"} value={form.description ?? ""} onChange={e => set("description", e.target.value)} /></div>
      <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{isNew ? "Create" : "Save"}</button></div>
    </form>
  );
}

function WidgetForm({ widget, onSave, onCancel }: { widget: DashboardWidget | null; onSave: (f: Partial<DashboardWidget>) => void; onCancel: () => void }) {
  const isNew = !widget;
  const [form, setForm] = useState<Partial<DashboardWidget>>(widget ?? { widget_key: "", title: "", widget_type: "task_table", source_type: "tasks", order_index: 100, width: "full", is_visible: true, required_role: "viewer", description: "" });
  function set(k: string, v: unknown) { setForm(p => ({ ...p, [k]: v })); }
  const c = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  const l = "block text-xs font-medium text-slate-600 mb-1";
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
      <div className="flex justify-between"><h3 className="text-lg font-semibold text-slate-800">{isNew ? "Add Widget" : `Edit: ${widget?.title}`}</h3><button type="button" onClick={onCancel}><X className="h-4 w-4" /></button></div>
      <div><label className={l}>Title</label><input className={c} value={form.title ?? ""} onChange={e => set("title", e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={l}>Widget Key</label><input className={c} value={form.widget_key ?? ""} onChange={e => set("widget_key", e.target.value)} required placeholder="unique_key" /></div>
        <div><label className={l}>Widget Type</label><select className={c} value={form.widget_type ?? ""} onChange={e => set("widget_type", e.target.value)}>{DASHBOARD_WIDGET_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className={l}>Source</label><select className={c} value={form.source_type ?? "tasks"} onChange={e => set("source_type", e.target.value)}>{DASHBOARD_WIDGET_SOURCE_TYPES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label className={l}>Width</label><select className={c} value={form.width ?? "full"} onChange={e => set("width", e.target.value)}>{DASHBOARD_WIDGET_WIDTHS.map(w => <option key={w}>{w}</option>)}</select></div>
        <div><label className={l}>Order</label><input type="number" className={c} value={form.order_index ?? 100} onChange={e => set("order_index", parseInt(e.target.value) || 100)} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="checkbox" checked={form.is_visible ?? true} onChange={e => set("is_visible", e.target.checked)} className="rounded" /> Visible</label>
      <div><label className={l}>Description</label><textarea className={c + " h-14"} value={form.description ?? ""} onChange={e => set("description", e.target.value)} /></div>
      <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{isNew ? "Create" : "Save"}</button></div>
    </form>
  );
}

function WsGroupForm({ ws, onSave, onCancel }: { ws: WorkspaceGroup | null; onSave: (f: Partial<WorkspaceGroup>) => void; onCancel: () => void }) {
  const isNew = !ws;
  const [title, setTitle] = useState(ws?.title ?? "");
  const [description, setDescription] = useState(ws?.description ?? "");
  const [orderIndex, setOrderIndex] = useState(ws?.order_index ?? 100);
  const c = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ title, description, order_index: orderIndex }); }} className="space-y-3">
      <div className="flex justify-between"><h3 className="text-lg font-semibold text-slate-800">{isNew ? "Add Workspace" : `Edit: ${ws?.title}`}</h3><button type="button" onClick={onCancel}><X className="h-4 w-4" /></button></div>
      <div><label className="block text-xs font-medium text-slate-600 mb-1">Name *</label><input className={c} value={title} onChange={e => setTitle(e.target.value)} required autoFocus /></div>
      <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label><textarea className={c + " h-16"} value={description} onChange={e => setDescription(e.target.value)} /></div>
      <div><label className="block text-xs font-medium text-slate-600 mb-1">Order</label><input type="number" className={c + " w-24"} value={orderIndex} onChange={e => setOrderIndex(parseInt(e.target.value) || 100)} /></div>
      <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button><button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{isNew ? "Create" : "Save"}</button></div>
    </form>
  );
}
