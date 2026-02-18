"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useOrder, useSettlementByOrder, useSettlementLedger } from "@/hooks/use-mock-queries";
import type { LedgerEntry } from "@/lib/mock-data";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <span className="w-28 shrink-0 text-[10px] uppercase tracking-widest text-text-faint font-semibold pt-0.5">{label}</span>
      <span className="text-xs text-text">{children}</span>
    </div>
  );
}

function ReceiptViewerContent() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { data: order, isLoading: orderLoading } = useOrder(orderId);
  const { data: settlement, isLoading: settlementLoading } = useSettlementByOrder(orderId);
  const { data: ledger, isLoading: ledgerLoading } = useSettlementLedger(settlement?.id ?? "");

  const isLoading = orderLoading || settlementLoading || ledgerLoading;

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center text-text-muted">Loading receipt…</div>;
  }

  if (!order) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2">
        <p className="text-text-faint">Order not found</p>
        <Link href="/audit/receipts" className="text-xs text-gold hover:underline">← Back to receipts</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Receipt Viewer</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Read-only receipt for order <span className="font-mono text-gold">{orderId}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/audit/receipts" className="text-xs text-text-muted hover:text-gold transition-colors">← Back to receipts</Link>
          <button
            onClick={() => window.print()}
            className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-3 transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      {/* Receipt Card */}
      <div className="rounded-lg border border-gold/20 bg-surface-1 overflow-hidden">
        {/* Watermark */}
        <div className="border-b border-gold/20 bg-gold/5 px-6 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Image
                src="/arum-logo-navy.png"
                alt="AurumShield"
                width={240}
                height={54}
                className="h-8 w-auto"
              />
            </div>
            <p className="text-[10px] text-text-faint mt-0.5">Generated from audit governance console — read-only</p>
          </div>
          <span className="rounded bg-gold/10 border border-gold/20 px-2 py-1 text-[10px] font-mono font-semibold text-gold">
            {settlement?.status ?? order.status}
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-2">
          {/* Order Details */}
          <div className="border-b border-border lg:border-b-0 lg:border-r px-6 py-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-faint mb-2">Order Details</h2>
            <DetailRow label="Order ID"><span className="font-mono">{order.id}</span></DetailRow>
            <DetailRow label="Listing"><span className="font-mono">{order.listingId}</span></DetailRow>
            <DetailRow label="Buyer"><span className="font-mono">{order.buyerUserId}</span></DetailRow>
            <DetailRow label="Seller"><span className="font-mono">{order.sellerUserId}</span></DetailRow>
            <DetailRow label="Weight">{order.weightOz} oz</DetailRow>
            <DetailRow label="Notional">{fmtUsd(order.notional)}</DetailRow>
            <DetailRow label="Placed">{fmtTime(order.createdAt)}</DetailRow>
          </div>

          {/* Settlement Details */}
          <div className="px-6 py-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-faint mb-2">Settlement</h2>
            {settlement ? (
              <>
                <DetailRow label="Settlement ID">
                  <Link href={`/settlements/${settlement.id}`} className="font-mono text-gold hover:underline">{settlement.id}</Link>
                </DetailRow>
                <DetailRow label="Status">
                  <span className="font-mono font-semibold">{settlement.status}</span>
                </DetailRow>
                <DetailRow label="Opened">{fmtTime(settlement.openedAt)}</DetailRow>
                {settlement.status === "SETTLED" && <DetailRow label="Completed">{fmtTime(settlement.updatedAt)}</DetailRow>}
                <DetailRow label="Corridor"><span className="font-mono">{settlement.corridorId}</span></DetailRow>
                <DetailRow label="Hub"><span className="font-mono">{settlement.hubId}</span></DetailRow>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-text-faint">No settlement opened yet</p>
            )}
          </div>
        </div>

        {/* Ledger */}
        {ledger && ledger.length > 0 && (
          <div className="border-t border-border">
            <div className="px-6 py-3 border-b border-border">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Ledger Trail ({ledger.length} entries)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-2/30">
                    <th className="px-4 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Time</th>
                    <th className="px-4 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Action</th>
                    <th className="px-4 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Actor</th>
                    <th className="px-4 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ledger.map((le: LedgerEntry) => (
                    <tr key={le.id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="px-4 py-1.5 font-mono text-text-faint whitespace-nowrap">{fmtTime(le.timestamp)}</td>
                      <td className="px-4 py-1.5 font-mono text-text">{le.type}</td>
                      <td className="px-4 py-1.5 text-text-muted">{le.actorRole} ({le.actorUserId})</td>
                      <td className="px-4 py-1.5 text-text-muted max-w-xs truncate">
                        {le.detail ?? <span className="text-text-faint">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditReceiptViewerPage() {
  return (
    <RequireAuth>
      <ReceiptViewerContent />
    </RequireAuth>
  );
}
