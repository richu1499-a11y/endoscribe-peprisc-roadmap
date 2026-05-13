"use client";

import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function TopBar() {
  return (
    <header className="flex h-14 items-center justify-end gap-3 border-b border-[var(--border)] bg-[var(--surface)]/82 px-6 backdrop-blur">
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
