"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/ui/command-palette";

/** Routes that render WITHOUT the app shell (sidebar/topbar) */
const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password"];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // Public routes: no sidebar, no topbar — full-bleed layout
  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Skip-to-content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-bg"
      >
        Skip to content
      </a>

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />


      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} />


        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-6 py-5 lg:px-10"
        >
          {children}
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
