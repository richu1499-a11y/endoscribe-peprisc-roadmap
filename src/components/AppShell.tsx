"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AuthGuard from "./AuthGuard";
import ThemeToggle from "./ThemeToggle";
import { Menu, X } from "lucide-react";

const SHELL_EXCLUDED = ["/login", "/signup", "/access-restricted", "/access-deactivated", "/pending-approval"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Public/access pages render without app shell chrome
  if (SHELL_EXCLUDED.some(p => pathname.startsWith(p))) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--text)]">
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}

        <div className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="lg:hidden absolute top-3 right-2 z-10">
            <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-strong)]"><X className="h-5 w-5" /></button>
          </div>
          <Sidebar />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-strong)]"><Menu className="h-5 w-5" /></button>
            <span className="text-sm font-bold text-[var(--text)]">EndoScribe</span>
            <ThemeToggle />
          </header>
          <div className="hidden lg:block"><TopBar /></div>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
