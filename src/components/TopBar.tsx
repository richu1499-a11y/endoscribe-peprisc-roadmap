"use client";

import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { Database, HardDrive, Radio } from "lucide-react";
import UserMenu from "./UserMenu";

export default function TopBar() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {isSupabaseConfigured ? (
          <>
            <span className="flex items-center gap-1"><Database className="h-3.5 w-3.5 text-green-600" /> Live</span>
            <span className="flex items-center gap-1 text-green-600"><Radio className="h-3 w-3" /> Realtime</span>
          </>
        ) : (
          <span className="flex items-center gap-1"><HardDrive className="h-3.5 w-3.5 text-amber-500" /> Mock demo</span>
        )}
      </div>
      <UserMenu />
    </header>
  );
}
