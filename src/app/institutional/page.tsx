"use client";

/* ================================================================
   INSTITUTIONAL TELEMETRY DASHBOARD — Portfolio Overview
   ================================================================
   Zero-scroll prime-brokerage telemetry view scoped to the
   institutional buyer's portfolio. Mirrors the internal treasury
   dashboard aesthetic with dark, dense, monospaced financial data.

   Sections:
     1. Top KPI Strip (4 cards)
     2. Active Settlements data table
     3. Bottom split — Jurisdiction Allocation + Ledger Events

   TODO: Wire all mock data to TanStack Query endpoints.
   ================================================================ */

import Link from "next/link";
import {
  Vault,
  Lock,
  FlaskConical,
  ShieldCheck,
  ExternalLink,
  ArrowRight,
  Radio,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   MOCK DATA — Deterministic demo payloads
   ══════════════════════════════════════════════════════════════════ */

const SETTLEMENTS = [
  {
    ref: "DvP-2026-0418",
    counterparty: "Perth Mint",
    notional: "$8,200,000",
    state: "AWAITING_ASSAY",
    stateColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    ref: "DvP-2026-0415",
    counterparty: "PAMP Suisse AG",
    notional: "$22,500,000",
    state: "IN_TRANSIT",
    stateColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
  {
    ref: "DvP-2026-0412",
    counterparty: "Royal Canadian Mint",
    notional: "$15,000,000",
    state: "IN_TRANSIT",
    stateColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
  {
    ref: "DvP-2026-0409",
    counterparty: "Valcambi SA",
    notional: "$41,300,000",
    state: "AT_VAULT",
    stateColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    ref: "DvP-2026-0401",
    counterparty: "LBMA Vault — Brink's",
    notional: "$31,700,000",
    state: "SETTLED",
    stateColor: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  },
] as const;

const LEDGER_EVENTS = [
  { ts: "12:03:44 UTC", hash: "0xae9f…d412", event: "Vault Receipt Verified — Brink's Zürich", severity: "info" as const },
  { ts: "11:58:12 UTC", hash: "0x3b1c…a087", event: "Assay Certificate Uploaded — Perth Mint", severity: "info" as const },
  { ts: "11:41:03 UTC", hash: "0xfc22…7e91", event: "Escrow Lock Confirmed — $22.5M USDC", severity: "warn" as const },
  { ts: "11:30:00 UTC", hash: "0x8d44…bb03", event: "DvP-2026-0415 State → IN_TRANSIT", severity: "info" as const },
  { ts: "10:15:22 UTC", hash: "0x12ef…c930", event: "Compliance Re-Attestation Passed", severity: "success" as const },
  { ts: "09:42:11 UTC", hash: "0xa7b3…1f55", event: "New Settlement Initiated — $15M RCM", severity: "warn" as const },
] as const;

const JURISDICTION_ALLOCATIONS = [
  { region: "Zürich, Switzerland", pct: 42, value: "$13.4M", bars: 16 },
  { region: "London, United Kingdom", pct: 33, value: "$10.5M", bars: 12 },
  { region: "Singapore", pct: 15, value: "$4.8M", bars: 6 },
  { region: "Toronto, Canada", pct: 10, value: "$3.1M", bars: 4 },
] as const;

/* ══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function InstitutionalPortfolioPage() {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* ────────────────────────────────────────────────────────────
          TOP KPI STRIP — 4 metric cards
          ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">

        {/* Vaulted Holdings */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Vault className="h-4 w-4 text-amber-400" />
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Vaulted Holdings
            </p>
          </div>
          <p className="text-lg font-mono font-bold text-white tabular-nums leading-tight">
            12,000 <span className="text-sm text-slate-400">oz</span>
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-1 tabular-nums">
            Value: <span className="text-slate-300 font-semibold">$31.8M</span>
          </p>
        </div>

        {/* Capital in Escrow */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-sky-400" />
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Capital in Escrow (DvP)
            </p>
          </div>
          <p className="text-lg font-mono font-bold text-white tabular-nums leading-tight">
            $50,000,000
          </p>
          <p className="text-[11px] font-mono text-sky-400 mt-1">
            Status: <span className="font-semibold">Locked</span>
          </p>
        </div>

        {/* Refinery Pipeline */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-violet-400" />
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Refinery Pipeline
            </p>
          </div>
          <p className="text-lg font-mono font-bold text-white tabular-nums leading-tight">
            5 <span className="text-sm text-slate-400">bars</span>
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            State: <span className="text-violet-400 font-semibold">At Refinery (Assay)</span>
          </p>
          <Link
            href="/institutional/logistics"
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider group"
          >
            Track Assets
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Compliance Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Compliance Status
            </p>
          </div>
          <p className="text-sm font-mono font-bold text-emerald-400 leading-tight">
            Entity Cleared
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            OECD Conflict-Free Certified
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-wider">
              All checks passed
            </span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          ACTIVE SETTLEMENTS TABLE
          ──────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg flex flex-col">
        {/* Table header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">
            Active Settlements
          </p>
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">
            {SETTLEMENTS.length} records
          </span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[140px_1fr_140px_160px_120px] gap-2 px-4 py-2 border-b border-slate-800/60 text-[9px] font-mono text-slate-600 uppercase tracking-widest">
          <span>Reference ID</span>
          <span>Counterparty</span>
          <span className="text-right">Notional</span>
          <span className="text-center">State</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-800/40">
          {SETTLEMENTS.map((row) => (
            <div
              key={row.ref}
              className="grid grid-cols-[140px_1fr_140px_160px_120px] gap-2 px-4 py-2.5 items-center hover:bg-slate-800/20 transition-colors"
            >
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {row.ref}
              </span>
              <span className="text-xs text-slate-300">
                {row.counterparty}
              </span>
              <span className="font-mono text-xs text-white font-semibold tabular-nums text-right">
                {row.notional}
              </span>
              <span className="text-center">
                <span className={`inline-block px-2 py-0.5 rounded border text-[9px] font-mono font-semibold uppercase tracking-wider ${row.stateColor}`}>
                  {row.state.replace(/_/g, " ")}
                </span>
              </span>
              <span className="text-right">
                <Link
                  href="/institutional/logistics"
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-amber-400 transition-colors"
                >
                  Track
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          BOTTOM SPLIT PANELS
          ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* ── Left: Allocation by Jurisdiction ── */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">
              Allocation by Jurisdiction
            </p>
          </div>
          <div className="p-4 space-y-3">
            {JURISDICTION_ALLOCATIONS.map((j) => (
              <div key={j.region}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300">{j.region}</span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {j.bars} bars · {j.value}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-amber-500/80 to-amber-400"
                    style={{ width: `${j.pct}%` }}
                  />
                </div>
                <p className="text-right text-[9px] font-mono text-slate-600 mt-0.5 tabular-nums">
                  {j.pct}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Recent Ledger Events ── */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <p className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">
                Ledger Events
              </p>
            </div>
            <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-wider">
              Live Feed
            </span>
          </div>
          <div className="divide-y divide-slate-800/40 overflow-y-auto max-h-[260px]">
            {LEDGER_EVENTS.map((evt, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-3 hover:bg-slate-800/20 transition-colors">
                <span className="font-mono text-[9px] text-slate-600 tabular-nums whitespace-nowrap pt-0.5">
                  {evt.ts}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-snug">
                    {evt.event}
                  </p>
                  <p className="font-mono text-[9px] text-slate-700 mt-0.5 truncate">
                    TX: {evt.hash}
                  </p>
                </div>
                <span
                  className={[
                    "mt-0.5 inline-block h-1.5 w-1.5 rounded-full shrink-0",
                    evt.severity === "success" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" :
                    evt.severity === "warn"    ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" :
                                                 "bg-slate-600",
                  ].join(" ")}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
