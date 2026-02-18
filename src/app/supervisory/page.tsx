"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useGovernanceAuditEvents, useLedgerIndex, useReceiptIndex } from "@/hooks/use-mock-queries";
import type { GovernanceAuditEvent, AuditSeverity } from "@/lib/mock-data";
import Link from "next/link";
import { useMemo } from "react";

/* ---------- helpers ---------- */

const SEV_COLORS: Record<AuditSeverity, string> = {
  info: "bg-blue-500/10 text-blue-400",
  warning: "bg-amber-500/10 text-amber-400",
  critical: "bg-red-500/10 text-red-400",
};

const RESULT_COLORS: Record<string, string> = {
  SUCCESS: "text-emerald-400",
  DENIED: "text-amber-400",
  ERROR: "text-red-400",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">{label}</p>
      <p className="text-lg font-bold font-mono text-text mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-text-faint mt-0.5">{sub}</p>}
    </div>
  );
}

/* ---------- main ---------- */
function SupervisoryContent() {
  const { data: events } = useGovernanceAuditEvents();
  const { data: ledgerIndex } = useLedgerIndex();
  const { data: receiptIndex } = useReceiptIndex();

  const stats = useMemo(() => {
    const evts = events ?? [];
    const critical = evts.filter((e) => e.severity === "critical").length;
    const denied = evts.filter((e) => e.result === "DENIED").length;
    const errors = evts.filter((e) => e.result === "ERROR").length;
    const totalSettlements = (ledgerIndex ?? []).length;
    const settledCount = (ledgerIndex ?? []).filter((l) => l.status === "SETTLED").length;
    const totalOrders = (receiptIndex ?? []).length;
    const receiptsAvailable = (receiptIndex ?? []).filter((r) => r.hasReceipt).length;
    const totalNotional = (ledgerIndex ?? []).reduce((a, l) => a + l.notionalUsd, 0);

    return {
      totalEvents: evts.length,
      critical,
      denied,
      errors,
      totalSettlements,
      settledCount,
      totalOrders,
      receiptsAvailable,
      totalNotional,
    };
  }, [events, ledgerIndex, receiptIndex]);

  const recentCritical = useMemo(
    () => (events ?? []).filter((e: GovernanceAuditEvent) => e.severity === "critical" || e.result === "ERROR").slice(0, 8),
    [events],
  );

  const activeSettlements = useMemo(
    () => (ledgerIndex ?? []).filter((l) => l.status !== "SETTLED" && l.status !== "FAILED").slice(0, 8),
    [ledgerIndex],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Supervisory Mode</h1>
          <p className="text-sm text-text-muted mt-0.5">Read-only oversight of governance, settlements, and receipts</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Events" value={stats.totalEvents} />
        <StatCard label="Critical" value={stats.critical} sub={`${stats.denied} denied · ${stats.errors} errors`} />
        <StatCard label="Settlements" value={stats.totalSettlements} sub={`${stats.settledCount} settled`} />
        <StatCard label="Orders" value={stats.totalOrders} sub={`${stats.receiptsAvailable} receipts`} />
        <StatCard label="Notional Volume" value={fmtUsd(stats.totalNotional)} />
      </div>

      {/* Two-panel layout */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Critical / Errors */}
        <div className="rounded-lg border border-red-500/20 bg-surface-1">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-red-400">Critical &amp; Error Events</h2>
            <Link href="/audit/events?severity=critical" className="text-xs text-gold hover:underline">Full log →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentCritical.length === 0 && <p className="px-4 py-8 text-center text-sm text-text-faint">All clear</p>}
            {recentCritical.map((e) => (
              <Link key={e.id} href={`/audit/events/${e.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-2 transition-colors">
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEV_COLORS[e.severity]}`}>{e.severity}</span>
                <span className={`font-mono text-[11px] ${RESULT_COLORS[e.result]}`}>{e.result}</span>
                <span className="flex-1 truncate text-xs text-text-muted">{e.message}</span>
                <span className="shrink-0 text-[10px] text-text-faint font-mono">{fmtTime(e.occurredAt)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* In-flight Settlements */}
        <div className="rounded-lg border border-amber-500/20 bg-surface-1">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">In-flight Settlements</h2>
            <Link href="/audit/ledger" className="text-xs text-gold hover:underline">Full index →</Link>
          </div>
          <div className="divide-y divide-border">
            {activeSettlements.length === 0 && <p className="px-4 py-8 text-center text-sm text-text-faint">No active settlements</p>}
            {activeSettlements.map((s) => (
              <Link key={s.settlementId} href={`/supervisory/case/settlement/${s.settlementId}`} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-2 transition-colors">
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono uppercase text-amber-400">{s.status}</span>
                <span className="font-mono text-xs text-text">{s.settlementId}</span>
                <span className="ml-auto font-mono text-xs text-text-muted">{fmtUsd(s.notionalUsd)}</span>
                <span className="text-[10px] text-text-faint">{s.entryCount} entries</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Audit Console", href: "/audit", desc: "Full governance command center" },
          { label: "Event Log", href: "/audit/events", desc: "Browse all audit events" },
          { label: "Ledger Index", href: "/audit/ledger", desc: "Settlement integrity" },
          { label: "Receipt Index", href: "/audit/receipts", desc: "Order receipts" },
        ].map((n) => (
          <Link key={n.href} href={n.href} className="group rounded-lg border border-border bg-surface-1 px-4 py-3 hover:border-gold/30 transition-colors">
            <span className="text-sm font-medium text-text-muted group-hover:text-gold transition-colors">{n.label}</span>
            <span className="block text-[10px] text-text-faint mt-0.5">{n.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SupervisoryPage() {
  return (
    <RequireAuth>
      <SupervisoryContent />
    </RequireAuth>
  );
}
