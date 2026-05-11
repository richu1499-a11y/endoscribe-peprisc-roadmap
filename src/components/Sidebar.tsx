"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard, ListChecks, Map, Target, Settings, Wrench, Users, GanttChart, Network,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";

const NAV_MAIN = [
  { href: "/",          label: "Overview",  icon: LayoutDashboard },
  { href: "/gsd",       label: "GSD",       icon: Target },
  { href: "/roadmap",   label: "Roadmap",   icon: Map },
  { href: "/timeline",  label: "Timeline",  icon: GanttChart },
  { href: "/network",   label: "Network",   icon: Network },
  { href: "/tasks",     label: "Tasks",     icon: ListChecks },
];

const NAV_BOTTOM = [
  { href: "/setup",    label: "Setup",     icon: Wrench },
  { href: "/settings", label: "Settings",  icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getCurrentRole().then(role => setShowAdmin(checkIsAdmin(role)));
  }, []);

  function navItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
    const active = pathname === href;
    return (
      <Link key={href} href={href} className={clsx(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}>
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-5">
        <h1 className="text-sm font-bold text-slate-800">EndoScribe + PEPRisc</h1>
        <p className="text-xs text-slate-500">Roadmap OS</p>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {NAV_MAIN.map(n => navItem(n))}
        {showAdmin && navItem({ href: "/admin/users", label: "Users", icon: Users })}
        <div className="my-2 border-t border-slate-200" />
        {NAV_BOTTOM.map(n => navItem(n))}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-[10px] text-slate-400">{isSupabaseConfigured ? "Supabase connected" : "Local demo mode"}</p>
        <p className="text-[10px] text-slate-400">No PHI permitted</p>
      </div>
    </aside>
  );
}
