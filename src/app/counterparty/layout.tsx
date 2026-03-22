"use client";

/* ================================================================
   COUNTERPARTY PORTAL LAYOUT — Side-by-Side Unified Architecture
   ================================================================
   Counterparty verification and compliance terminal.
   External entities complete KYC/AML via Idenfy gateway.

   Zero-Scroll architecture — viewport-locked, no global scroll.

   MATHEMATICAL ALIGNMENT STANDARD:
     Left Logo Box:     h-[88px]  (32px + 56px = 88px)
     Right Telemetry:   h-8       (32px)
     Right Header:      h-14      (56px)
     ───────────────────────────────────────────
     TOTAL:             88px = 88px  ✓ CONTINUOUS LINE

   Structure:
     ┌──────┬─────────────────────────────────────┐
     │ LOGO │  TELEMETRY STRIP  h-8               │
     │ BOX  ├─────────────────────────────────────┤
     │ 88px │  HEADER  h-14  (role badge)          │
     ├──────┼─────────────────────────────────────┤
     │ SIDE │  MAIN  (flex-1 min-h-0 scrollable)  │
     │  BAR │                                      │
     │ w-64 │                                      │
     └──────┴─────────────────────────────────────┘
   ================================================================ */

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { Shield, Wifi, Lock, Fingerprint } from "lucide-react";

/* ── Navigation items ── */
const NAV_ITEMS = [
  { href: "/counterparty/compliance", label: "Verification Perimeter", icon: Shield },
] as const;

export default function CounterpartyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-slate-950 text-slate-300">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        {/* MATHEMATICALLY LOCKED LOGO BOX (32px + 56px = 88px) */}
        <div className="h-[88px] shrink-0 flex items-center justify-center border-b border-slate-800 px-5">
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
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
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
        {/* 1. Telemetry Strip (h-8) */}
        <div className="h-8 shrink-0 bg-black/40 border-b border-slate-800/60 px-6 flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
            <Wifi className="h-3 w-3 text-emerald-400" />
            <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase">
              Network: Secure
            </span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-slate-500" />
            <span className="font-mono text-[9px] text-slate-500 tracking-wider uppercase">
              End-to-End Encryption: Active
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Fingerprint className="h-3 w-3 text-slate-600" />
            <span className="font-mono text-[9px] text-slate-600 tracking-wider">
              SESSION AUTHENTICATED
            </span>
          </div>
        </div>

        {/* 2. Main Header (h-14) */}
        <header className="h-14 shrink-0 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6">
          {/* Role indicator */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded border border-amber-500/30 bg-amber-500/10 text-xs font-mono font-semibold tracking-widest text-amber-400 uppercase">
              Counterparty Portal
            </span>
          </div>
        </header>

        {/* 3. Main Scrollable Content */}
        <main className="flex-1 min-h-0 overflow-y-auto relative">
          {children}
        </main>
      </div>

    </div>
  );
}
