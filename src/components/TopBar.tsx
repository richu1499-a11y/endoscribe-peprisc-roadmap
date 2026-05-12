"use client";

import UserMenu from "./UserMenu";

export default function TopBar() {
  return (
    <header className="flex h-12 items-center justify-end border-b border-slate-100 bg-white px-6">
      <UserMenu />
    </header>
  );
}
