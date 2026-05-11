"use client";

import { useEffect, useState, useCallback } from "react";
import { getAuditLogs } from "@/lib/roadmapStore";
import { getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import type { AdminAuditLog } from "@/lib/roadmapTypes";
import ComplianceBanner from "@/components/ComplianceBanner";
import { clsx } from "clsx";
import { ShieldAlert, X } from "lucide-react";
import Link from "next/link";

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-50 text-green-700", updated: "bg-blue-50 text-blue-700",
  deleted: "bg-red-50 text-red-700", archived: "bg-amber-50 text-amber-700",
  unarchived: "bg-teal-50 text-teal-700", role_changed: "bg-purple-50 text-purple-700",
  widget_config_updated: "bg-indigo-50 text-indigo-700",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminAuditLog | null>(null);

  const refresh = useCallback(async () => {
    setLogs(await getAuditLogs(500));
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
      <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert className="mb-1 h-5 w-5" /> Admin access required.</div>
      <Link href="/login" className="text-sm text-indigo-600 hover:underline">Sign in</Link>
    </div>
  );

  const actions = [...new Set(logs.map(l => l.action))].sort();
  const entities = [...new Set(logs.map(l => l.entity_type))].sort();

  let filtered = logs;
  if (filterAction) filtered = filtered.filter(l => l.action === filterAction);
  if (filterEntity) filtered = filtered.filter(l => l.entity_type === filterEntity);
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter(l => (l.entity_label ?? "").toLowerCase().includes(q) || (l.entity_id ?? "").toLowerCase().includes(q) || (l.actor_email ?? "").toLowerCase().includes(q)); }

  const selCls = "rounded border border-slate-300 px-2 py-1 text-xs bg-white focus:border-indigo-400 focus:outline-none";
  const thCls = "px-3 py-2 text-left text-[10px] uppercase text-slate-500 border-b bg-slate-50";
  const tdCls = "px-3 py-2 text-xs text-slate-700";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-xs text-slate-500 mt-0.5">Admin action audit trail. {logs.length} entries loaded.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input className={selCls + " w-48"} placeholder="Search label, ID, or actor..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className={selCls} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="">All Actions</option>
          {actions.map(a => <option key={a}>{a}</option>)}
        </select>
        <select className={selCls} value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
          <option value="">All Entities</option>
          {entities.map(e => <option key={e}>{e}</option>)}
        </select>
        <span className="text-xs text-slate-500">{filtered.length} entries</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead><tr>
            <th className={thCls}>Time</th><th className={thCls}>Actor</th><th className={thCls}>Action</th>
            <th className={thCls}>Entity</th><th className={thCls}>Label</th><th className={thCls}>ID</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(0, 100).map(l => (
              <tr key={l.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(l)}>
                <td className={tdCls + " whitespace-nowrap text-slate-500"}>{new Date(l.created_at).toLocaleString()}</td>
                <td className={tdCls}>{l.actor_email ?? "--"}</td>
                <td className={tdCls}><span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-medium", ACTION_COLORS[l.action] ?? "bg-slate-100 text-slate-600")}>{l.action}</span></td>
                <td className={tdCls + " font-mono text-[10px]"}>{l.entity_type}</td>
                <td className={tdCls + " max-w-[200px] truncate"}>{l.entity_label ?? "--"}</td>
                <td className={tdCls + " font-mono text-[10px] max-w-[100px] truncate"}>{l.entity_id ?? "--"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No audit entries. Admin actions will appear here.</td></tr>}
          </tbody>
        </table>
      </div>

      {filtered.length > 100 && <p className="text-xs text-slate-500">Showing first 100 of {filtered.length} entries.</p>}

      <ComplianceBanner />

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-[420px] flex-col border-l border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <span className="text-xs uppercase text-slate-500">Audit Detail</span>
            <button onClick={() => setSelected(null)} className="rounded p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <Df label="Time">{new Date(selected.created_at).toLocaleString()}</Df>
            <Df label="Actor">{selected.actor_email}</Df>
            <Df label="Action"><span className={clsx("rounded px-1.5 py-0.5 text-xs font-medium", ACTION_COLORS[selected.action] ?? "bg-slate-100")}>{selected.action}</span></Df>
            <Df label="Entity Type">{selected.entity_type}</Df>
            <Df label="Entity ID">{selected.entity_id}</Df>
            <Df label="Entity Label">{selected.entity_label}</Df>
            {selected.previous_value && (
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-1">Previous Value</p>
                <pre className="rounded bg-slate-50 p-2 text-[10px] text-slate-700 overflow-x-auto max-h-32">{JSON.stringify(selected.previous_value, null, 2)}</pre>
              </div>
            )}
            {selected.new_value && (
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-1">New Value</p>
                <pre className="rounded bg-slate-50 p-2 text-[10px] text-slate-700 overflow-x-auto max-h-32">{JSON.stringify(selected.new_value, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Df({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-[10px] font-medium text-slate-500">{label}</dt><dd className="text-sm text-slate-800">{children || <span className="text-slate-400">--</span>}</dd></div>;
}
