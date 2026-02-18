"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import {
  useGovernanceAuditEvents,
  useSettlement,
  useSettlementLedger,
  useOrder,
} from "@/hooks/use-mock-queries";
import type { GovernanceAuditEvent, AuditSeverity, LedgerEntry } from "@/lib/mock-data";
import Link from "next/link";
import { useParams } from "next/navigation";

/* ---------- helpers ---------- */

const SEV_COLORS: Record<AuditSeverity, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

const RESULT_COLORS: Record<string, string> = {
  SUCCESS: "text-emerald-400",
  DENIED: "text-amber-400",
  ERROR: "text-red-400",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <span className="w-28 shrink-0 text-[10px] uppercase tracking-widest text-text-faint font-semibold pt-0.5">{label}</span>
      <span className="text-xs text-text">{children}</span>
    </div>
  );
}

/* ---------- main ---------- */
function SupervisoryCaseContent() {
  const params = useParams();
  const resourceType = params.type as string;
  const resourceId = params.id as string;

  // Fetch audit events for this resource
  const { data: auditEvents } = useGovernanceAuditEvents({
    resourceType: resourceType as "settlement" | "order",
    resourceId,
  });

  // Fetch settlement if relevant
  const isSettlement = resourceType === "settlement";
  const { data: settlement, isLoading: settlementLoading } = useSettlement(isSettlement ? resourceId : "");

  // If it's an order, fetch order and linked settlement
  const isOrder = resourceType === "order";
  const { data: order, isLoading: orderLoading } = useOrder(isOrder ? resourceId : "");

  // Fetch ledger for settlement
  const settlementId = isSettlement ? resourceId : settlement?.id;
  const { data: ledger } = useSettlementLedger(settlementId ?? "");

  const loading = settlementLoading || orderLoading;

  if (loading) {
    return <div className="flex h-96 items-center justify-center text-text-muted">Loading case…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text flex items-center gap-2">
            Supervisory Case
            <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-mono uppercase text-text-faint">{resourceType}</span>
            <span className="font-mono text-text-muted">{resourceId}</span>
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Full audit dossier — read-only supervisory view</p>
        </div>
        <Link href="/supervisory" className="text-xs text-text-muted hover:text-gold transition-colors">← Back to supervisory</Link>
      </div>

      {/* Subject panel */}
      <div className="rounded-lg border border-gold/20 bg-surface-1">
        <div className="border-b border-gold/20 bg-gold/5 px-4 py-2.5">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-gold">Subject Details</h2>
        </div>
        <div className="grid gap-0 lg:grid-cols-2">
          {/* Left column */}
          <div className="border-b border-border lg:border-b-0 lg:border-r px-4 py-2">
            {isSettlement && settlement && (
              <>
                <DetailRow label="Settlement"><span className="font-mono">{settlement.id}</span></DetailRow>
                <DetailRow label="Status"><span className="font-mono font-semibold">{settlement.status}</span></DetailRow>
                <DetailRow label="Order">
                  <Link href={`/orders/${settlement.orderId}`} className="font-mono text-gold hover:underline">{settlement.orderId}</Link>
                </DetailRow>
                <DetailRow label="Notional">{fmtUsd(settlement.notionalUsd)}</DetailRow>
                <DetailRow label="Weight">{settlement.weightOz} oz</DetailRow>
                <DetailRow label="Opened">{fmtTime(settlement.openedAt)}</DetailRow>
                {settlement.status === "SETTLED" && <DetailRow label="Completed">{fmtTime(settlement.updatedAt)}</DetailRow>}
              </>
            )}
            {isOrder && order && (
              <>
                <DetailRow label="Order"><span className="font-mono">{order.id}</span></DetailRow>
                <DetailRow label="Status"><span className="font-mono font-semibold">{order.status}</span></DetailRow>
                <DetailRow label="Listing"><span className="font-mono">{order.listingId}</span></DetailRow>
                <DetailRow label="Buyer"><span className="font-mono">{order.buyerUserId}</span></DetailRow>
                <DetailRow label="Seller"><span className="font-mono">{order.sellerUserId}</span></DetailRow>
                <DetailRow label="Notional">{fmtUsd(order.notional)}</DetailRow>
                <DetailRow label="Weight">{order.weightOz} oz</DetailRow>
              </>
            )}
            {!settlement && !order && (
              <p className="py-8 text-center text-sm text-text-faint">Resource not found</p>
            )}
          </div>

          {/* Right column — links */}
          <div className="px-4 py-2">
            <DetailRow label="Corridor"><span className="font-mono">{settlement?.corridorId ?? "—"}</span></DetailRow>
            <DetailRow label="Hub"><span className="font-mono">{settlement?.hubId ?? "—"}</span></DetailRow>
            <div className="pt-3 space-y-2">
              {settlement && (
                <Link
                  href={`/settlements/${settlement.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
                >
                  View Settlement →
                </Link>
              )}
              {order && (
                <Link
                  href={`/orders/${order.id}/receipt`}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-2 transition-colors ml-2"
                >
                  View Receipt →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="rounded-lg border border-border bg-surface-1">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint">Audit Trail ({(auditEvents ?? []).length} events)</h2>
          <Link href={`/audit/events?resourceType=${resourceType}&resourceId=${resourceId}`} className="text-xs text-gold hover:underline">Full log →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-2/30">
                <th className="px-3 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Time</th>
                <th className="px-3 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Sev</th>
                <th className="px-3 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Action</th>
                <th className="px-3 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Actor</th>
                <th className="px-3 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Result</th>
                <th className="px-3 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(auditEvents ?? []).map((e: GovernanceAuditEvent) => (
                <tr key={e.id} className="hover:bg-surface-2/30 transition-colors">
                  <td className="px-3 py-1.5 font-mono text-text-faint whitespace-nowrap">{fmtTime(e.occurredAt)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEV_COLORS[e.severity]}`}>{e.severity}</span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-text">{e.action}</td>
                  <td className="px-3 py-1.5 text-text-muted">{e.actorRole}</td>
                  <td className="px-3 py-1.5">
                    <span className={`font-mono font-semibold ${RESULT_COLORS[e.result]}`}>{e.result}</span>
                  </td>
                  <td className="px-3 py-1.5 max-w-xs truncate text-text-muted">{e.message}</td>
                </tr>
              ))}
              {(auditEvents ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-text-faint">No audit events for this resource</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledger Trail */}
      {ledger && ledger.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-1">
          <div className="border-b border-border px-4 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint">Ledger Trail ({ledger.length} entries)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2/30">
                  <th className="px-3 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Time</th>
                  <th className="px-3 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Action</th>
                  <th className="px-3 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Actor</th>
                  <th className="px-3 py-1.5 text-left text-text-faint font-semibold uppercase tracking-widest">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledger.map((le: LedgerEntry) => (
                  <tr key={le.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-3 py-1.5 font-mono text-text-faint whitespace-nowrap">{fmtTime(le.timestamp)}</td>
                    <td className="px-3 py-1.5 font-mono text-text">{le.type}</td>
                    <td className="px-3 py-1.5 text-text-muted">{le.actorRole} ({le.actorUserId})</td>
                    <td className="px-3 py-1.5 text-text-muted max-w-xs truncate">{le.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupervisoryCasePage() {
  return (
    <RequireAuth>
      <SupervisoryCaseContent />
    </RequireAuth>
  );
}
