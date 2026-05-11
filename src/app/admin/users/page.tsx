"use client";

import { ShieldAlert } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";

export default function AdminUsersPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-8">
      <h1 className="text-xl font-bold text-slate-900">User Management</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-700">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="text-base font-semibold">Coming Soon</h2>
        </div>
        <p className="text-sm text-slate-600">
          User management UI will be implemented in a later prompt. For now, manage roles directly in the Supabase dashboard.
        </p>
        <div className="rounded bg-slate-50 p-3 text-xs font-mono text-slate-700">
          -- Promote a user to admin:<br />
          update profiles set role = &apos;admin&apos; where email = &apos;user@example.com&apos;;<br /><br />
          -- Promote a user to editor:<br />
          update profiles set role = &apos;editor&apos; where email = &apos;user@example.com&apos;;
        </div>
      </div>

      <ComplianceBanner />
    </div>
  );
}
