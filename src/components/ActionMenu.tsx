"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

export interface ActionItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  adminOnly?: boolean;
  hidden?: boolean;
}

interface Props {
  actions: ActionItem[];
  isAdmin?: boolean;
}

export default function ActionMenu({ actions, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const visible = actions.filter(a => !a.hidden && (!a.adminOnly || isAdmin));
  if (visible.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="rounded-md p-1.5 hover:bg-slate-100 transition-colors" aria-label="Actions">
        <MoreVertical className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {visible.map((a, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); a.onClick(); setOpen(false); }} className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${a.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"}`}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
