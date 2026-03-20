"use client";

/* ================================================================
   INSTITUTIONAL COMMAND CENTER LAYOUT — Zero-Scroll Inset Shell
   ================================================================
   Prime Brokerage terminal for Sovereign Wealth Funds and Family
   Offices executing $50M+ gold allocations.

   SECURITY: StrictComplianceGate wraps ALL children. No
   institutional buyer sees this terminal without a COMPLETED
   iDenfy/Veriff KYC/AML/KYB status.

   Structure:
     ┌─────────────────────────────────────────────┐
     │  HEADER  h-14  (org name + live spot ticker) │
     ├──────┬──────────────────────────────────────┤
     │ SIDE │  MAIN  (flex-1 min-h-0, child scroll) │
     │  BAR │                                       │
     │ w-64 │                                       │
     │      │                                       │
     └──────┴──────────────────────────────────────┘
   ================================================================ */

import { type ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { useGoldPrice } from "@/hooks/use-gold-price";
import { useAuth } from "@/providers/auth-provider";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import {
  Activity,
  Loader2,
  ShieldAlert,
  Briefcase,
  ArrowLeftRight,
  ScanSearch,
  Store,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   STRICT COMPLIANCE GATE
   ══════════════════════════════════════════════════════════════════
   Institutional buyers CANNOT view ANY terminal content until their
   iDenfy/Veriff verification status is COMPLETED. This is a hard
   gate — no exceptions, no bypasses.

   States:
     - Loading  → secure terminal spinner
     - Error    → retry state (no false redirects)
     - !COMPLETED → forced redirect to KYB onboarding
     - COMPLETED  → render children
   ══════════════════════════════════════════════════════════════════ */

function StrictComplianceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    data: onboardingState,
    isLoading,
    isError,
  } = useOnboardingState();

  const isCleared = onboardingState?.status === "COMPLETED";

  useEffect(() => {
    if (isLoading || isError) return;

    if (!isCleared) {
      router.replace("/offtaker/onboarding/kyb");
    }
  }, [isLoading, isError, isCleared, router]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 text-amber-400 animate-spin mb-4" />
        <span className="font-mono text-[11px] text-slate-500 tracking-[0.2em] uppercase">
          Verifying Institutional Compliance Perimeter
        </span>
        <span className="font-mono text-[9px] text-slate-700 tracking-wider mt-1">
          AML / KYB / IDENTITY — DO NOT CLOSE THIS WINDOW
        </span>
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <ShieldAlert className="h-8 w-8 text-red-400 mb-4" />
        <span className="font-mono text-[11px] text-slate-400 tracking-wider uppercase">
          Compliance Verification Failed
        </span>
        <span className="font-mono text-[9px] text-slate-600 mt-1">
          Unable to verify institutional credentials. Retrying automatically...
        </span>
      </div>
    );
  }

  // ── Not cleared → redirect in progress ──
  if (!isCleared) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <ShieldAlert className="h-8 w-8 text-amber-400 mb-4" />
        <span className="font-mono text-[11px] text-amber-400 tracking-wider uppercase">
          Institutional Compliance Clearance Required
        </span>
        <span className="font-mono text-[9px] text-slate-600 mt-1">
          Redirecting to AML/KYB verification...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}

/* ── Navigation items ── */
const NAV_ITEMS = [
  { href: "/institutional",              label: "Portfolio Overview",       icon: Briefcase      },
  { href: "/institutional/settlements",  label: "Active Settlements (DvP)", icon: ArrowLeftRight },
  { href: "/institutional/provenance",   label: "Asset Provenance",        icon: ScanSearch      },
  { href: "/institutional/marketplace",  label: "Marketplace",             icon: Store           },
] as const;

export default function InstitutionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: goldPrice, isLoading: priceLoading } = useGoldPrice();
  const { org } = useAuth();
  const spotPrice = goldPrice?.spotPriceUsd ?? 0;

  return (
    <StrictComplianceGate>
      <div className="absolute inset-0 flex overflow-hidden bg-slate-950 text-slate-300">
        {/* ── SIDEBAR ── */}
        <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
          {/* Logo */}
          <div className="h-14 shrink-0 flex items-center px-5 border-b border-slate-800">
            <AppLogo className="h-8 w-auto" variant="dark" />
          </div>

          {/* Section label */}
          <div className="px-4 pt-4 pb-2">
            <p className="font-mono text-[9px] text-slate-600 uppercase tracking-[0.15em] font-bold">
              Command Center
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 space-y-1">
            {NAV_ITEMS.map((item, idx) => {
              const isActive =
                item.href === "/institutional"
                  ? pathname === "/institutional"
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
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
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
              Institutional Terminal v1.0
            </p>
            <p className="text-[9px] font-mono text-slate-700 mt-0.5">
              AurumShield Goldwire Network
            </p>
          </div>
        </aside>

        {/* ── RIGHT SIDE: Header + Main ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* ── HEADER (h-14) ── */}
          <header className="h-14 shrink-0 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6">
            {/* Org name + role badge */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-white truncate max-w-[280px]">
                {org?.legalName ?? "Institutional Account"}
              </span>
              <span className="px-2.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-[10px] font-mono font-semibold tracking-widest text-amber-400 uppercase">
                Prime Brokerage
              </span>
            </div>

            {/* Live Spot Price Ticker */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-mono text-[10px] text-slate-500 uppercase">XAU/USD</span>
              </div>
              {priceLoading ? (
                <span className="font-mono text-[11px] text-slate-600 animate-pulse">SYNCING...</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                  <span className="font-mono text-sm text-white font-bold tabular-nums">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(spotPrice)}
                  </span>
                  {goldPrice && (
                    <span className={`font-mono text-[10px] tabular-nums ${goldPrice.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {goldPrice.change24h >= 0 ? "▲" : "▼"} {Math.abs(goldPrice.change24h).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 min-h-0 flex flex-col relative">
            {children}
          </main>
        </div>
      </div>
    </StrictComplianceGate>
  );
}
