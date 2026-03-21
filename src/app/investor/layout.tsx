"use client";

/* ================================================================
   INVESTOR PORTAL LAYOUT — Zero-Scroll Absolute Inset Shell
   ================================================================
   LP Telemetry Terminal for Limited Partners and venture backers.
   Read-only, high-level platform performance data room.

   Zero-Scroll architecture — viewport-locked, no global scroll.

   Structure:
     ┌─────────────────────────────────────────────┐
     │  HEADER  h-12  (logo + role badge)          │
     ├──────┬──────────────────────────────────────┤
     │ SIDE │  MAIN  (flex-1 min-h-0 no scroll)   │
     │  BAR │                                       │
     │ w-56 │                                       │
     │      │                                       │
     └──────┴──────────────────────────────────────┘
   ================================================================ */

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
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

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950 text-slate-300 text-sm">
      {/* ── HEADER ── */}
      <header className="h-12 shrink-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <AppLogo className="h-7 w-auto" variant="dark" />
        </div>

        {/* Role indicator */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded border border-cyan-500/30 bg-cyan-500/10 text-[10px] font-mono font-semibold tracking-widest text-cyan-400 uppercase">
            LP Telemetry Terminal
          </span>
        </div>
      </header>

      {/* ── BODY: Sidebar + Main ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── SIDEBAR ── */}
        <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
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
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                  {/* Goldwire logo link — opens in new tab, user stays in investor portal */}
                  {idx === 0 && (
                    <a
                      href="/transactions/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent mt-0.5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/goldwire-icon.svg"
                        alt=""
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                        style={{ filter: "brightness(0.85)" }}
                      />
                      <span
                        className="text-[13px] font-bold tracking-[0.15em] uppercase bg-linear-to-r from-[#F5EACF] via-[#D4AF37] to-[#BFA052] bg-clip-text text-transparent select-none opacity-70"
                      >
                        GOLDWIRE
                      </span>
                    </a>
                  )}
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

        {/* ── MAIN CONTENT — zero-scroll, fills remaining viewport ── */}
        <main className="flex-1 min-h-0 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}

