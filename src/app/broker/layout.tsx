"use client";

/* ================================================================
   BROKER PORTAL LAYOUT — Zero-Scroll Absolute Inset Shell
   ================================================================
   Prime Brokerage terminal layout. Viewport-locked, no global scroll.

   Structure:
     ┌─────────────────────────────────────────────┐
     │  TELEMETRY STRIP (XAU/USD + network status) │
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
import { AppLogo } from "@/components/app-logo";
import { useGoldPrice } from "@/hooks/use-gold-price";
import { Activity, Wifi, Lock, Fingerprint } from "lucide-react";

/* ── Navigation items ── */
const NAV_ITEMS = [
  { href: "/broker",          label: "Command Center",  icon: "◆" },
  { href: "/broker/pipeline", label: "Deal Pipeline",   icon: "◈" },
  { href: "/broker/assets",   label: "LBMA Assets",     icon: "◇" },
  { href: "/broker/clients",  label: "Client Roster",   icon: "◻" },
] as const;

export default function BrokerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: goldPrice, isLoading: priceLoading } = useGoldPrice();
  const spotPrice = goldPrice?.spotPriceUsd ?? 0;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950 text-slate-300">
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
