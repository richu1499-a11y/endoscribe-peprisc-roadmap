"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getWorkstreams, createWorkstream, updateWorkstream, deleteWorkstream,
  getMilestones, createMilestone, updateMilestone, deleteMilestone,
  getRisks, createRisk, updateRisk, deleteRisk,
  getDecisions, createDecision, updateDecision, deleteDecision,
  getFutureModules, createFutureModule, updateFutureModule, deleteFutureModule,
  getRegulatoryItems, createRegulatoryItem, updateRegulatoryItem, deleteRegulatoryItem,
  getGovernanceItems, createGovernanceItem, updateGovernanceItem, deleteGovernanceItem,
  getValidationItems, createValidationItem, updateValidationItem, deleteValidationItem,
} from "@/lib/roadmapStore";
import { getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { Workstream, Milestone, RiskItem, DecisionItem, FutureModule, RegulatoryItem, GovernanceItem, ValidationItem } from "@/lib/roadmapTypes";
import { PRIORITIES, MILESTONE_STATUSES, RISK_STATUSES, RISK_SEVERITIES, DECISION_STATUSES, FUTURE_MODULE_STATUSES, FUTURE_MODULE_CATEGORIES } from "@/lib/roadmapTypes";
import StatusBadge from "@/components/StatusBadge";
import ComplianceBanner from "@/components/ComplianceBanner";
import { clsx } from "clsx";
import { Plus, X, ShieldAlert } from "lucide-react";
import Link from "next/link";

type TabKey = "workstreams" | "milestones" | "risks" | "decisions" | "future" | "regulatory" | "governance" | "validation";

// Generic entity config for each tab
interface EntityConfig<T> {
  key: TabKey;
  label: string;
  get: () => Promise<T[]>;
  create: (item: Partial<T>) => Promise<T>;
  update: (id: string, updates: Partial<T>) => Promise<T>;
  del: (id: string) => Promise<void>;
  getId: (item: T) => string;
  getTitle: (item: T) => string;
  columns: { key: string; label: string; render?: (item: T) => React.ReactNode }[];
  formFields: { key: string; label: string; type: "text" | "textarea" | "select" | "date"; options?: readonly string[] }[];
  blank: () => Partial<T>;
}

// Helper to build configs
function cfg<T>(c: EntityConfig<T>): EntityConfig<T> { return c; }

const TABS: EntityConfig<never>[] = [
  cfg<Workstream>({ key: "workstreams", label: "Workstreams", get: getWorkstreams, create: createWorkstream as never, update: updateWorkstream as never, del: deleteWorkstream, getId: w => w.id, getTitle: w => w.label,
    columns: [{ key: "id", label: "ID" }, { key: "label", label: "Label" }, { key: "purpose", label: "Purpose" }, { key: "status", label: "Status", render: w => <StatusBadge status={w.status ?? "active"} /> }],
    formFields: [{ key: "id", label: "ID", type: "text" }, { key: "label", label: "Label", type: "text" }, { key: "purpose", label: "Purpose", type: "textarea" }, { key: "owner", label: "Owner", type: "text" }, { key: "status", label: "Status", type: "text" }],
    blank: () => ({ id: "", label: "", purpose: "", owner: "", status: "active" }),
  }) as never,
  cfg<Milestone>({ key: "milestones", label: "Milestones", get: getMilestones, create: createMilestone as never, update: updateMilestone as never, del: deleteMilestone, getId: m => m.id, getTitle: m => m.title,
    columns: [{ key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "target_date", label: "Target" }, { key: "status", label: "Status", render: m => <StatusBadge status={m.status} /> }],
    formFields: [{ key: "id", label: "ID", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "target_date", label: "Target Date", type: "date" }, { key: "status", label: "Status", type: "select", options: MILESTONE_STATUSES }],
    blank: () => ({ id: "", title: "", description: "", target_date: null, status: "Not started" }),
  }) as never,
  cfg<RiskItem>({ key: "risks", label: "Risks", get: getRisks, create: createRisk as never, update: updateRisk as never, del: deleteRisk, getId: r => r.id, getTitle: r => r.title,
    columns: [{ key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "severity", label: "Severity" }, { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> }, { key: "owner", label: "Owner" }],
    formFields: [{ key: "id", label: "ID", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "severity", label: "Severity", type: "select", options: RISK_SEVERITIES }, { key: "status", label: "Status", type: "select", options: RISK_STATUSES }, { key: "mitigation", label: "Mitigation", type: "textarea" }, { key: "owner", label: "Owner", type: "text" }],
    blank: () => ({ id: "", title: "", description: "", severity: "Medium", status: "Open", mitigation: "", owner: "" }),
  }) as never,
  cfg<DecisionItem>({ key: "decisions", label: "Decisions", get: getDecisions, create: createDecision as never, update: updateDecision as never, del: deleteDecision, getId: d => d.id, getTitle: d => d.title,
    columns: [{ key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "status", label: "Status", render: d => <StatusBadge status={d.status} /> }, { key: "owner", label: "Owner" }, { key: "due_date", label: "Due" }],
    formFields: [{ key: "id", label: "ID", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "decision_needed", label: "Decision Needed", type: "text" }, { key: "status", label: "Status", type: "select", options: DECISION_STATUSES }, { key: "owner", label: "Owner", type: "text" }, { key: "due_date", label: "Due Date", type: "date" }],
    blank: () => ({ id: "", title: "", description: "", decision_needed: "", status: "Pending", owner: "", due_date: null }),
  }) as never,
  cfg<FutureModule>({ key: "future", label: "Future Modules", get: getFutureModules, create: createFutureModule as never, update: updateFutureModule as never, del: deleteFutureModule, getId: f => f.id, getTitle: f => f.title,
    columns: [{ key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "status", label: "Status", render: f => <StatusBadge status={f.status} /> }, { key: "priority", label: "Priority" }, { key: "target_phase", label: "Phase" }],
    formFields: [{ key: "title", label: "Title", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "category", label: "Category", type: "select", options: FUTURE_MODULE_CATEGORIES }, { key: "status", label: "Status", type: "select", options: FUTURE_MODULE_STATUSES }, { key: "priority", label: "Priority", type: "select", options: PRIORITIES }, { key: "target_phase", label: "Target Phase", type: "text" }, { key: "owner", label: "Owner", type: "text" }, { key: "next_action", label: "Next Action", type: "text" }, { key: "notes", label: "Notes", type: "textarea" }],
    blank: () => ({ title: "", description: "", category: "Other", status: "Concept", priority: "Medium", target_phase: "", owner: "", next_action: "", notes: "" }),
  }) as never,
  { key: "regulatory", label: "Regulatory", get: getRegulatoryItems, create: createRegulatoryItem, update: updateRegulatoryItem, del: deleteRegulatoryItem, getId: (r: RegulatoryItem) => r.id, getTitle: (r: RegulatoryItem) => r.title,
    columns: [{ key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "status", label: "Status", render: (r: RegulatoryItem) => <StatusBadge status={r.status} /> }, { key: "regulatory_risk", label: "Risk" }],
    formFields: [{ key: "title", label: "Title", type: "text" as const }, { key: "description", label: "Description", type: "textarea" as const }, { key: "category", label: "Category", type: "text" as const }, { key: "status", label: "Status", type: "text" as const }, { key: "priority", label: "Priority", type: "select" as const, options: PRIORITIES }, { key: "owner", label: "Owner", type: "text" as const }, { key: "next_action", label: "Next Action", type: "text" as const }],
    blank: () => ({ title: "", description: "", category: "Intended Use", status: "Not started", priority: "Medium", owner: "", next_action: "" }),
  } as never,
  { key: "governance", label: "Governance", get: getGovernanceItems, create: createGovernanceItem, update: updateGovernanceItem, del: deleteGovernanceItem, getId: (g: GovernanceItem) => g.id, getTitle: (g: GovernanceItem) => g.title,
    columns: [{ key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "status", label: "Status", render: (g: GovernanceItem) => <StatusBadge status={g.status} /> }, { key: "hipaa_risk", label: "HIPAA" }],
    formFields: [{ key: "title", label: "Title", type: "text" as const }, { key: "description", label: "Description", type: "textarea" as const }, { key: "category", label: "Category", type: "text" as const }, { key: "status", label: "Status", type: "text" as const }, { key: "priority", label: "Priority", type: "select" as const, options: PRIORITIES }, { key: "owner", label: "Owner", type: "text" as const }, { key: "next_action", label: "Next Action", type: "text" as const }],
    blank: () => ({ title: "", description: "", category: "IRB Amendment", status: "Not started", priority: "Medium", owner: "", next_action: "" }),
  } as never,
  { key: "validation", label: "Validation", get: getValidationItems, create: createValidationItem, update: updateValidationItem, del: deleteValidationItem, getId: (v: ValidationItem) => v.id, getTitle: (v: ValidationItem) => v.title,
    columns: [{ key: "title", label: "Title" }, { key: "validation_domain", label: "Domain" }, { key: "status", label: "Status", render: (v: ValidationItem) => <StatusBadge status={v.status} /> }, { key: "metric_name", label: "Metric" }],
    formFields: [{ key: "title", label: "Title", type: "text" as const }, { key: "description", label: "Description", type: "textarea" as const }, { key: "validation_domain", label: "Domain", type: "text" as const }, { key: "status", label: "Status", type: "text" as const }, { key: "priority", label: "Priority", type: "select" as const, options: PRIORITIES }, { key: "owner", label: "Owner", type: "text" as const }, { key: "metric_name", label: "Metric Name", type: "text" as const }, { key: "next_action", label: "Next Action", type: "text" as const }],
    blank: () => ({ title: "", description: "", validation_domain: "ASR / Transcription", status: "Not started", priority: "Medium", owner: "", metric_name: "", next_action: "" }),
  } as never,
];

export default function UniversalDataPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabKey>("workstreams");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null | "new">(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const currentTab = TABS.find(t => t.key === tab)!;

  const refresh = useCallback(async () => {
    try { setData(await (currentTab.get as () => Promise<Record<string, unknown>[]>)()); }
    catch { setData([]); }
  }, [currentTab]);

  useEffect(() => {
    const init = async () => {
      if (!isSupabaseConfigured) { setAuthorized(false); return; }
      const role = await getCurrentRole();
      if (!checkIsAdmin(role)) { setAuthorized(false); return; }
      setAuthorized(true);
    };
    init();
  }, []);

  useEffect(() => { if (authorized) { const load = async () => { await refresh(); }; load(); } }, [authorized, refresh]);

  if (authorized === null) return <div className="pt-12 text-center text-sm text-slate-500">Loading...</div>;
  if (!authorized) return (
    <div className="mx-auto max-w-md space-y-4 pt-12">
      <h1 className="text-xl font-bold text-slate-900">Universal Data Manager</h1>
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert className="mb-1 h-5 w-5" /> Admin access required.</div>
      <Link href="/login" className="text-sm text-indigo-600 hover:underline">Sign in</Link>
    </div>
  );

  const filtered = search
    ? data.filter(item => {
        const title = String(tab_getTitle(item) ?? "");
        return title.toLowerCase().includes(search.toLowerCase());
      })
    : data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tab_create = currentTab.create as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tab_update = currentTab.update as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tab_getId = currentTab.getId as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tab_getTitle = currentTab.getTitle as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tab_del = currentTab.del as any;

  async function handleSave(form: Record<string, unknown>) {
    setError(null);
    try {
      if (editing === "new") {
        await tab_create(form);
      } else if (editing) {
        await tab_update(tab_getId(editing), form);
      }
      setEditing(null);
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleDelete(item: Record<string, unknown>) {
    if (!confirm(`Delete "${tab_getTitle(item)}"?`)) return;
    setError(null);
    try {
      await tab_del(tab_getId(item));
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  const thCls = "px-3 py-2 text-left text-[10px] uppercase text-slate-500 border-b bg-slate-50";
  const tdCls = "px-3 py-2 text-xs text-slate-700";
  const tabCls = (k: TabKey) => clsx("px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap", tab === k ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600 hover:bg-slate-50");
  const inputCls = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";


  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Universal Data Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">Admin CRUD for workstreams, milestones, risks, decisions, future modules, regulatory, governance, and validation items</p>
        </div>
        <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Add {currentTab.label.replace(/s$/, "")}</button>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Tab selector */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => <button key={t.key} className={tabCls(t.key)} onClick={() => { setTab(t.key); setSearch(""); }}>{t.label} ({tab === t.key ? filtered.length : ""})</button>)}
      </div>

      <div className="flex items-center gap-3">
        <input className={inputCls + " w-64"} placeholder={`Search ${currentTab.label}...`} value={search} onChange={e => setSearch(e.target.value)} />
        <span className="text-xs text-slate-500">{filtered.length} items</span>
      </div>

      <ComplianceBanner />

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead><tr>
            {currentTab.columns.map(col => <th key={col.key} className={thCls}>{col.label}</th>)}
            <th className={thCls + " text-right"}>Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {currentTab.columns.map(col => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const render = col.render as ((i: any) => React.ReactNode) | undefined;
                  return (
                    <td key={col.key} className={tdCls + " max-w-[200px] truncate"}>
                      {render ? render(item) : String(item[col.key] ?? "--")}
                    </td>
                  );
                })}
                <td className={tdCls + " text-right whitespace-nowrap"}>
                  <button onClick={() => setEditing(item)} className="mr-2 text-xs text-indigo-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(item)} className="text-xs text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={currentTab.columns.length + 1} className="px-4 py-6 text-center text-sm text-slate-500">No items. Click Add to create one.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Edit/Add modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-12">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <form onSubmit={e => { e.preventDefault(); handleSave(formState); }} className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">{editing === "new" ? `Add ${currentTab.label.replace(/s$/, "")}` : "Edit"}</h3>
                <button type="button" onClick={() => setEditing(null)}><X className="h-4 w-4" /></button>
              </div>
              <EntityFormFields
                fields={currentTab.formFields}
                initial={editing === "new" ? (currentTab.blank as () => Record<string, unknown>)() : editing}
                isNew={editing === "new"}
                onChange={setFormState}
              />
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Do not enter PHI or patient identifiers.</div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{editing === "new" ? "Create" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Form state bridge
let formState: Record<string, unknown> = {};
function setFormState(s: Record<string, unknown>) { formState = s; }

function EntityFormFields({ fields, initial, isNew, onChange }: {
  fields: { key: string; label: string; type: string; options?: readonly string[] }[];
  initial: Record<string, unknown>;
  isNew: boolean;
  onChange: (s: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(initial);

  useEffect(() => { onChange(form); }, [form, onChange]);

  function set(key: string, value: unknown) { setForm(prev => ({ ...prev, [key]: value })); }

  const inputCls = "w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none";


  return (
    <>
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
          {f.type === "textarea" ? (
            <textarea className={inputCls + " h-16"} value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value)} />
          ) : f.type === "select" && f.options ? (
            <select className={inputCls} value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value)}>
              <option value="">Select...</option>
              {f.options.map(o => <option key={o}>{o}</option>)}
            </select>
          ) : f.type === "date" ? (
            <input type="date" className={inputCls} value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value || null)} />
          ) : (
            <input className={inputCls} value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value)} disabled={f.key === "id" && !isNew} />
          )}
        </div>
      ))}
    </>
  );
}
