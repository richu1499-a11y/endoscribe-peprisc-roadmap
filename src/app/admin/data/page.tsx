"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getTasks, createTask, updateTask, deleteTask,
  getWorkspaceGroups, createWorkspaceGroup, updateWorkspaceGroup, deleteWorkspaceGroup,
  getWorkstreams, createWorkstream, updateWorkstream, deleteWorkstream,
  getMilestones, createMilestone, updateMilestone, deleteMilestone,
  getRisks, createRisk, updateRisk, deleteRisk,
  getDecisions, createDecision, updateDecision, deleteDecision,
  getFutureModules, createFutureModule, updateFutureModule, deleteFutureModule,
  getRegulatoryItems, createRegulatoryItem, updateRegulatoryItem, deleteRegulatoryItem,
  getGovernanceItems, createGovernanceItem, updateGovernanceItem, deleteGovernanceItem,
  getValidationItems, createValidationItem, updateValidationItem, deleteValidationItem,
  getAdminEntityRegistry, updateAdminEntityRegistryItem,
  getAdminPageSetting, updateAdminPageSetting,
} from "@/lib/roadmapStore";
import { getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { AdminEntityRegistryItem, AdminPageSetting } from "@/lib/roadmapTypes";
import { PRIORITIES, TASK_STATUSES, REGULATORY_LEVELS, EVIDENCE_STAGES, MILESTONE_STATUSES, RISK_STATUSES, RISK_SEVERITIES, DECISION_STATUSES, FUTURE_MODULE_STATUSES, FUTURE_MODULE_CATEGORIES, ADMIN_ENTITY_CATEGORIES, DASHBOARD_REQUIRED_ROLES } from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import ComplianceBanner from "@/components/ComplianceBanner";
import { clsx } from "clsx";
import { Plus, X, ShieldAlert, ArrowUp, ArrowDown, Eye, EyeOff, Settings2 } from "lucide-react";
import Link from "next/link";

// Entity CRUD map: slug -> { get, create, update, del, columns, formFields, getId, getTitle, blank }
/* eslint-disable @typescript-eslint/no-explicit-any */
type CRUD = { get: () => Promise<any[]>; create: (i: any) => Promise<any>; update: (id: string, u: any) => Promise<any>; del: (id: string) => Promise<void>;
  columns: { key: string; label: string; render?: (item: any) => React.ReactNode }[];
  formFields: { key: string; label: string; type: "text" | "textarea" | "select" | "date"; options?: readonly string[] }[];
  getId: (i: any) => string; getTitle: (i: any) => string; blank: () => Record<string, unknown>; };
/* eslint-enable @typescript-eslint/no-explicit-any */

const CRUD_MAP: Record<string, CRUD> = {
  tasks: { get: getTasks, create: createTask, update: updateTask, del: deleteTask, getId: t => t.id, getTitle: t => t.title,
    columns: [{ key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "workspace", label: "Workspace" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status", render: (t: { status: string }) => <StatusBadge status={t.status} /> }, { key: "target_date", label: "Due" }],
    formFields: [{ key: "id", label: "ID", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "workstream_id", label: "Workstream ID", type: "text" }, { key: "workspace", label: "Workspace Slug", type: "text" }, { key: "owner", label: "Owner", type: "text" }, { key: "status", label: "Status", type: "select", options: TASK_STATUSES }, { key: "priority", label: "Priority", type: "select", options: PRIORITIES }, { key: "start_date", label: "Start Date", type: "date" }, { key: "target_date", label: "Due Date", type: "date" }, { key: "regulatory_relevance", label: "FDA Relevance", type: "select", options: REGULATORY_LEVELS }, { key: "hipaa_relevance", label: "HIPAA Relevance", type: "select", options: REGULATORY_LEVELS }, { key: "evidence_stage", label: "Evidence Stage", type: "select", options: EVIDENCE_STAGES }, { key: "next_action", label: "Next Action", type: "text" }, { key: "notes", label: "Notes", type: "textarea" }],
    blank: () => ({ id: "", title: "", description: "", workstream_id: "", workspace: "", owner: "", contributors: [], status: "Not started", priority: "Medium", start_date: null, target_date: null, dependencies: [], deliverables: [], blockers: [], risks: [], decision_needed: "", regulatory_relevance: "None", hipaa_relevance: "None", evidence_stage: "Concept", gsd_goal: "", next_action: "", notes: "" }) },
  workspace_groups: { get: getWorkspaceGroups, create: createWorkspaceGroup, update: updateWorkspaceGroup, del: deleteWorkspaceGroup, getId: w => w.id, getTitle: w => w.title,
    columns: [{ key: "title", label: "Title" }, { key: "slug", label: "Slug" }, { key: "description", label: "Description" }, { key: "order_index", label: "Order" }],
    formFields: [{ key: "title", label: "Title", type: "text" }, { key: "slug", label: "Slug", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "icon", label: "Icon", type: "text" }, { key: "order_index", label: "Order", type: "text" }],
    blank: () => ({ title: "", slug: "", description: "", icon: "Briefcase", order_index: 100, is_visible: true }) },
  workstreams: { get: getWorkstreams, create: createWorkstream, update: updateWorkstream, del: deleteWorkstream, getId: w => w.id, getTitle: w => w.label,
    columns: [{ key: "id", label: "ID" }, { key: "label", label: "Label" }, { key: "purpose", label: "Purpose" }, { key: "status", label: "Status", render: (w: { status: string }) => <StatusBadge status={w.status ?? "active"} /> }],
    formFields: [{ key: "id", label: "ID", type: "text" }, { key: "label", label: "Label", type: "text" }, { key: "purpose", label: "Purpose", type: "textarea" }, { key: "owner", label: "Owner", type: "text" }, { key: "status", label: "Status", type: "text" }],
    blank: () => ({ id: "", label: "", purpose: "", owner: "", status: "active" }) },
  milestones: { get: getMilestones, create: createMilestone, update: updateMilestone, del: deleteMilestone, getId: m => m.id, getTitle: m => m.title,
    columns: [{ key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "target_date", label: "Target" }, { key: "status", label: "Status", render: (m: { status: string }) => <StatusBadge status={m.status} /> }],
    formFields: [{ key: "id", label: "ID", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "target_date", label: "Target Date", type: "date" }, { key: "status", label: "Status", type: "select", options: MILESTONE_STATUSES }],
    blank: () => ({ id: "", title: "", description: "", target_date: null, status: "Not started" }) },
  risks: { get: getRisks, create: createRisk, update: updateRisk, del: deleteRisk, getId: r => r.id, getTitle: r => r.title,
    columns: [{ key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "severity", label: "Severity" }, { key: "status", label: "Status", render: (r: { status: string }) => <StatusBadge status={r.status} /> }, { key: "owner", label: "Owner" }],
    formFields: [{ key: "id", label: "ID", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "severity", label: "Severity", type: "select", options: RISK_SEVERITIES }, { key: "status", label: "Status", type: "select", options: RISK_STATUSES }, { key: "mitigation", label: "Mitigation", type: "textarea" }, { key: "owner", label: "Owner", type: "text" }],
    blank: () => ({ id: "", title: "", description: "", severity: "Medium", status: "Open", mitigation: "", owner: "" }) },
  decisions: { get: getDecisions, create: createDecision, update: updateDecision, del: deleteDecision, getId: d => d.id, getTitle: d => d.title,
    columns: [{ key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "status", label: "Status", render: (d: { status: string }) => <StatusBadge status={d.status} /> }, { key: "owner", label: "Owner" }, { key: "due_date", label: "Due" }],
    formFields: [{ key: "id", label: "ID", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "decision_needed", label: "Decision Needed", type: "text" }, { key: "status", label: "Status", type: "select", options: DECISION_STATUSES }, { key: "owner", label: "Owner", type: "text" }, { key: "due_date", label: "Due Date", type: "date" }],
    blank: () => ({ id: "", title: "", description: "", decision_needed: "", status: "Pending", owner: "", due_date: null }) },
  future_modules: { get: getFutureModules, create: createFutureModule, update: updateFutureModule, del: deleteFutureModule, getId: f => f.id, getTitle: f => f.title,
    columns: [{ key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "status", label: "Status", render: (f: { status: string }) => <StatusBadge status={f.status} /> }, { key: "priority", label: "Priority" }, { key: "target_phase", label: "Phase" }],
    formFields: [{ key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "category", label: "Category", type: "select", options: FUTURE_MODULE_CATEGORIES }, { key: "status", label: "Status", type: "select", options: FUTURE_MODULE_STATUSES }, { key: "priority", label: "Priority", type: "select", options: PRIORITIES }, { key: "target_phase", label: "Target Phase", type: "text" }, { key: "owner", label: "Owner", type: "text" }, { key: "next_action", label: "Next Action", type: "text" }, { key: "notes", label: "Notes", type: "textarea" }],
    blank: () => ({ title: "", description: "", category: "Other", status: "Concept", priority: "Medium", target_phase: "", owner: "", next_action: "", notes: "" }) },
  regulatory_items: { get: getRegulatoryItems, create: createRegulatoryItem, update: updateRegulatoryItem, del: deleteRegulatoryItem, getId: r => r.id, getTitle: r => r.title,
    columns: [{ key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "status", label: "Status", render: (r: { status: string }) => <StatusBadge status={r.status} /> }, { key: "regulatory_risk", label: "Risk" }],
    formFields: [{ key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "category", label: "Category", type: "text" }, { key: "status", label: "Status", type: "text" }, { key: "priority", label: "Priority", type: "select", options: PRIORITIES }, { key: "owner", label: "Owner", type: "text" }, { key: "next_action", label: "Next Action", type: "text" }],
    blank: () => ({ title: "", description: "", category: "Intended Use", status: "Not started", priority: "Medium", owner: "", next_action: "" }) },
  governance_items: { get: getGovernanceItems, create: createGovernanceItem, update: updateGovernanceItem, del: deleteGovernanceItem, getId: g => g.id, getTitle: g => g.title,
    columns: [{ key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "status", label: "Status", render: (g: { status: string }) => <StatusBadge status={g.status} /> }, { key: "hipaa_risk", label: "Compliance" }],
    formFields: [{ key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "category", label: "Category", type: "text" }, { key: "status", label: "Status", type: "text" }, { key: "priority", label: "Priority", type: "select", options: PRIORITIES }, { key: "owner", label: "Owner", type: "text" }, { key: "next_action", label: "Next Action", type: "text" }],
    blank: () => ({ title: "", description: "", category: "IRB Amendment", status: "Not started", priority: "Medium", owner: "", next_action: "" }) },
  validation_items: { get: getValidationItems, create: createValidationItem, update: updateValidationItem, del: deleteValidationItem, getId: v => v.id, getTitle: v => v.title,
    columns: [{ key: "title", label: "Title" }, { key: "validation_domain", label: "Domain" }, { key: "status", label: "Status", render: (v: { status: string }) => <StatusBadge status={v.status} /> }, { key: "metric_name", label: "Metric" }],
    formFields: [{ key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "validation_domain", label: "Domain", type: "text" }, { key: "status", label: "Status", type: "text" }, { key: "priority", label: "Priority", type: "select", options: PRIORITIES }, { key: "owner", label: "Owner", type: "text" }, { key: "metric_name", label: "Metric", type: "text" }, { key: "next_action", label: "Next Action", type: "text" }],
    blank: () => ({ title: "", description: "", validation_domain: "ASR / Transcription", status: "Not started", priority: "Medium", owner: "", metric_name: "", next_action: "" }) },
};

export default function UniversalDataPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [registry, setRegistry] = useState<AdminEntityRegistryItem[]>([]);
  const [pageSetting, setPageSetting] = useState<AdminPageSetting | null>(null);
  const [activeSlug, setActiveSlug] = useState<string>("");
  const [showConfig, setShowConfig] = useState(false);

  // Entity data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null | "new">(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Config editing
  const [editingReg, setEditingReg] = useState<AdminEntityRegistryItem | null>(null);
  const [editingPage, setEditingPage] = useState(false);

  const visibleRegistry = registry.filter(r => r.is_visible).sort((a, b) => a.order_index - b.order_index);
  const currentReg = registry.find(r => r.slug === activeSlug);
  const crud = activeSlug ? CRUD_MAP[currentReg?.entity_type ?? ""] : null;

  const refreshRegistry = useCallback(async () => {
    const [reg, ps] = await Promise.all([getAdminEntityRegistry(), getAdminPageSetting("admin_data")]);
    setRegistry(reg.sort((a, b) => a.order_index - b.order_index));
    setPageSetting(ps);
    if (!activeSlug && reg.length > 0) {
      const first = reg.filter(r => r.is_visible).sort((a, b) => a.order_index - b.order_index)[0];
      if (first) setActiveSlug(first.slug);
    }
  }, [activeSlug]);

  const refreshData = useCallback(async () => {
    if (!crud) { setData([]); return; }
    try { setData(await crud.get()); } catch { setData([]); }
  }, [crud]);

  useEffect(() => {
    const init = async () => {
      if (!isSupabaseConfigured) { setAuthorized(false); return; }
      const role = await getCurrentRole();
      if (!checkIsAdmin(role)) { setAuthorized(false); return; }
      setAuthorized(true);
      await refreshRegistry();
    };
    init();
  }, [refreshRegistry]);

  useEffect(() => { if (authorized && crud) { const load = async () => { await refreshData(); }; load(); } }, [authorized, refreshData, crud]);

  if (authorized === null) return <div className="pt-12 text-center text-sm text-slate-500">Loading...</div>;
  if (!authorized) return (
    <div className="mx-auto max-w-md space-y-4 pt-12">
      <h1 className="text-xl font-bold text-slate-900">Data Manager</h1>
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert className="mb-1 h-5 w-5" /> Admin access required.</div>
      <Link href="/login" className="text-sm text-indigo-600 hover:underline">Sign in</Link>
    </div>
  );

  const filtered = search && crud ? data.filter(item => String(crud.getTitle(item) ?? "").toLowerCase().includes(search.toLowerCase())) : data;

  async function handleSave(form: Record<string, unknown>) {
    if (!crud) return;
    setError(null);
    try {
      if (editing === "new") await crud.create(form);
      else if (editing) await crud.update(crud.getId(editing), form);
      setEditing(null); await refreshData();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleDelete(item: any) {
    if (!crud) return;
    if (!confirm(`Delete "${crud.getTitle(item)}"?`)) return;
    try { await crud.del(crud.getId(item)); await refreshData(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleRegMove(item: AdminEntityRegistryItem, dir: "up" | "down") {
    const sorted = [...registry].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex(r => r.id === item.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    try {
      await updateAdminEntityRegistryItem(sorted[idx].id, { order_index: sorted[swapIdx].order_index });
      await updateAdminEntityRegistryItem(sorted[swapIdx].id, { order_index: sorted[idx].order_index });
      await refreshRegistry();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleRegToggle(item: AdminEntityRegistryItem) {
    try { await updateAdminEntityRegistryItem(item.id, { is_visible: !item.is_visible }); await refreshRegistry(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleRegSave(form: Partial<AdminEntityRegistryItem>) {
    try {
      if (editingReg) await updateAdminEntityRegistryItem(editingReg.id, form);
      setEditingReg(null); await refreshRegistry();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handlePageSave(title: string, subtitle: string) {
    try { await updateAdminPageSetting("admin_data", { title, subtitle }); setEditingPage(false); await refreshRegistry(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  const thCls = "px-3 py-2 text-left text-[10px] uppercase text-slate-500 border-b bg-slate-50";
  const tdCls = "px-3 py-2 text-xs text-slate-700";
  const tabCls = (slug: string) => clsx("px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap", activeSlug === slug ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600 hover:bg-slate-50");
  const inputCls = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{pageSetting?.title ?? "Universal Data Manager"}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{pageSetting?.subtitle ?? "Admin CRUD for roadmap entities"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowConfig(!showConfig)} className={clsx("flex items-center gap-1 rounded px-3 py-2 text-sm font-medium transition-colors", showConfig ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50")}><Settings2 className="h-4 w-4" /> Configure</button>
          {crud && currentReg?.allow_create && <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Add {currentReg?.label}</button>}
        </div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* ====== Configure Panel ====== */}
      {showConfig && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Configure Data Manager</h2>
            <div className="flex gap-2">
              <button onClick={() => setEditingPage(true)} className="text-xs text-indigo-600 hover:underline">Edit Page Title</button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">Admin Entity Registry controls which tabs appear below. Dashboard Registry (in Dashboard Manager) controls the app sidebar. They are separate systems.</p>
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="w-full text-left">
              <thead><tr><th className={thCls}>Ord</th><th className={thCls}>Label</th><th className={thCls}>Entity</th><th className={thCls}>Cat</th><th className={thCls}>Vis</th><th className={thCls}>Role</th><th className={thCls + " text-right"}>Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {registry.sort((a, b) => a.order_index - b.order_index).map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className={tdCls + " font-mono"}>{r.order_index}</td>
                    <td className={tdCls + " font-medium"}>{r.plural_label || r.label}</td>
                    <td className={tdCls + " font-mono text-[10px]"}>{r.entity_type}</td>
                    <td className={tdCls}>{r.category}</td>
                    <td className={tdCls}>{r.is_visible ? <span className="text-green-600">Yes</span> : <span className="text-slate-400">No</span>}</td>
                    <td className={tdCls}>{r.required_role}</td>
                    <td className={tdCls + " text-right whitespace-nowrap"}>
                      <button onClick={() => handleRegToggle(r)} className="mr-1 text-slate-400 hover:text-slate-700">{r.is_visible ? <EyeOff className="h-3.5 w-3.5 inline" /> : <Eye className="h-3.5 w-3.5 inline" />}</button>
                      <button onClick={() => handleRegMove(r, "up")} className="mr-1 text-slate-400 hover:text-slate-700"><ArrowUp className="h-3.5 w-3.5 inline" /></button>
                      <button onClick={() => handleRegMove(r, "down")} className="mr-1 text-slate-400 hover:text-slate-700"><ArrowDown className="h-3.5 w-3.5 inline" /></button>
                      <button onClick={() => setEditingReg(r)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab selector */}
      <div className="flex flex-wrap gap-1.5">
        {visibleRegistry.map(r => (
          <button key={r.slug} className={tabCls(r.slug)} onClick={() => { setActiveSlug(r.slug); setSearch(""); }}>
            {r.plural_label || r.label} {r.show_count ? `(${activeSlug === r.slug ? data.length : ""})` : ""}
          </button>
        ))}
      </div>

      {/* Entity not found */}
      {activeSlug && !crud && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">Entity type &ldquo;{currentReg?.entity_type}&rdquo; is registered but no renderer is available yet.</p>
        </div>
      )}

      {/* Entity CRUD */}
      {crud && (
        <>
          <div className="flex items-center gap-3">
            <input className={inputCls + " w-64"} placeholder={`Search ${currentReg?.plural_label ?? "items"}...`} value={search} onChange={e => setSearch(e.target.value)} />
            <span className="text-xs text-slate-500">{filtered.length} items</span>
          </div>

          <ComplianceBanner />

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left">
              <thead><tr>
                {crud.columns.map(col => <th key={col.key} className={thCls}>{col.label}</th>)}
                {(currentReg?.allow_edit || currentReg?.allow_delete) && <th className={thCls + " text-right"}>Actions</th>}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item: Record<string, unknown>, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {crud.columns.map(col => (
                      <td key={col.key} className={tdCls + " max-w-[200px] truncate"}>
                        {col.render ? col.render(item) : String(item[col.key] ?? "--")}
                      </td>
                    ))}
                    {(currentReg?.allow_edit || currentReg?.allow_delete) && (
                      <td className={tdCls + " text-right whitespace-nowrap"}>
                        {currentReg?.allow_edit && <button onClick={() => setEditing(item)} className="mr-2 text-xs text-indigo-600 hover:underline">Edit</button>}
                        {currentReg?.allow_delete && <button onClick={() => handleDelete(item)} className="text-xs text-red-500 hover:underline">Delete</button>}
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={crud.columns.length + 1} className="px-4 py-6 text-center text-sm text-slate-500">{currentReg?.empty_state_title || "No items."} {currentReg?.allow_create ? "Click Add to create one." : ""}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Entity edit modal */}
      {editing && crud && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-12">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <FormModal fields={crud.formFields} initial={editing === "new" ? crud.blank() : editing} isNew={editing === "new"} label={currentReg?.label ?? "Item"} onSave={handleSave} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}

      {/* Registry edit modal */}
      {editingReg && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-12">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <RegEditModal reg={editingReg} onSave={handleRegSave} onCancel={() => setEditingReg(null)} />
          </div>
        </div>
      )}

      {/* Page settings modal */}
      {editingPage && pageSetting && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-20">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <PageEditModal setting={pageSetting} onSave={handlePageSave} onCancel={() => setEditingPage(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// === Modals ===
function FormModal({ fields, initial, isNew, label, onSave, onCancel }: { fields: { key: string; label: string; type: string; options?: readonly string[] }[]; initial: Record<string, unknown>; isNew: boolean; label: string; onSave: (f: Record<string, unknown>) => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial);
  function set(k: string, v: unknown) { setForm(p => ({ ...p, [k]: v })); }
  const c = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
      <div className="flex justify-between"><h3 className="text-lg font-semibold text-slate-800">{isNew ? `Add ${label}` : `Edit ${label}`}</h3><button type="button" onClick={onCancel}><X className="h-4 w-4" /></button></div>
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
          {f.type === "textarea" ? <textarea className={c + " h-16"} value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value)} />
          : f.type === "select" && f.options ? <select className={c} value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value)}><option value="">Select...</option>{f.options.map(o => <option key={o}>{o}</option>)}</select>
          : f.type === "date" ? <input type="date" className={c} value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value || null)} />
          : <input className={c} value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value)} disabled={f.key === "id" && !isNew} />}
        </div>
      ))}
      <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Do not enter PHI or patient identifiers.</div>
      <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button><button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{isNew ? "Create" : "Save"}</button></div>
    </form>
  );
}

function RegEditModal({ reg, onSave, onCancel }: { reg: AdminEntityRegistryItem; onSave: (f: Partial<AdminEntityRegistryItem>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Partial<AdminEntityRegistryItem>>(reg);
  function set(k: string, v: unknown) { setForm(p => ({ ...p, [k]: v })); }
  const c = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
      <div className="flex justify-between"><h3 className="text-lg font-semibold text-slate-800">Edit Tab: {reg.label}</h3><button type="button" onClick={onCancel}><X className="h-4 w-4" /></button></div>
      <div><label className="block text-xs font-medium text-slate-600 mb-1">Label (singular)</label><input className={c} value={form.label ?? ""} onChange={e => set("label", e.target.value)} /></div>
      <div><label className="block text-xs font-medium text-slate-600 mb-1">Plural Label</label><input className={c} value={form.plural_label ?? ""} onChange={e => set("plural_label", e.target.value)} /></div>
      <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label><textarea className={c + " h-14"} value={form.description ?? ""} onChange={e => set("description", e.target.value)} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-xs font-medium text-slate-600 mb-1">Category</label><select className={c} value={form.category ?? ""} onChange={e => set("category", e.target.value)}>{ADMIN_ENTITY_CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></div>
        <div><label className="block text-xs font-medium text-slate-600 mb-1">Order</label><input type="number" className={c} value={form.order_index ?? 100} onChange={e => set("order_index", parseInt(e.target.value) || 100)} /></div>
        <div><label className="block text-xs font-medium text-slate-600 mb-1">Role</label><select className={c} value={form.required_role ?? "admin"} onChange={e => set("required_role", e.target.value)}>{DASHBOARD_REQUIRED_ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
      </div>
      <div className="flex flex-wrap gap-3">
        {(["allow_create", "allow_edit", "allow_delete", "allow_reorder", "allow_archive", "show_count", "is_visible"] as const).map(k => (
          <label key={k} className="flex items-center gap-1 text-xs text-slate-700"><input type="checkbox" checked={(form as Record<string, unknown>)[k] as boolean ?? false} onChange={e => set(k, e.target.checked)} className="rounded" /> {k.replace(/_/g, " ")}</label>
        ))}
      </div>
      {reg.is_system && <p className="text-[10px] text-slate-400">System entity: entity_type and table_name are locked.</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button><button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Save</button></div>
    </form>
  );
}

function PageEditModal({ setting, onSave, onCancel }: { setting: AdminPageSetting; onSave: (title: string, subtitle: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(setting.title);
  const [subtitle, setSubtitle] = useState(setting.subtitle ?? "");
  const c = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(title, subtitle); }} className="space-y-3">
      <div className="flex justify-between"><h3 className="text-lg font-semibold text-slate-800">Edit Page Settings</h3><button type="button" onClick={onCancel}><X className="h-4 w-4" /></button></div>
      <div><label className="block text-xs font-medium text-slate-600 mb-1">Title</label><input className={c} value={title} onChange={e => setTitle(e.target.value)} required /></div>
      <div><label className="block text-xs font-medium text-slate-600 mb-1">Subtitle</label><input className={c} value={subtitle} onChange={e => setSubtitle(e.target.value)} /></div>
      <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button><button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Save</button></div>
    </form>
  );
}
