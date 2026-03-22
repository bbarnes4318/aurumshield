"use client";

/* ================================================================
   BROKER PORTAL LAYOUT — Side-by-Side Unified Architecture
   ================================================================
   Prime Brokerage terminal layout. Viewport-locked, no global scroll.

   SECURITY: Strict compliance trapdoor via BrokerComplianceGate.
   Unverified brokers are violently ejected to the iDenfy AML
   gauntlet (/offtaker/onboarding/kyb) before seeing ANY broker UI.

   MATHEMATICAL ALIGNMENT STANDARD:
     Left Logo Box:     h-[88px]  (32px + 56px = 88px)
     Right Telemetry:   h-8       (32px)
     Right Header:      h-14      (56px)
     ───────────────────────────────────────────
     TOTAL:             88px = 88px  ✓ CONTINUOUS LINE

   Structure:
     ┌──────┬─────────────────────────────────────┐
     │ LOGO │  TELEMETRY STRIP  h-8  (XAU/USD)    │
     │ BOX  ├─────────────────────────────────────┤
     │ 88px │  HEADER  h-14  (role badge)          │
     ├──────┼─────────────────────────────────────┤
     │ SIDE │  MAIN  (flex-1 min-h-0 scrollable)  │
     │  BAR │                                      │
     │ w-64 │                                      │
     └──────┴─────────────────────────────────────┘
   ================================================================ */

import { type ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { useGoldPrice } from "@/hooks/use-gold-price";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/lib/mock-data";
import { Activity, Wifi, Lock, Fingerprint, Loader2, ShieldAlert } from "lucide-react";

/* ── Operator roles that bypass the compliance gate (admin impersonation) ── */
const OPERATOR_ROLES: UserRole[] = [
  "admin",
  "compliance",
  "treasury",
  "vault_ops",
  "INSTITUTION_TRADER",
  "INSTITUTION_TREASURY",
];

/* ══════════════════════════════════════════════════════════════════
   BROKER COMPLIANCE GATE — The Trapdoor
   ══════════════════════════════════════════════════════════════════
   Brokers are invite-only (org:broker assigned in Clerk).
   However, an invite does NOT mean they are compliance-cleared.
   This gate checks their KYB/AML status and:
     - Operator/Admin → bypass gate entirely (impersonation mode)
     - Loading  → secure terminal spinner (dark mode)
     - !CLEARED → VIOLENT redirect to /offtaker/onboarding/kyb
     - CLEARED  → render children (broker terminal)
   ══════════════════════════════════════════════════════════════════ */

function BrokerComplianceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const role: UserRole = user?.role ?? "offtaker";
  const isOperator = OPERATOR_ROLES.includes(role);

  const {
    data: onboardingState,
    isLoading,
    isError,
  } = useOnboardingState(!isOperator); // Skip compliance fetch for operators

  const isCleared = isOperator || onboardingState?.status === "COMPLETED";

  useEffect(() => {
    // Operators bypass — no redirect needed
    if (isOperator) return;
    // Never redirect while still loading or on transient error
    if (isLoading || isError) return;

    // ── TRAPDOOR: Unverified broker → forced into AML gauntlet ──
    if (!isCleared) {
      router.replace("/offtaker/onboarding/kyb");
    }
  }, [isOperator, isLoading, isError, isCleared, router]);

  // ── OPERATOR BYPASS: Admins viewing broker portal via impersonation ──
  if (isOperator) {
    return <>{children}</>;
  }

  // ── Loading: Secure terminal spinner ──
  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 text-amber-400 animate-spin mb-4" />
        <span className="font-mono text-[11px] text-slate-500 tracking-[0.2em] uppercase">
          Verifying Broker Compliance Perimeter
        </span>
        <span className="font-mono text-[9px] text-slate-700 tracking-wider mt-1">
          AML / KYB / IDENTITY — DO NOT CLOSE THIS WINDOW
        </span>
      </div>
    );
  }

  // ── Error: Show retry state (do NOT redirect on transient errors) ──
  if (isError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <ShieldAlert className="h-8 w-8 text-red-400 mb-4" />
        <span className="font-mono text-[11px] text-slate-400 tracking-wider uppercase">
          Compliance Verification Failed
        </span>
        <span className="font-mono text-[9px] text-slate-600 mt-1">
          Unable to verify broker credentials. Retrying automatically...
        </span>
      </div>
    );
  }

  // ── NOT CLEARED: Render nothing — useEffect is handling the redirect ──
  if (!isCleared) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
        <ShieldAlert className="h-8 w-8 text-amber-400 mb-4" />
        <span className="font-mono text-[11px] text-amber-400 tracking-wider uppercase">
          Compliance Clearance Required
        </span>
        <span className="font-mono text-[9px] text-slate-600 mt-1">
          Redirecting to AML/KYB verification...
        </span>
      </div>
    );
  }

  // ── CLEARED: Render the broker terminal ──
  return <>{children}</>;
}

/* ── Navigation items ── */
const NAV_ITEMS = [
  { href: "/broker",           label: "Command Center",   icon: "◆" },
  { href: "/broker/pipeline",  label: "Deal Pipeline",    icon: "◈" },
  { href: "/broker/assets",    label: "LBMA Assets",      icon: "◇" },
  { href: "/broker/clients",   label: "Client Network",   icon: "◻" },
] as const;

export default function BrokerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: goldPrice, isLoading: priceLoading } = useGoldPrice();
  const spotPrice = goldPrice?.spotPriceUsd ?? 0;

  /* ── Hydration guard: prevent React #418 by skipping SSR render ── */
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line -- Hydration guard: setMounted(true) on mount is intentional
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    return <div className="absolute inset-0 bg-slate-950" />;
  }

  return (
    <BrokerComplianceGate>
      <div className="absolute inset-0 flex overflow-hidden bg-slate-950 text-slate-300" suppressHydrationWarning>

        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
          {/* MATHEMATICALLY LOCKED LOGO BOX (32px + 56px = 88px) */}
          <div className="h-[88px] shrink-0 flex items-center justify-center border-b border-slate-800 px-5">
            <AppLogo className="h-8 w-auto" variant="dark" />
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-4 px-3 space-y-1">
            {NAV_ITEMS.map((item, idx) => {
              const isActive =
                item.href === "/broker"
                  ? pathname === "/broker"
                  : pathname.startsWith(item.href);

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
                    <span className="text-base leading-none">{item.icon}</span>
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

            {/* ── Compliance ── */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <p className="px-3 mb-1.5 font-mono text-[9px] text-slate-600 uppercase tracking-[0.15em] font-bold">
                Compliance
              </p>
              <Link
                href="/compliance/training"
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith("/compliance/training")
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
                ].join(" ")}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Mandatory AML Training</span>
              </Link>
            </div>
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-slate-800 px-4 py-3">
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              Broker Portal v1.0
            </p>
          </div>
        </aside>

        {/* ── RIGHT MAIN CONTENT ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 1. Telemetry Strip (h-8) */}
          <div className="h-8 shrink-0 bg-black/40 border-b border-slate-800/60 px-6 flex items-center gap-6">
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

          {/* 2. Main Header (h-14) */}
          <header className="h-14 shrink-0 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6">
            {/* Role indicator */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded border border-amber-500/30 bg-amber-500/10 text-xs font-mono font-semibold tracking-widest text-amber-400 uppercase">
                Broker Terminal
              </span>
            </div>
          </header>

          {/* 3. Main Scrollable Content */}
          <main className="flex-1 min-h-0 overflow-y-auto relative">
            {children}
          </main>
        </div>

      </div>
    </BrokerComplianceGate>
  );
}
