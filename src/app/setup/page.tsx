"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/browser";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import ComplianceBanner from "@/components/ComplianceBanner";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

const isDev = process.env.NODE_ENV === "development";

interface Check {
  label: string;
  status: "pass" | "fail" | "warn" | "loading";
  detail: string;
}

export default function SetupPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => { runChecks(); }, []);

  async function runChecks() {
    setRunning(true);
    const results: Check[] = [];

    // Environment
    results.push({
      label: "Environment",
      status: "pass",
      detail: isDev ? "Development (localhost)" : `Production (${window.location.origin})`,
    });

    // Env vars
    results.push({
      label: "NEXT_PUBLIC_SUPABASE_URL",
      status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "pass" : "fail",
      detail: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing -- add to .env.local or Vercel dashboard",
    });
    results.push({
      label: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      status: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "pass" : "fail",
      detail: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing -- add to .env.local or Vercel dashboard",
    });
    results.push({
      label: "Supabase client",
      status: isSupabaseConfigured ? "pass" : "fail",
      detail: isSupabaseConfigured ? "Configured" : isDev ? "Not configured -- demo mode active" : "Not configured -- app cannot load data",
    });

    if (!isSupabaseConfigured) {
      results.push({
        label: "Mode",
        status: isDev ? "warn" : "fail",
        detail: isDev
          ? "Running in mock demo mode. All checks below require Supabase."
          : "Production deployment without Supabase. Add environment variables in Vercel and redeploy.",
      });
      setChecks(results);
      setRunning(false);
      return;
    }

    const sb = getSupabaseBrowser()!;

    // App URL
    results.push({
      label: "App URL",
      status: "pass",
      detail: window.location.origin,
    });

    // Redirect URL hint
    results.push({
      label: "Required Supabase Redirect URL",
      status: "warn",
      detail: `${window.location.origin}/** -- add this to Supabase Auth > URL Configuration > Redirect URLs`,
    });

    // Schema: workstreams
    let wsCount = 0;
    try {
      const { count, error } = await sb.from("workstreams").select("id", { count: "exact", head: true });
      if (error) throw error;
      wsCount = count ?? 0;
      results.push({ label: "Workstreams table", status: wsCount > 0 ? "pass" : "warn", detail: wsCount > 0 ? `${wsCount} workstreams` : "Table exists but empty -- run seed.sql" });
    } catch (e: unknown) {
      results.push({ label: "Workstreams table", status: "fail", detail: `Error: ${e instanceof Error ? e.message : String(e)}. Run schema.sql first.` });
    }

    // Schema: tasks
    let taskCount = 0;
    try {
      const { count, error } = await sb.from("tasks").select("id", { count: "exact", head: true });
      if (error) throw error;
      taskCount = count ?? 0;
      results.push({
        label: "Tasks table",
        status: taskCount > 0 ? "pass" : "warn",
        detail: taskCount > 0 ? `${taskCount} tasks` : "Table exists but empty -- run seed.sql",
      });
    } catch (e: unknown) {
      results.push({ label: "Tasks table", status: "fail", detail: `Error: ${e instanceof Error ? e.message : String(e)}` });
    }

    // Auth
    try {
      const user = await getCurrentUser();
      if (user) {
        results.push({ label: "Auth session", status: "pass", detail: `Signed in as ${user.email}` });
        const profile = await getCurrentProfile();
        if (profile) {
          results.push({ label: "Profile", status: "pass", detail: `Role: ${profile.role}` });
        } else {
          results.push({ label: "Profile", status: "warn", detail: "No profile row found. Check that the on-signup trigger is working." });
        }
      } else {
        results.push({ label: "Auth session", status: "warn", detail: "Not signed in. Sign in to test role-based access." });
      }
    } catch {
      results.push({ label: "Auth session", status: "fail", detail: "Could not check auth status" });
    }

    // Realtime
    try {
      const channel = sb.channel("setup-test");
      results.push({ label: "Realtime", status: "pass", detail: "Channel created. Ensure Realtime is enabled for tasks table." });
      sb.removeChannel(channel);
    } catch {
      results.push({ label: "Realtime", status: "warn", detail: "Could not create realtime channel" });
    }

    // Task assignments
    try {
      const { count, error } = await sb.from("task_assignments").select("id", { count: "exact", head: true });
      if (error) throw error;
      const n = count ?? 0;
      results.push({ label: "task_assignments table", status: "pass", detail: `${n} assignment(s)` });

      // Count tasks with at least one assignee
      if (n > 0 && taskCount > 0) {
        const { data: assignData } = await sb.from("task_assignments").select("task_id");
        const uniqueTasks = new Set((assignData ?? []).map((a: { task_id: string }) => a.task_id));
        const unassigned = taskCount - uniqueTasks.size;
        results.push({ label: "Assignment coverage", status: unassigned > 0 ? "warn" : "pass", detail: `${uniqueTasks.size} assigned, ${unassigned} unassigned` });
      }
    } catch {
      results.push({ label: "task_assignments table", status: "warn", detail: "Table not found. Run supabase/migrations/001_task_assignments.sql" });
    }

    // Profiles count
    try {
      const { count: pCount } = await sb.from("profiles").select("id", { count: "exact", head: true });
      results.push({ label: "Profiles", status: "pass", detail: `${pCount ?? 0} user(s)` });
    } catch {
      results.push({ label: "Profiles", status: "warn", detail: "Could not count profiles" });
    }

    // Regulatory items
    try {
      const { count: regCount, error: regError } = await sb.from("regulatory_items").select("id", { count: "exact", head: true });
      if (regError) throw regError;
      const rc = regCount ?? 0;
      results.push({ label: "regulatory_items table", status: rc > 0 ? "pass" : "warn", detail: rc > 0 ? `${rc} item(s)` : "Table exists but empty" });
      if (rc > 0) {
        const { data: highRiskData } = await sb.from("regulatory_items").select("id").eq("regulatory_risk", "High");
        const { data: noOwnerData } = await sb.from("regulatory_items").select("id").is("owner", null);
        const highCount = highRiskData?.length ?? 0;
        const noOwnerCount = noOwnerData?.length ?? 0;
        if (highCount > 0) results.push({ label: "High-risk regulatory items", status: "warn", detail: `${highCount} item(s) at high regulatory risk` });
        if (noOwnerCount > 0) results.push({ label: "Regulatory items without owner", status: "warn", detail: `${noOwnerCount} item(s) need an owner` });
      }
    } catch {
      results.push({ label: "regulatory_items table", status: "warn", detail: "Table not found. Run supabase/migrations/002_regulatory_dashboard.sql" });
    }

    // Governance items
    try {
      const { count: govCount, error: govError } = await sb.from("governance_items").select("id", { count: "exact", head: true });
      if (govError) throw govError;
      const gc = govCount ?? 0;
      results.push({ label: "governance_items table", status: gc > 0 ? "pass" : "warn", detail: gc > 0 ? `${gc} item(s)` : "Table exists but empty" });
      if (gc > 0) {
        const { data: phiData } = await sb.from("governance_items").select("id").eq("phi_involved", true);
        const { data: highHipaaData } = await sb.from("governance_items").select("id").eq("hipaa_risk", "High");
        results.push({ label: "PHI-involved governance items", status: "warn", detail: `${phiData?.length ?? 0} item(s) involve PHI` });
        if ((highHipaaData?.length ?? 0) > 0) results.push({ label: "High HIPAA risk governance items", status: "warn", detail: `${highHipaaData?.length ?? 0} item(s)` });
      }
    } catch {
      results.push({ label: "governance_items table", status: "warn", detail: "Table not found. Run supabase/migrations/003_irb_hipaa_dashboard.sql" });
    }

    setChecks(results);
    setRunning(false);
  }

  const icon = (s: Check["status"]) => {
    switch (s) {
      case "pass": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "fail": return <XCircle className="h-4 w-4 text-red-600" />;
      case "warn": return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "loading": return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Setup Diagnostics</h1>
        <button onClick={runChecks} disabled={running} className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {running ? "Checking..." : "Re-run checks"}
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            {icon(c.status)}
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-800">{c.label}</span>
              <p className="text-xs text-slate-500">{c.detail}</p>
            </div>
          </div>
        ))}
        {checks.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">Running checks...</div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Quick Start Steps</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700">
          <li>Create Supabase project at supabase.com</li>
          <li>Run <code className="text-xs bg-slate-100 px-1 rounded">supabase/schema.sql</code> in SQL Editor</li>
          <li>Run <code className="text-xs bg-slate-100 px-1 rounded">supabase/seed.sql</code> in SQL Editor</li>
          <li>Copy URL and anon key to <code className="text-xs bg-slate-100 px-1 rounded">.env.local</code> (local) or Vercel environment variables (production)</li>
          <li>Enable Realtime for <code className="text-xs bg-slate-100 px-1 rounded">tasks</code> table</li>
          <li>Restart dev server or redeploy</li>
          <li>Sign up as first user</li>
          <li>Set yourself as admin: <code className="text-xs bg-slate-100 px-1 rounded">update profiles set role = &apos;admin&apos; where email = &apos;you@example.com&apos;;</code></li>
          <li>Add your app URL to Supabase Auth &gt; URL Configuration &gt; Redirect URLs</li>
        </ol>
      </div>

      <ComplianceBanner />
    </div>
  );
}
