"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard, ListChecks, Map, Target, Settings, Wrench, Users,
  GanttChart, Network, Shield, Lock, FlaskConical, LayoutGrid,
  FileText, BarChart, Globe, Layers, Clipboard, type LucideIcon,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { getCurrentRole } from "@/lib/auth";
import { getDashboardRegistry, getVisibleDashboardsForRole } from "@/lib/roadmapStore";
import type { DashboardRegistryItem } from "@/lib/roadmapTypes";

// Icon lookup map
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Target, Map, GanttChart, Network, Shield, Lock,
  FlaskConical, ListChecks, Users, LayoutGrid, Wrench, Settings,
  FileText, BarChart, Globe, Layers, Clipboard,
};

// Hardcoded fallback if registry is unavailable
const FALLBACK_NAV = [
  { route: "/", title: "Overview", icon: "LayoutDashboard", category: "Core" },
  { route: "/gsd", title: "GSD", icon: "Target", category: "Execution" },
  { route: "/roadmap", title: "Roadmap", icon: "Map", category: "Strategy" },
  { route: "/timeline", title: "Timeline", icon: "GanttChart", category: "Execution" },
  { route: "/network", title: "Network", icon: "Network", category: "Strategy" },
  { route: "/regulatory", title: "FDA / Reg", icon: "Shield", category: "Governance" },
  { route: "/governance", title: "IRB/HIPAA", icon: "Lock", category: "Governance" },
  { route: "/validation", title: "Validation", icon: "FlaskConical", category: "Evidence" },
  { route: "/tasks", title: "Tasks", icon: "ListChecks", category: "Execution" },
  { route: "/setup", title: "Setup", icon: "Wrench", category: "System" },
  { route: "/settings", title: "Settings", icon: "Settings", category: "System" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState<{ route: string; title: string; icon: string; category: string }[]>(FALLBACK_NAV);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const registry = await getDashboardRegistry();
        if (registry.length > 0) {
          const role = isSupabaseConfigured ? await getCurrentRole() : "viewer";
          const visible = getVisibleDashboardsForRole(registry, role);
          if (visible.length > 0) {
            setNavItems(visible.map((d: DashboardRegistryItem) => ({
              route: d.route || `/d/${d.slug}`, title: d.title, icon: d.icon ?? "FileText", category: d.category,
            })));
          }
        }
      } catch {
        // Keep fallback
      }
      setLoaded(true);
    })();
  }, []);

  // Split into main nav and system/admin (category System or Admin at bottom)
  const mainItems = navItems.filter(n => n.category !== "System" && n.category !== "Admin");
  const bottomItems = navItems.filter(n => n.category === "System" || n.category === "Admin");

  function renderItem(item: { route: string; title: string; icon: string }) {
    const active = pathname === item.route;
    const Icon = ICON_MAP[item.icon] ?? FileText;
    return (
      <Link key={item.route} href={item.route} className={clsx(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}>
        <Icon className="h-4 w-4" />
        {item.title}
      </Link>
    );
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-5">
        <h1 className="text-sm font-bold text-slate-800">EndoScribe + PEPRisc</h1>
        <p className="text-xs text-slate-500">Roadmap OS</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {mainItems.map(renderItem)}
        {bottomItems.length > 0 && <div className="my-2 border-t border-slate-200" />}
        {bottomItems.map(renderItem)}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-[10px] text-slate-400">{isSupabaseConfigured ? "Supabase connected" : "Local demo mode"}</p>
        <p className="text-[10px] text-slate-400">{loaded ? `${navItems.length} dashboards` : "Loading..."}</p>
      </div>
    </aside>
  );
}
