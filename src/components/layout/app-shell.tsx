"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/ui/command-palette";
import { DemoScriptOverlay } from "@/components/demo/demo-script-overlay";
import { useDemo } from "@/providers/demo-provider";

/** Routes that render WITHOUT the app shell (sidebar/topbar) */
const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/demo/login", "/platform", "/demo/walkthrough"];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const { isDemo, presentationMode, scenarioName } = useDemo();

  // Public routes: no sidebar, no topbar — full-bleed layout
  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Skip-to-content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:bg-gold focus:px-4 focus:py-2 focus:text-bg"
      >
        Skip to content
      </a>

      {/* Sidebar hidden in presentation mode via CSS */}
      {!presentationMode && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Demo Environment Banner */}
        {isDemo && (
          <div className="flex h-8 shrink-0 items-center justify-between border-b border-amber-800/30 bg-amber-950/40 px-4 text-xs font-medium tracking-wider text-amber-300/80">
            <span className="font-mono uppercase">
              AurumShield — Institutional Demonstration Environment
            </span>
            <span className="font-mono text-amber-500/60">
              {scenarioName}
            </span>
          </div>
        )}

        <Topbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-6 py-5 lg:px-10"
        >
          {children}
        </main>
      </div>

      <CommandPalette />
      <DemoScriptOverlay />
    </div>
  );
}

