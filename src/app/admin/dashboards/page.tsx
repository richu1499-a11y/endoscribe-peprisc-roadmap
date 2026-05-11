"use client";

import { useEffect, useState, useCallback } from "react";
import { getDashboardRegistry, updateDashboardRegistryItem, createDashboardRegistryItem, deleteDashboardRegistryItem } from "@/lib/roadmapStore";
import { getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { DashboardRegistryItem } from "@/lib/roadmapTypes";
import { DASHBOARD_CATEGORIES, DASHBOARD_REQUIRED_ROLES, DASHBOARD_ICON_OPTIONS } from "@/lib/roadmapTypes";
import MetricCard from "@/components/MetricCard";
import ComplianceBanner from "@/components/ComplianceBanner";
import { clsx } from "clsx";
import { ShieldAlert, Plus, X, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function DashboardManagerPage() {
  const [items, setItems] = useState<DashboardRegistryItem[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<DashboardRegistryItem | null | "new">(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setItems(await getDashboardRegistry());
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!isSupabaseConfigured) { setAuthorized(false); return; }
      const role = await getCurrentRole();
      if (!checkIsAdmin(role)) { setAuthorized(false); return; }
      setAuthorized(true);
      await refresh();
    };
    init();
  }, [refresh]);

  if (authorized === null) return <div className="pt-12 text-center text-sm text-slate-500">Loading...</div>;
  if (!authorized) return (
    <div className="mx-auto max-w-md space-y-4 pt-12">
      <h1 className="text-xl font-bold text-slate-900">Dashboard Manager</h1>
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert className="mb-1 h-5 w-5" /> Admin access required.</div>
      <Link href="/login" className="text-sm text-indigo-600 hover:underline">Sign in</Link>
    </div>
  );

  const visible = items.filter(i => i.is_visible);
  const hidden = items.filter(i => !i.is_visible);
  const adminOnly = items.filter(i => i.required_role === "admin");
  const system = items.filter(i => i.is_system);
  const custom = items.filter(i => !i.is_system);

  async function toggleVisibility(item: DashboardRegistryItem) {
    setError(null);
    try {
      await updateDashboardRegistryItem(item.id, { is_visible: !item.is_visible });
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function moveItem(item: DashboardRegistryItem, direction: "up" | "down") {
    const sorted = [...items].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex(i => i.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    setError(null);
    try {
      const thisOrder = sorted[idx].order_index;
      const otherOrder = sorted[swapIdx].order_index;
      await updateDashboardRegistryItem(sorted[idx].id, { order_index: otherOrder });
      await updateDashboardRegistryItem(sorted[swapIdx].id, { order_index: thisOrder });
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleDelete(item: DashboardRegistryItem) {
    if (item.is_system) { setError("Cannot delete system dashboards."); return; }
    if (!confirm(`Delete dashboard "${item.title}"?`)) return;
    try { await deleteDashboardRegistryItem(item.id); await refresh(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleSave(form: Partial<DashboardRegistryItem>) {
    setError(null);
    try {
      if (editing === "new") {
        await createDashboardRegistryItem(form);
      } else if (editing) {
        await updateDashboardRegistryItem(editing.id, form);
      }
      setEditing(null);
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  const thCls = "px-3 py-2 text-left text-[10px] uppercase text-slate-500 border-b bg-slate-50";
  const tdCls = "px-3 py-2 text-xs text-slate-700";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">Admin control panel for dashboard visibility, labels, navigation order, roles, and layout</p>
        </div>
        <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add Dashboard
        </button>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total" value={items.length} />
        <MetricCard label="Visible" value={visible.length} accent="green" />
        <MetricCard label="Hidden" value={hidden.length} accent={hidden.length > 0 ? "amber" : "default"} />
        <MetricCard label="Admin-Only" value={adminOnly.length} />
        <MetricCard label="System" value={system.length} />
        <MetricCard label="Custom" value={custom.length} accent="blue" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead><tr>
            <th className={thCls}>Order</th><th className={thCls}>Title</th><th className={thCls}>Route</th>
            <th className={thCls}>Category</th><th className={thCls}>Visible</th><th className={thCls}>Role</th>
            <th className={thCls}>Type</th><th className={thCls + " text-right"}>Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.sort((a, b) => a.order_index - b.order_index).map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className={tdCls + " font-mono text-slate-500"}>{item.order_index}</td>
                <td className={tdCls + " font-medium text-slate-800"}>{item.title}</td>
                <td className={tdCls + " font-mono text-[10px]"}>{item.route}</td>
                <td className={tdCls}><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">{item.category}</span></td>
                <td className={tdCls}>{item.is_visible ? <span className="text-green-600">Yes</span> : <span className="text-slate-400">No</span>}</td>
                <td className={tdCls}><span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-medium", item.required_role === "admin" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600")}>{item.required_role}</span></td>
                <td className={tdCls}>{item.is_system ? "System" : <span className="text-indigo-600">Custom</span>}</td>
                <td className={tdCls + " text-right whitespace-nowrap"}>
                  <button onClick={() => toggleVisibility(item)} className="mr-1 text-slate-400 hover:text-slate-700" title={item.is_visible ? "Hide" : "Show"}>
                    {item.is_visible ? <EyeOff className="h-3.5 w-3.5 inline" /> : <Eye className="h-3.5 w-3.5 inline" />}
                  </button>
                  <button onClick={() => moveItem(item, "up")} className="mr-1 text-slate-400 hover:text-slate-700"><ArrowUp className="h-3.5 w-3.5 inline" /></button>
                  <button onClick={() => moveItem(item, "down")} className="mr-1 text-slate-400 hover:text-slate-700"><ArrowDown className="h-3.5 w-3.5 inline" /></button>
                  <button onClick={() => setEditing(item)} className="mr-1 text-xs text-indigo-600 hover:underline">Edit</button>
                  {!item.is_system && <button onClick={() => handleDelete(item)} className="text-xs text-red-500 hover:underline">Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800">Future: Widget Layout Editor</h3>
        <p className="mt-1 text-xs text-slate-600">Widget-level dashboard layout editing will be added in a later build. It will allow moving sections such as Gantt charts, PHI data-flow matrices, regulatory items, and workload summaries between dashboards.</p>
      </div>

      <ComplianceBanner />

      {/* Edit/Add modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-16">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <DashboardForm
              item={editing === "new" ? null : editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline form component
// ---------------------------------------------------------------------------
function DashboardForm({ item, onSave, onCancel }: {
  item: DashboardRegistryItem | null;
  onSave: (form: Partial<DashboardRegistryItem>) => void;
  onCancel: () => void;
}) {
  const isNew = !item;
  const [form, setForm] = useState<Partial<DashboardRegistryItem>>(item ?? {
    slug: "", title: "", description: "", route: "/custom/", icon: "FileText",
    category: "Custom", order_index: 100, is_visible: true, required_role: "viewer", notes: "",
  });

  function set(key: string, value: unknown) { setForm(prev => ({ ...prev, [key]: value })); }

  const inputCls = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{isNew ? "Add Dashboard" : `Edit: ${item?.title}`}</h3>
        <button type="button" onClick={onCancel} className="rounded p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>

      {isNew && (
        <div><label className={labelCls}>Slug (unique ID)</label><input className={inputCls} value={form.slug ?? ""} onChange={e => set("slug", e.target.value)} required /></div>
      )}

      <div><label className={labelCls}>Title</label><input className={inputCls} value={form.title ?? ""} onChange={e => set("title", e.target.value)} required /></div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Route</label>
          <input className={inputCls} value={form.route ?? ""} onChange={e => set("route", e.target.value)} required disabled={item?.is_system} />
          {item?.is_system && <p className="mt-0.5 text-[10px] text-slate-400">System route locked</p>}
        </div>
        <div>
          <label className={labelCls}>Icon</label>
          <select className={inputCls} value={form.icon ?? "FileText"} onChange={e => set("icon", e.target.value)}>
            {DASHBOARD_ICON_OPTIONS.map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category ?? "Custom"} onChange={e => set("category", e.target.value)}>
            {DASHBOARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Order</label>
          <input type="number" className={inputCls} value={form.order_index ?? 100} onChange={e => set("order_index", parseInt(e.target.value) || 100)} />
        </div>
        <div>
          <label className={labelCls}>Required Role</label>
          <select className={inputCls} value={form.required_role ?? "viewer"} onChange={e => set("required_role", e.target.value)}>
            {DASHBOARD_REQUIRED_ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={form.is_visible ?? true} onChange={e => set("is_visible", e.target.checked)} className="rounded" /> Visible in sidebar
        </label>
      </div>

      <div><label className={labelCls}>Description</label><textarea className={inputCls + " h-14"} value={form.description ?? ""} onChange={e => set("description", e.target.value)} /></div>
      <div><label className={labelCls}>Notes</label><textarea className={inputCls + " h-14"} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} /></div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{isNew ? "Create" : "Save"}</button>
      </div>
    </form>
  );
}
