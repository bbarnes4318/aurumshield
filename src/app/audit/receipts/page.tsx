"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useReceiptIndex } from "@/hooks/use-mock-queries";
import Link from "next/link";

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function ReceiptsContent() {
  const { data: entries, isLoading } = useReceiptIndex();

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center text-text-muted">Loading receipt index…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Receipt Index</h1>
          <p className="text-sm text-text-muted mt-0.5">Order receipts and availability status</p>
        </div>
        <Link href="/audit" className="text-xs text-text-muted hover:text-gold transition-colors">← Back to overview</Link>
      </div>

      <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-2/50">
                <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Order</th>
                <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Listing</th>
                <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Buyer</th>
                <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Seller</th>
                <th className="px-3 py-2 text-right font-semibold text-text-faint uppercase tracking-widest">Weight</th>
                <th className="px-3 py-2 text-right font-semibold text-text-faint uppercase tracking-widest">Notional</th>
                <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Status</th>
                <th className="px-3 py-2 text-center font-semibold text-text-faint uppercase tracking-widest">Receipt</th>
                <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(entries ?? []).map((e) => (
                <tr key={e.orderId} className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-3 py-2">
                    <Link href={`/orders/${e.orderId}`} className="font-mono text-gold hover:underline">{e.orderId}</Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-text-muted">{e.listingId}</td>
                  <td className="px-3 py-2 font-mono text-text-muted">{e.buyerUserId}</td>
                  <td className="px-3 py-2 font-mono text-text-muted">{e.sellerUserId}</td>
                  <td className="px-3 py-2 text-right font-mono text-text">{e.weightOz} oz</td>
                  <td className="px-3 py-2 text-right font-mono text-text">{fmtUsd(e.notional)}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-mono uppercase text-text-faint">{e.status}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {e.hasReceipt ? (
                      <Link href={`/audit/receipts/${e.orderId}`} className="inline-flex rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                        VIEW
                      </Link>
                    ) : (
                      <span className="inline-flex rounded border border-border bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-text-faint">PENDING</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {e.settlementId ? (
                      <Link href={`/settlements/${e.settlementId}`} className="font-mono text-xs text-text-muted hover:text-gold transition-colors">{e.settlementId}</Link>
                    ) : (
                      <span className="text-text-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {(entries ?? []).length === 0 && (
                <tr><td colSpan={9} className="px-3 py-12 text-center text-text-faint">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AuditReceiptsPage() {
  return (
    <RequireAuth>
      <ReceiptsContent />
    </RequireAuth>
  );
}
