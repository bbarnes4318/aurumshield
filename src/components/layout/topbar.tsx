"use client";

import { cn } from "@/lib/utils";
import { Search, Bell, Sun, Moon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

interface TopbarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({ collapsed, onToggleSidebar }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch — only render theme toggle after mount
  useEffect(() => setMounted(true), []);

  return (
    <header
      data-print-hide="true"
      className="flex h-14 shrink-0 items-center border-b border-border bg-surface-1 px-4"
    >
      {/* Left section: sidebar toggle + breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted transition-colors hover:bg-surface-2 hover:text-text md:hidden"
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
        <Breadcrumbs />
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            placeholder="Search…"
            className={cn(
              "h-8 w-56 rounded-[var(--radius-input)] border border-border bg-surface-2 pl-9 pr-3 text-sm text-text placeholder:text-text-faint",
              "focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent",
              "transition-colors"
            )}
          />
        </div>

        {/* Notifications */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Profile avatar */}
        <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          AR
        </div>
      </div>
    </header>
  );
}
