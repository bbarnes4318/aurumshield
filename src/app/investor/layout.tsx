"use client";

/* ================================================================
   INVESTOR PORTAL LAYOUT — Side-by-Side Unified Architecture
   ================================================================
   LP Telemetry Terminal for Limited Partners and venture backers.
   Read-only, high-level platform performance data room.

   Zero-Scroll architecture — viewport-locked, no global scroll.
   Uses the *shared Topbar* from the main app-shell.

   Structure:
     ┌──────┬─────────────────────────────────────┐
     │ LOGO │  TOPBAR h-16  (shared component)     │
     │ h-16 │                                      │
     ├──────┼─────────────────────────────────────┤
     │ SIDE │  MAIN  (flex-1 min-h-0 no scroll)   │
     │  BAR │                                      │
     │ w-64 │                                      │
     └──────┴─────────────────────────────────────┘
   ================================================================ */

import { type ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { Topbar } from "@/components/layout/topbar";
import { BarChart3, ShieldCheck, Landmark, PieChart } from "lucide-react";

/* ── Navigation items ── */
const NAV_ITEMS = [
  { href: "/investor",            label: "Platform Overview",  icon: BarChart3   },
  { href: "/investor/yield",      label: "Yield & Revenue",    icon: PieChart    },
  { href: "/investor/risk",       label: "Systemic Risk",      icon: ShieldCheck },
  { href: "/investor/cap-table",  label: "Capital Cap Table",  icon: Landmark    },
] as const;

export default function InvestorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-slate-950 text-slate-300 text-sm">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
        {/* Logo box — h-16 to match Topbar */}
        <div className="h-16 shrink-0 flex items-center justify-center border-b border-slate-800 px-5">
          <AppLogo className="h-8 w-auto" variant="dark" />
        </div>

        {/* Section label */}
        <div className="px-4 pt-3 pb-1">
          <p className="font-mono text-[9px] text-slate-600 uppercase tracking-[0.15em] font-bold">
            Data Room
          </p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map((item, idx) => {
            const isActive =
              item.href === "/investor"
                ? pathname === "/investor"
                : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
                {/* Goldwire — stays within investor portal */}
                {idx === 0 && (() => {
                  const gwActive = pathname === "/investor/goldwire" || pathname.startsWith("/investor/goldwire/");
                  return (
                    <Link
                      href="/investor/goldwire"
                      className={[
                        "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors mt-0.5",
                        gwActive
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
                      ].join(" ")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/goldwire-icon.svg"
                        alt=""
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                        style={{ filter: gwActive ? "brightness(1.3)" : "brightness(0.85)" }}
                      />
                      <span
                        className={[
                          "text-[13px] font-bold tracking-[0.15em] uppercase bg-linear-to-r from-[#F5EACF] via-[#D4AF37] to-[#BFA052] bg-clip-text text-transparent select-none",
                          gwActive ? "opacity-100" : "opacity-70",
                        ].join(" ")}
                      >
                        GOLDWIRE
                      </span>
                    </Link>
                  );
                })()}
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-slate-800 px-4 py-2">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            Investor Portal v1.0
          </p>
          <p className="text-[9px] font-mono text-slate-700 mt-0.5">
            Read-Only Access — No Trade Execution
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

        {/* Main Content — zero-scroll, fills remaining viewport */}
        <main className="flex-1 min-h-0 overflow-hidden relative">
          {children}
        </main>
      </div>

    </div>
  );
}
