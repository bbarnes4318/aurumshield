"use client";

/* ================================================================
   BROKER PORTAL LAYOUT — Zero-Scroll Absolute Inset Shell
   ================================================================
   Prime Brokerage terminal layout. Viewport-locked, no global scroll.

   Structure:
     ┌─────────────────────────────────────────────┐
     │  HEADER  h-14  (logo + role indicator)       │
     ├──────┬──────────────────────────────────────┤
     │ SIDE │  MAIN  (flex-1 min-h-0 scrollable)   │
     │  BAR │                                       │
     │ w-64 │                                       │
     │      │                                       │
     └──────┴──────────────────────────────────────┘
   ================================================================ */

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

/* ── Navigation items ── */
const NAV_ITEMS = [
  { href: "/broker",          label: "Command Center",  icon: "◆" },
  { href: "/broker/pipeline", label: "Deal Pipeline",   icon: "◈" },
  { href: "/broker/assets",   label: "LBMA Assets",     icon: "◇" },
  { href: "/broker/clients",  label: "Client Roster",   icon: "◻" },
] as const;

export default function BrokerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950 text-slate-300">
      {/* ── HEADER ── */}
      <header className="h-14 shrink-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        {/* Logo + brand */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <span className="text-amber-400 font-bold text-sm">Au</span>
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-200">
            AurumShield
          </span>
        </div>

        {/* Role indicator */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded border border-amber-500/30 bg-amber-500/10 text-xs font-mono font-semibold tracking-widest text-amber-400 uppercase">
            Broker Terminal
          </span>
        </div>
      </header>

      {/* ── BODY: Sidebar + Main ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── SIDEBAR ── */}
        <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
          <nav className="flex-1 py-4 px-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/broker"
                  ? pathname === "/broker"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
                  ].join(" ")}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-slate-800 px-4 py-3">
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              Broker Portal v1.0
            </p>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 min-h-0 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
