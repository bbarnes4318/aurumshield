"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useLedgerIndex } from "@/hooks/use-mock-queries";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  SETTLED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ESCROW_OPEN: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ESCROW_LOCKED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
};

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function LedgerContent() {
  const { data: entries, isLoading } = useLedgerIndex();

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center text-text-muted">Loading ledger index…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Ledger Index</h1>
          <p className="text-sm text-text-muted mt-0.5">Settlement ledger summary with integrity badges</p>
        </div>
        <Link href="/audit" className="text-xs text-text-muted hover:text-gold transition-colors">← Back to overview</Link>
      </div>

      <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-2/50">
                <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Settlement</th>
                <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Order</th>
                <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Status</th>
                <th className="px-3 py-2 text-right font-semibold text-text-faint uppercase tracking-widest">Entries</th>
                <th className="px-3 py-2 text-right font-semibold text-text-faint uppercase tracking-widest">Notional</th>
                <th className="px-3 py-2 text-right font-semibold text-text-faint uppercase tracking-widest">Weight</th>
                <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Last Entry</th>
                <th className="px-3 py-2 text-center font-semibold text-text-faint uppercase tracking-widest">Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(entries ?? []).map((e) => {
                const statusClass = STATUS_COLORS[e.status] ?? "bg-surface-3 text-text-faint border-border";
                const integrityOk = e.entryCount >= 1;
                return (
                  <tr key={e.settlementId} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-3 py-2">
                      <Link href={`/settlements/${e.settlementId}`} className="font-mono text-gold hover:underline">{e.settlementId}</Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-text-muted">
                      <Link href={`/orders/${e.orderId}`} className="hover:text-gold transition-colors">{e.orderId}</Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusClass}`}>{e.status}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-text">{e.entryCount}</td>
                    <td className="px-3 py-2 text-right font-mono text-text">{fmtUsd(e.notionalUsd)}</td>
                    <td className="px-3 py-2 text-right font-mono text-text">{e.weightOz} oz</td>
                    <td className="px-3 py-2 font-mono text-text-faint">{fmtTime(e.lastEntryAt)}</td>
                    <td className="px-3 py-2 text-center">
                      {integrityOk ? (
                        <span className="inline-flex rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">PASS</span>
                      ) : (
                        <span className="inline-flex rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">FAIL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(entries ?? []).length === 0 && (
                <tr><td colSpan={8} className="px-3 py-12 text-center text-text-faint">No ledger entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AuditLedgerPage() {
  return (
    <RequireAuth>
      <LedgerContent />
    </RequireAuth>
  );
}
