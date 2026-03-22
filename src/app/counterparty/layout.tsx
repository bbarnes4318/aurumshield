"use client";

/* ================================================================
   COUNTERPARTY PORTAL LAYOUT — Side-by-Side Unified Architecture
   ================================================================
   Counterparty verification and compliance terminal.
   External entities complete KYC/AML via Idenfy gateway.

   Zero-Scroll architecture — viewport-locked, no global scroll.
   Uses the *shared Topbar* from the main app-shell.

   Structure:
     ┌──────┬─────────────────────────────────────┐
     │ LOGO │  TOPBAR h-16  (shared component)     │
     │ h-16 │                                      │
     ├──────┼─────────────────────────────────────┤
     │ SIDE │  MAIN  (flex-1 min-h-0 scrollable)  │
     │  BAR │                                      │
     │ w-64 │                                      │
     └──────┴─────────────────────────────────────┘
   ================================================================ */

import { type ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { Topbar } from "@/components/layout/topbar";
import { Shield } from "lucide-react";

/* ── Navigation items ── */
const NAV_ITEMS = [
  { href: "/counterparty/compliance", label: "Verification Perimeter", icon: Shield },
] as const;

export default function CounterpartyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-slate-950 text-slate-300">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
        {/* Logo box — h-16 to match Topbar */}
        <div className="h-16 shrink-0 flex items-center justify-center border-b border-slate-800 px-5">
          <AppLogo className="h-8 w-auto" variant="dark" />
        </div>

        {/* Section label */}
        <div className="px-4 pt-4 pb-2">
          <p className="font-mono text-[9px] text-slate-600 uppercase tracking-[0.15em] font-bold">
            Compliance
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            Counterparty Portal v1.0
          </p>
          <p className="text-[9px] font-mono text-slate-700 mt-0.5">
            AurumShield Compliance Network
          </p>
        </div>
      </aside>

      {/* ── RIGHT MAIN CONTENT ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Shared Topbar — identical to main dashboard */}
        <Topbar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />

        {/* Main Scrollable Content */}
        <main className="flex-1 min-h-0 overflow-y-auto relative">
          {children}
        </main>
      </div>

    </div>
  );
}
