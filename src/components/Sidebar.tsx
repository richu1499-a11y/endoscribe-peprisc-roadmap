"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard, ListChecks, Map, Target, Settings, Wrench,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/browser";

const NAV = [
  { href: "/",         label: "Overview",  icon: LayoutDashboard },
  { href: "/gsd",      label: "GSD",       icon: Target },
  { href: "/roadmap",  label: "Roadmap",   icon: Map },
  { href: "/tasks",    label: "Tasks",     icon: ListChecks },
  { href: "/setup",    label: "Setup",     icon: Wrench },
  { href: "/settings", label: "Settings",  icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-5">
        <h1 className="text-sm font-bold text-slate-800">EndoScribe + PEPRisc</h1>
        <p className="text-xs text-slate-500">Roadmap OS</p>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-[10px] text-slate-400">
          {isSupabaseConfigured ? "Supabase connected" : "Local demo mode"}
        </p>
        <p className="text-[10px] text-slate-400">No PHI permitted</p>
      </div>
    </aside>
  );
}
