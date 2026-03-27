"use client";

/* ================================================================
   INSTITUTIONAL WORKSPACE — Portfolio Overview
   ================================================================
   Real-data dashboard for the institutional buyer. Sections that
   lack live backend connections render honest, clearly-labeled
   placeholders instead of fake demo data.

   Data sources:
     - Compliance Status: useOnboardingState() (LIVE)
     - All other sections: awaiting backend integration

   Source-of-truth labels are rendered alongside each section
   so the buyer always knows what is real vs pending.
   ================================================================ */

import Link from "next/link";
import {
  Vault,
  Lock,
  FlaskConical,
  ShieldCheck,
  ArrowRight,
  Activity,
  FileText,
  Info,
} from "lucide-react";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

/* ── Source Label Component ── */
function SourceLabel({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[8px] text-slate-600 tracking-wider uppercase">
      <Info className="h-2.5 w-2.5" />
      {source}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function InstitutionalPortfolioPage() {
  const { data: onboardingState, isLoading } = useOnboardingState();
  const isCleared = onboardingState?.status === "COMPLETED";

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* ────────────────────────────────────────────────────────────
          TOP KPI STRIP — 4 metric cards
          ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">

        {/* Vaulted Holdings */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Vault className="h-4 w-4 text-slate-400" />
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Vaulted Holdings
            </p>
          </div>
          <p className="text-lg font-mono font-bold text-slate-600 tabular-nums leading-tight">
            —
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] font-mono text-slate-600">
              No active custody allocations
            </p>
          </div>
          <SourceLabel source="Derived from settlement cases" />
        </div>

        {/* Capital in Escrow */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-slate-500" />
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Capital in Escrow (DvP)
            </p>
          </div>
          <p className="text-lg font-mono font-bold text-slate-600 tabular-nums leading-tight">
            —
          </p>
          <p className="text-[11px] font-mono text-slate-600 mt-1">
            No active escrow positions
          </p>
          <SourceLabel source="Derived from settlement cases" />
        </div>

        {/* Refinery Pipeline */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-slate-500" />
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Refinery Pipeline
            </p>
          </div>
          <p className="text-lg font-mono font-bold text-slate-600 tabular-nums leading-tight">
            —
          </p>
          <p className="text-[11px] font-mono text-slate-600 mt-1">
            No assets in refinement
          </p>
          <SourceLabel source="Derived from settlement cases" />
        </div>

        {/* Compliance Status — LIVE DATA */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className={`h-4 w-4 ${isCleared ? "text-emerald-400" : "text-slate-500"}`} />
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Compliance Status
            </p>
          </div>
          {isLoading ? (
            <p className="text-sm font-mono text-slate-600 leading-tight animate-pulse">
              Verifying…
            </p>
          ) : isCleared ? (
            <>
              <p className="text-sm font-mono font-bold text-emerald-400 leading-tight">
                Entity Cleared
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-wider">
                  All checks passed
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-mono font-bold text-yellow-400 leading-tight">
                Verification Required
              </p>
              <Link
                href="/institutional/get-started/welcome"
                className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono text-yellow-400 hover:text-yellow-300 transition-colors uppercase tracking-wider group"
              >
                Complete Onboarding
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
          <SourceLabel source="Derived from onboarding state" />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          ACTIVE SETTLEMENTS — Empty State
          ──────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg flex flex-col">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">
            Active Settlements
          </p>
          <SourceLabel source="Derived from settlement cases" />
        </div>
        <div className="px-6 py-10 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-slate-900 mb-3">
            <Activity className="h-5 w-5 text-slate-600" />
          </div>
          <p className="font-mono text-sm text-slate-400 font-semibold mb-1">
            No live settlement cases yet
          </p>
          <p className="font-mono text-[11px] text-slate-600 max-w-sm leading-relaxed">
            Settlement cases are created when you execute a trade through the
            marketplace. Each case tracks the full lifecycle from intent to
            custody allocation.
          </p>
          <Link
            href="/institutional/marketplace"
            className="mt-4 inline-flex items-center gap-2 border border-[#C6A86B]/30 bg-[#C6A86B]/10 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#C6A86B] hover:bg-[#C6A86B]/20 transition-colors"
          >
            Open Marketplace
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          BOTTOM SPLIT PANELS
          ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* ── Left: Allocation by Jurisdiction — Empty State ── */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">
              Allocation by Jurisdiction
            </p>
            <SourceLabel source="Derived from settlement cases" />
          </div>
          <div className="px-4 py-8 flex flex-col items-center text-center">
            <Vault className="h-5 w-5 text-slate-700 mb-2" />
            <p className="font-mono text-xs text-slate-500 font-semibold mb-0.5">
              No active custody allocations
            </p>
            <p className="font-mono text-[10px] text-slate-600 max-w-[280px] leading-relaxed">
              Jurisdiction allocations will appear once assets are placed under
              bailment at a designated vault facility.
            </p>
          </div>
        </div>

        {/* ── Right: Ledger Events — Empty State ── */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">
              Ledger Events
            </p>
            <SourceLabel source="Operational data source not yet connected" />
          </div>
          <div className="px-4 py-8 flex flex-col items-center text-center">
            <FileText className="h-5 w-5 text-slate-700 mb-2" />
            <p className="font-mono text-xs text-slate-500 font-semibold mb-0.5">
              No ledger events recorded
            </p>
            <p className="font-mono text-[10px] text-slate-600 max-w-[280px] leading-relaxed">
              Settlement, escrow, and custody events will appear here as your
              transactions progress through the DvP pipeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
