"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AuthGuard from "./AuthGuard";
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
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}

        <div className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="lg:hidden absolute top-3 right-2 z-10">
            <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
          </div>
          <Sidebar />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 hover:bg-slate-100"><Menu className="h-5 w-5 text-slate-600" /></button>
            <span className="text-sm font-bold text-[#1e3a5f]">EndoScribe</span>
            <div className="w-8" />
          </header>
          <div className="hidden lg:block"><TopBar /></div>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
