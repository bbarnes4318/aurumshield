"use client";

import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowRight, Shield, Landmark, Coins } from "lucide-react";

/* ================================================================
   MOCK CLEARING ACTIVITY
   ================================================================ */
interface ClearingEntry {
  id: string;
  reference: string;
  counterparty: string;
  amount: string;
  currency: string;
  status: string;
  statusColor: string;
  timestamp: string;
}

const MOCK_CLEARING: ClearingEntry[] = [
  {
    id: "1",
    reference: "GW-2026-00482",
    counterparty: "Rothschild & Co.",
    amount: "4,250,000.00",
    currency: "USD",
    status: "T-Zero Settled",
    statusColor: "text-emerald-400",
    timestamp: "2026-03-06 · 14:32 UTC",
  },
  {
    id: "2",
    reference: "GW-2026-00481",
    counterparty: "JP Morgan Commodities",
    amount: "12,800,000.00",
    currency: "USD",
    status: "Awaiting Fedwire",
    statusColor: "text-amber-400",
    timestamp: "2026-03-06 · 11:07 UTC",
  },
  {
    id: "3",
    reference: "GW-2026-00479",
    counterparty: "PAMP SA Geneva",
    amount: "1,920,000.00",
    currency: "USDC",
    status: "Vault Allocated",
    statusColor: "text-sky-400",
    timestamp: "2026-03-05 · 09:45 UTC",
  },
];

/* ================================================================
   SKELETON
   ================================================================ */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-80 rounded bg-surface-3" />
      <div className="h-5 w-[32rem] rounded bg-surface-3" />
      <div className="h-20 w-full rounded-[var(--radius)] bg-surface-3" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="h-48 rounded-[var(--radius)] bg-surface-3" />
        <div className="h-48 rounded-[var(--radius)] bg-surface-3" />
      </div>
      <div className="h-64 rounded-[var(--radius)] bg-surface-3" />
    </div>
  );
}

/* ================================================================
   TREASURY DESK CONTENT
   ================================================================ */
function TreasuryDeskContent() {
  return (
    <div className="section-gap">
      {/* ── A. Treasury Header ── */}
      <PageHeader
        title="Corporate Treasury Desk"
        description="Manage high-notional settlements, track physical allocations, and review cryptographic provenance."
      />

      {/* ── B. Compliance Perimeter Card ── */}
      <div className="card-base flex items-center gap-4 px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-emerald-500 shrink-0" />
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-emerald-500 whitespace-nowrap">
            KYB &amp; OFAC Cleared
          </span>
        </div>
        <div className="hidden h-5 w-px bg-border sm:block" />
        <p className="text-sm text-text-muted leading-relaxed">
          Entity is authorized for unrestricted Principal Market Maker clearing
          via US Fedwire and Digital Asset bridges.
        </p>
      </div>

      {/* ── C. Action Row ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Fiat Card */}
        <div className="card-base flex flex-col justify-between p-6 sm:p-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                <Landmark className="h-5 w-5 text-gold" />
              </div>
              <h3 className="typo-h3">Initiate USD Settlement</h3>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Route via Fedwire FBO — execute same-day domestic wire transfers
              with deterministic clearing confirmation and full OFAC screening
              embedded at the network level.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-gold px-5 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed"
            >
              New USD Transfer
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Digital Card */}
        <div className="card-base flex flex-col justify-between p-6 sm:p-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
                <Coins className="h-5 w-5 text-sky-400" />
              </div>
              <h3 className="typo-h3">Initiate Digital Settlement</h3>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Route via USDC/USDT MPC Bridge — settle cross-border digital asset
              transfers with multi-party computation custody and on-chain
              provenance attestation.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-2 rounded-[var(--radius-input)] border border-border bg-transparent px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-2 hover:border-text-faint"
            >
              New Stablecoin Transfer
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── D. Active Ledger ── */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-8">
          <h2 className="typo-h3">Recent Clearing Activity</h2>
          <span className="typo-label text-text-faint">Last 72 Hours</span>
        </div>

        <div className="divide-y divide-border/60">
          {MOCK_CLEARING.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 transition-colors hover:bg-surface-2/30"
            >
              {/* Left: Reference + Counterparty */}
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-sm font-medium text-gold whitespace-nowrap">
                  {entry.reference}
                </span>
                <span className="hidden h-4 w-px bg-border sm:block" />
                <span className="text-sm text-text-muted truncate">
                  {entry.counterparty}
                </span>
              </div>

              {/* Center: Amount + Currency */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-sm font-semibold tabular-nums text-text">
                  {entry.amount}
                </span>
                <span className="font-mono text-xs text-text-faint">
                  {entry.currency}
                </span>
              </div>

              {/* Right: Status + Timestamp */}
              <div className="flex items-center gap-4 shrink-0">
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${entry.statusColor}`}
                >
                  {entry.status}
                </span>
                <span className="font-mono text-xs text-text-faint whitespace-nowrap">
                  {entry.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   PAGE EXPORT
   ================================================================ */
export default function TransactionsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TreasuryDeskContent />
    </Suspense>
  );
}
