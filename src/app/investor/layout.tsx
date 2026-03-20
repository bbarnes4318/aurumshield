"use client";

/* ================================================================
   INVESTOR PORTAL LAYOUT — Zero-Scroll Absolute Inset Shell
   ================================================================
   LP Telemetry Terminal for Limited Partners and venture backers.
   Read-only, high-level platform performance data room.

   Zero-Scroll architecture — viewport-locked, no global scroll.

   Structure:
     ┌─────────────────────────────────────────────┐
     │  TELEMETRY STRIP (XAU/USD + network status) │
     │  HEADER  h-14  (logo + role badge)          │
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
import { AppLogo } from "@/components/app-logo";
import { useGoldPrice } from "@/hooks/use-gold-price";
import { Activity, Wifi, Lock, Fingerprint, BarChart3, ShieldCheck, Landmark, PieChart } from "lucide-react";

/* ── Navigation items ── */
const NAV_ITEMS = [
  { href: "/investor",            label: "Platform Overview",  icon: BarChart3   },
  { href: "/investor/yield",      label: "Yield & Revenue",    icon: PieChart    },
  { href: "/investor/risk",       label: "Systemic Risk",      icon: ShieldCheck },
  { href: "/investor/cap-table",  label: "Capital Cap Table",  icon: Landmark    },
] as const;

export default function InvestorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: goldPrice, isLoading: priceLoading } = useGoldPrice();
  const spotPrice = goldPrice?.spotPriceUsd ?? 0;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950 text-slate-300 text-sm">
      {/* ── AMBIENT TELEMETRY STRIP ── */}
      <div className="shrink-0 bg-black/40 border-b border-slate-800/60 px-6 py-2 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-slate-500" />
          <span className="font-mono text-[9px] text-slate-500">XAU/USD:</span>
          {priceLoading ? (
            <span className="font-mono text-[10px] text-slate-600 animate-pulse">SYNCING...</span>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span className="font-mono text-[10px] text-white font-bold tabular-nums">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(spotPrice)}
              </span>
            </>
          )}
          {goldPrice && (
            <span className={`font-mono text-[9px] tabular-nums ${goldPrice.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {goldPrice.change24h >= 0 ? "+" : ""}{goldPrice.change24h.toFixed(2)}
            </span>
          )}
        </div>
        <div className="h-3 w-px bg-slate-800" />
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

      {/* ── HEADER ── */}
      <header className="h-14 shrink-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        {/* Logo + brand */}
        <div className="flex items-center gap-3">
          <AppLogo className="h-8 w-auto" variant="dark" />
        </div>

        {/* Role indicator */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded border border-cyan-500/30 bg-cyan-500/10 text-xs font-mono font-semibold tracking-widest text-cyan-400 uppercase">
            LP Telemetry Terminal
          </span>
        </div>
      </header>

      {/* ── BODY: Sidebar + Main ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── SIDEBAR ── */}
        <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
          {/* Section label */}
          <div className="px-4 pt-4 pb-2">
            <p className="font-mono text-[9px] text-slate-600 uppercase tracking-[0.15em] font-bold">
              Data Room
            </p>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {NAV_ITEMS.map((item, idx) => {
              const isActive =
                item.href === "/investor"
                  ? pathname === "/investor"
                  : pathname.startsWith(item.href);

              const Icon = item.icon;
              const goldwireActive = pathname === "/transactions/new" || pathname.startsWith("/transactions/new/");

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={[
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                  {/* Goldwire logo link — inserted after first nav item */}
                  {idx === 0 && (
                    <Link
                      href="/transactions/new"
                      className={[
                        "flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors mt-1",
                        goldwireActive
                          ? "bg-slate-800"
                          : "hover:bg-slate-800/50",
                      ].join(" ")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/goldwire-icon.svg"
                        alt=""
                        className="h-4 w-auto shrink-0"
                        aria-hidden="true"
                        style={{ filter: goldwireActive ? "brightness(1.3)" : "brightness(0.85)" }}
                      />
                      <span
                        className={[
                          "text-[13px] font-bold tracking-[0.15em] uppercase bg-linear-to-r from-[#F5EACF] via-[#D4AF37] to-[#BFA052] bg-clip-text text-transparent select-none",
                          goldwireActive ? "opacity-100" : "opacity-70",
                        ].join(" ")}
                      >
                        GOLDWIRE
                      </span>
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-slate-800 px-4 py-3">
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              Investor Portal v1.0
            </p>
            <p className="text-[9px] font-mono text-slate-700 mt-0.5">
              Read-Only Access — No Trade Execution
            </p>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 min-h-0 overflow-y-auto relative p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
