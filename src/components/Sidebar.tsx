"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  Home, ListChecks, Briefcase, CalendarDays, BarChart3, Settings,
  Users, Database, LayoutGrid, FileSearch, Wrench, ChevronDown, ChevronRight,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { getCurrentAppRole } from "@/lib/auth";

interface NavItem { href: string; label: string; icon: React.ComponentType<{ className?: string }> }

const NAV_MAIN: NavItem[] = [
  { href: "/",            label: "Home",        icon: Home },
  { href: "/tasks",       label: "Tasks",       icon: ListChecks },
  { href: "/workspaces",  label: "Workspaces",  icon: Briefcase },
  { href: "/calendar",    label: "Calendar",    icon: CalendarDays },
  { href: "/reports",     label: "Reports",     icon: BarChart3 },
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
    getCurrentAppRole().then(role => {
      const admin = role === "admin";
      setUserIsAdmin(admin);
      if (pathname.startsWith("/admin") || pathname === "/setup" || pathname === "/settings") setAdminOpen(admin);
    });
  }, [pathname]);

  function renderItem(item: NavItem) {
    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    return (
      <Link key={item.href} href={item.href} className={clsx(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--text)]"
      )}>
        <item.icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]/92 backdrop-blur">
      {/* Logo */}
      <div className="border-b border-[var(--border)] px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/endoscribe-mark.svg" alt="EndoScribe" width={28} height={28} />
          <div>
            <p className="text-sm font-bold text-[var(--text)]">EndoScribe</p>
            <p className="text-[10px] text-[var(--subtle)] -mt-0.5">Workspace OS</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_MAIN.map(renderItem)}

        {/* Admin section */}
        {userIsAdmin && (
          <>
            <div className="my-2 border-t border-[var(--border)]" />
            <button onClick={() => setAdminOpen(!adminOpen)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase text-[var(--subtle)] hover:text-[var(--muted)]">
              {adminOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Admin
            </button>
            {adminOpen && NAV_ADMIN.map(renderItem)}
          </>
        )}
      </nav>

      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="text-[10px] text-[var(--subtle)]">{isSupabaseConfigured ? "Connected" : "Demo mode"}</p>
      </div>
    </aside>
  );
}
