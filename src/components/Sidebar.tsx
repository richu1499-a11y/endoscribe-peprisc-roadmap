"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  Home, Briefcase, CalendarDays, Settings,
  Users, Database, LayoutGrid, FileSearch, Wrench, ChevronDown, ChevronRight,
  Network,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { getCurrentRole, isAdmin as checkIsAdmin } from "@/lib/auth";

interface NavItem { href: string; label: string; icon: React.ComponentType<{ className?: string }> }

const NAV_MAIN: NavItem[] = [
  { href: "/",            label: "Home",        icon: Home },
  { href: "/workspaces",  label: "Workspaces",  icon: Briefcase },
  { href: "/roadmap",     label: "Roadmap",     icon: Network },
  { href: "/calendar",    label: "Calendar",    icon: CalendarDays },
];

const NAV_ADMIN: NavItem[] = [
  { href: "/admin/users",      label: "Users",              icon: Users },
  { href: "/admin/data",       label: "Data Manager",       icon: Database },
  { href: "/admin/dashboards", label: "Workspace Manager",  icon: LayoutGrid },
  { href: "/admin/audit",      label: "Audit Log",          icon: FileSearch },
  { href: "/settings",         label: "Settings",           icon: Settings },
  { href: "/setup",            label: "Setup",              icon: Wrench },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getCurrentRole().then(role => {
      const admin = checkIsAdmin(role);
      setUserIsAdmin(admin);
      if (pathname.startsWith("/admin") || pathname === "/setup" || pathname === "/settings") setAdminOpen(admin);
    });
  }, [pathname]);

  function renderItem(item: NavItem) {
    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    return (
      <Link key={item.href} href={item.href} className={clsx(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}>
        <item.icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="border-b border-slate-100 px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/endoscribe-mark.svg" alt="EndoScribe" width={28} height={28} />
          <div>
            <p className="text-sm font-bold text-[#1e3a5f]">EndoScribe</p>
            <p className="text-[10px] text-slate-400 -mt-0.5">Workspace OS</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_MAIN.map(renderItem)}

        {/* Admin section */}
        {userIsAdmin && (
          <>
            <div className="my-2 border-t border-slate-100" />
            <button onClick={() => setAdminOpen(!adminOpen)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600">
              {adminOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Admin
            </button>
            {adminOpen && NAV_ADMIN.map(renderItem)}
          </>
        )}
      </nav>

      <div className="border-t border-slate-100 px-4 py-2.5">
        <p className="text-[10px] text-slate-400">{isSupabaseConfigured ? "Connected" : "Demo mode"}</p>
      </div>
    </aside>
  );
}
