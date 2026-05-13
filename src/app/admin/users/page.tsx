"use client";

import { useEffect, useState, useCallback } from "react";
import { getProfiles, getTaskAssignments, getTasks, updateProfileRole, createAuditLog } from "@/lib/roadmapStore";
import { getCurrentUser, getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/browser";
import type { Profile, TaskAssignment, RoadmapTask } from "@/lib/roadmapTypes";
import { ROLE_OPTIONS } from "@/lib/roadmapTypes";
import ActionMenu from "@/components/ActionMenu";
import { clsx } from "clsx";
import { ShieldAlert, UserPlus, X, Copy, Check } from "lucide-react";
import Link from "next/link";

interface AllowedUser { id: string; email: string; full_name: string | null; role: string; status: string; accepted_at: string | null; last_seen_at: string | null }

const APP_URL = "https://endoscribe-peprisc-roadmap.vercel.app";

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"active" | "preapproved">("active");

  function showFb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); }

  const refresh = useCallback(async () => {
    const [p, a, t] = await Promise.all([getProfiles(), getTaskAssignments(), getTasks()]);
    setProfiles(p); setAssignments(a); setTasks(t);
    // Load allowed_users
    const sb = getSupabaseBrowser();
    if (sb) {
      const { data } = await sb.from("allowed_users").select("*").order("added_at", { ascending: false });
      if (data) setAllowedUsers(data as AllowedUser[]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!isSupabaseConfigured) { setAuthorized(false); return; }
      const [role, user] = await Promise.all([getCurrentRole(), getCurrentUser()]);
      if (!checkIsAdmin(role)) { setAuthorized(false); return; }
      setAuthorized(true);
      setCurrentUserId(user?.id ?? null);
      await refresh();
    };
    init();
  }, [refresh]);

  if (authorized === null) return <div className="pt-12 text-center text-sm text-slate-500">Loading...</div>;
  if (!authorized) return (
    <div className="mx-auto max-w-md space-y-4 pt-16 text-center">
      <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto" />
      <h1 className="text-lg font-semibold text-slate-800">Access restricted</h1>
      <p className="text-sm text-slate-500">This page requires administrator access.</p>
      <Link href="/" className="text-sm text-teal-600 hover:underline">Go to Home</Link>
    </div>
  );

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const adminCount = profiles.filter(p => p.role === "admin" || p.app_role === "admin").length;

  const stats = profiles.map(p => {
    const userAssigns = assignments.filter(a => a.user_id === p.id);
    const assignedTasks = userAssigns.map(a => taskMap.get(a.task_id)).filter(Boolean) as RoadmapTask[];
    const isActive = (p as unknown as { is_active?: boolean }).is_active !== false;
    return { ...p, assigned: assignedTasks.length, isActive };
  });

  let filtered = stats;
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter(u => u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q)); }
  if (filterRole) filtered = filtered.filter(u => (u.app_role ?? u.role) === filterRole);

  // Pre-approved users who haven't logged in yet
  const preapproved = allowedUsers.filter(au => !au.accepted_at);

  async function handleRoleChange(profileId: string, newRole: string) {
    if (profileId === currentUserId && newRole !== "admin" && adminCount <= 1) {
      setError("Cannot demote the only admin.");
      return;
    }
    setError(null);
    try {
      await updateProfileRole(profileId, newRole);
      showFb("Role updated");
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleToggleActive(profile: Profile & { isActive: boolean }) {
    if (profile.is_protected_admin && !confirm("This user is a protected admin. Are you sure?")) return;
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      if (!sb) return;
      const newActive = !profile.isActive;
      await sb.from("profiles").update({ is_active: newActive, deactivated_at: newActive ? null : new Date().toISOString() }).eq("id", profile.id);
      await createAuditLog({ action: newActive ? "user_reactivated" : "user_deactivated", entity_type: "profile", entity_id: profile.id, entity_label: profile.email });
      showFb(newActive ? "User reactivated" : "User deactivated");
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleToggleProtected(profile: Profile) {
    if (profile.is_protected_admin && profile.id === currentUserId) {
      if (!confirm("Remove your own protected admin status?")) return;
    }
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      if (!sb) return;
      const newVal = !profile.is_protected_admin;
      await sb.from("profiles").update({ is_protected_admin: newVal }).eq("id", profile.id);
      showFb(newVal ? "Marked as protected admin" : "Protection removed");
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleAddUser(email: string, name: string, role: string) {
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      if (!sb) return;
      const { data: { user } } = await sb.auth.getUser();
      const { error: err } = await sb.from("allowed_users").upsert({
        email: email.toLowerCase().trim(),
        full_name: name.trim() || null,
        role,
        status: "active",
        added_by: user?.id ?? null,
      }, { onConflict: "email" });
      if (err) throw new Error(err.message);
      await createAuditLog({ action: "user_preapproved", entity_type: "allowed_users", entity_label: email, new_value: { email, role } });
      setShowAdd(false);
      showFb(`${email} added. Share login instructions with them.`);
      await refresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  const roleBg: Record<string, string> = { admin: "bg-teal-50 text-teal-700 border-teal-200", user: "bg-slate-100 text-slate-600 border-slate-200" };
  const selCls = "rounded-lg border border-slate-300 px-2 py-1.5 text-xs bg-white focus:border-teal-400 focus:outline-none";
  const tabCls = (t: string) => clsx("px-4 py-2 text-sm font-medium rounded-lg transition-colors", tab === t ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users & Access</h1>
          <p className="text-sm text-slate-500">{profiles.length} active members | {preapproved.length} pending login | {adminCount} admin(s)</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          <UserPlus className="h-4 w-4" /> Add User
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      {feedback && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">{feedback}</div>}

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={tabCls("active")} onClick={() => setTab("active")}>Active Users ({profiles.length})</button>
        <button className={tabCls("preapproved")} onClick={() => setTab("preapproved")}>Pre-Approved ({preapproved.length})</button>
      </div>

      {/* Active Users tab */}
      {tab === "active" && (
        <>
          <div className="flex items-center gap-3">
            <input className={selCls + " w-56"} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className={selCls} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="">All roles</option>
              {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Tasks</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(u => {
                  const displayRole = u.app_role ?? (u.role === "admin" ? "admin" : "user");
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{u.full_name || u.email}</p>
                        <p className="text-[10px] text-slate-400">{u.email} {u.id === currentUserId && <span className="text-teal-600">(you)</span>}</p>
                        {u.is_protected_admin && <span className="text-[10px] text-amber-600 font-medium">Protected</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select value={displayRole} onChange={e => handleRoleChange(u.id, e.target.value)} className={clsx("rounded-lg border px-2 py-0.5 text-xs font-medium", roleBg[displayRole] ?? roleBg.user)}>
                          {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-medium", u.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>{u.isActive ? "Active" : "Deactivated"}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-600">{u.assigned}</td>
                      <td className="px-1 py-3">
                        <ActionMenu isAdmin={true} actions={[
                          { label: u.isActive ? "Deactivate" : "Reactivate", onClick: () => handleToggleActive(u), danger: u.isActive },
                          { label: u.is_protected_admin ? "Remove protection" : "Mark protected admin", onClick: () => handleToggleProtected(u) },
                        ]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pre-Approved tab */}
      {tab === "preapproved" && (
        <div className="space-y-3">
          {preapproved.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <p className="text-base text-slate-500">No pre-approved users pending login.</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-teal-600 hover:underline font-medium">Add a user</button>
            </div>
          ) : (
            preapproved.map(au => (
              <div key={au.id} className="rounded-xl border border-slate-200 bg-white p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{au.full_name || au.email}</p>
                  <p className="text-xs text-slate-400">{au.email} &middot; Role: {au.role}</p>
                </div>
                <CopyButton text={`You have been added to EndoScribe. Please go to ${APP_URL} and sign in using this email address: ${au.email}`} />
              </div>
            ))
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 space-y-1">
        <p><strong>Add User</strong> pre-approves an email address. When they sign in at {APP_URL}, their account is created automatically with the assigned role.</p>
        <p><strong>No invite email is required.</strong> Share login instructions manually using the copy button.</p>
        <p><strong>Protected admins</strong> cannot be accidentally demoted or deactivated.</p>
      </div>

      {showAdd && <AddUserModal onSave={handleAddUser} onCancel={() => setShowAdd(false)} />}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
      {copied ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy instructions</>}
    </button>
  );
}

function AddUserModal({ onSave, onCancel }: { onSave: (email: string, name: string, role: string) => void; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const c = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Add User</h3>
          <button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (email.trim()) onSave(email.trim(), name, role); }} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
            <input type="email" className={c} value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@institution.edu" required autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
            <input className={c} value={name} onChange={e => setName(e.target.value)} placeholder="First Last" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
            <select className={c} value={role} onChange={e => setRole(e.target.value)}>
              {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <p className="text-[10px] text-slate-400">No invite email will be sent. Share login instructions manually after adding.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white">Add User</button>
          </div>
        </form>
      </div>
    </div>
  );
}
