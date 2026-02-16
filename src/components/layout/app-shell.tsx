"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/ui/command-palette";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Skip-to-content link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Command Palette (⌘K) */}
      <CommandPalette />

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((prev) => !prev)} />

        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
          <div className="page-container py-6">
            <div className="section-gap">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
