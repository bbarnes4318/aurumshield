"use client";

/* ================================================================
   SHIPMENT REVIEW UI — Physical Gold Logistics Review
   ================================================================
   Sections:
     1. Shipment Header / Summary
     2. Shipment Integrity Summary
     3. Chain-of-Custody Timeline
     4. Linked Objects (Case, Lot)
     5. Audit Timeline
     6. Backend Gaps
   ================================================================ */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { RequireRole } from "@/components/auth/require-role";
import type { ShipmentDetailData } from "@/actions/compliance-queries";
import {
  ArrowLeft,
  Shield,
  Truck,
  FlaskConical,
  MapPin,
  History,
  Inbox,
  ExternalLink,
  Info,
  Package,
  Lock,
} from "lucide-react";

// ─── HELPERS ───────────────────────────────────────────────────────────────────

const SHIPMENT_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING_DISPATCH:  { label: "Pending Dispatch",  cls: "text-slate-400 bg-slate-400/10 border-slate-400/20" },
  IN_TRANSIT:        { label: "In Transit",        cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  DELIVERED:         { label: "Delivered",          cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  QUARANTINED:       { label: "Quarantined",        cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  REJECTED:          { label: "Rejected",           cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  REFINERY_RECEIVED: { label: "Refinery Received",  cls: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
};

const VERIFICATION_BADGE: Record<string, { label: string; cls: string }> = {
  VERIFIED: { label: "Verified", cls: "text-emerald-400 bg-emerald-400/10" },
  PENDING:  { label: "Pending",  cls: "text-amber-400 bg-amber-400/10" },
  FAILED:   { label: "Failed",   cls: "text-red-400 bg-red-400/10" },
};

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });
}

function shortHash(h: string | null): string {
  if (!h) return "—";
  return h.slice(0, 12) + "…";
}

function Section({ icon: Icon, title, children, count }: {
  icon: typeof Shield; title: string; children: React.ReactNode; count?: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface-2">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Icon className="h-4 w-4 text-text-faint" />
        <h2 className="text-sm font-semibold text-text tracking-tight">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-text-faint">{count}</span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-text-faint/50">
      <Inbox className="h-4 w-4" />
      {message}
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────

export default function ShipmentReviewUI({ data }: { data: ShipmentDetailData }) {
  const { shipment, supplierSubject, refinerySubject, custodyEvents, linkedLots, linkedCases, auditEvents, gaps } = data;
  const sBadge = SHIPMENT_STATUS_BADGE[shipment.shipmentStatus] ?? SHIPMENT_STATUS_BADGE.PENDING_DISPATCH;

  return (
    <RequireRole allowedRoles={["admin", "compliance", "treasury", "vault_ops"]}>
      <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Link href="/compliance/inbox" className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-text transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Back to Inbox
        </Link>

        {/* ═══ 1. SHIPMENT HEADER ═══ */}
        <div className="rounded-lg border border-border bg-surface-2 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Truck className="h-5 w-5 text-text-faint" />
                <h1 className="text-lg font-semibold text-text tracking-tight">Physical Shipment Review</h1>
                <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold", sBadge.cls)}>
                  {sBadge.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-text-faint tabular-nums flex-wrap">
                <span>ID: <span className="font-mono tracking-wider">{shipment.id.slice(0, 12)}</span></span>
                <span>Mine Ref: <span className="font-medium text-text-muted">{shipment.mineReference}</span></span>
                <span>Origin: <span className="font-medium text-text-muted">{shipment.originCountry}</span></span>
                <span>Carrier: <span className="font-medium text-text-muted">{shipment.armoredCarrierName}</span></span>
                {shipment.brinksReference && <span>Brink&apos;s: <span className="font-mono text-text-muted">{shipment.brinksReference}</span></span>}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-text-faint tabular-nums flex-wrap">
                <span>Dispatched: {fmtDate(shipment.dispatchedAt)}</span>
                <span>Delivered: {fmtDate(shipment.deliveredAt)}</span>
                <span>Created: {fmtDate(shipment.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 2. SUPPLIER / REFINERY SUMMARY ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Supplier (Mine)</h3>
            </div>
            <p className="text-sm font-medium text-text">{supplierSubject.legalName}</p>
            <p className="text-[10px] text-text-faint uppercase tracking-wider mt-0.5">{supplierSubject.subjectType} · {supplierSubject.status}</p>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Destination Refinery</h3>
            </div>
            {refinerySubject ? (
              <>
                <p className="text-sm font-medium text-text">{refinerySubject.legalName}</p>
                <p className="text-[10px] text-text-faint uppercase tracking-wider mt-0.5">{refinerySubject.subjectType} · {refinerySubject.status}</p>
              </>
            ) : (
              <p className="text-xs text-text-faint/50">No refinery subject linked</p>
            )}
          </div>
        </div>

        {/* ═══ 3. CHAIN-OF-CUSTODY TIMELINE ═══ */}
        <Section icon={Lock} title="Chain of Custody" count={custodyEvents.length}>
          {custodyEvents.length === 0 ? (
            <EmptyState message="No chain-of-custody events recorded." />
          ) : (
            <div className="relative pl-4 border-l-2 border-border space-y-3">
              {custodyEvents.map((e) => {
                const vBadge = VERIFICATION_BADGE[e.verificationStatus] ?? VERIFICATION_BADGE.PENDING;
                return (
                  <div key={e.id} className="relative">
                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-border bg-surface-2" />
                    <div className="rounded border border-border/30 bg-surface-3/30 px-3 py-2">
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text">{e.eventType}</span>
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", vBadge.cls)}>
                            {vBadge.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-text-faint tabular-nums">{fmtDate(e.eventTimestamp)}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1.5 text-[10px]">
                        {e.location && (
                          <div className="flex items-center gap-1 text-text-faint">
                            <MapPin className="h-3 w-3" />
                            {e.location}
                          </div>
                        )}
                        {e.partyFrom && <div className="text-text-faint">From: <span className="text-text-muted">{e.partyFrom}</span></div>}
                        {e.partyTo && <div className="text-text-faint">To: <span className="text-text-muted">{e.partyTo}</span></div>}
                        {e.sealNumber && <div className="text-text-faint">Seal: <span className="font-mono text-text-muted">{e.sealNumber}</span></div>}
                      </div>
                      {e.notes && <p className="mt-1.5 text-[10px] text-text-faint italic border-l-2 border-border pl-2">{e.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ═══ 4. LINKED OBJECTS ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Refinery Lots</h3>
            </div>
            {linkedLots.length === 0 ? (
              <p className="text-xs text-text-faint/50">No refinery lots created from this shipment</p>
            ) : (
              <div className="space-y-2">
                {linkedLots.map((l) => (
                  <Link key={l.id} href={`/compliance/lots/${l.id}`} className="flex items-center justify-between rounded border border-border/50 bg-surface-3/50 px-3 py-2 text-xs hover:bg-surface-3 transition-colors">
                    <div>
                      <p className="font-medium text-text">Lot {l.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-text-faint">{l.assayStatus}{l.payableGoldWeight && ` · ${l.payableGoldWeight}oz payable`}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-text-faint" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Compliance Cases</h3>
            </div>
            {linkedCases.length === 0 ? (
              <p className="text-xs text-text-faint/50">No compliance cases linked</p>
            ) : (
              <div className="space-y-2">
                {linkedCases.map((c) => (
                  <Link key={c.id} href={`/compliance/inbox/${c.id}`} className="flex items-center justify-between rounded border border-border/50 bg-surface-3/50 px-3 py-2 text-xs hover:bg-surface-3 transition-colors">
                    <div>
                      <p className="font-medium text-text">{c.caseType}</p>
                      <p className="text-[10px] text-text-faint">{c.status} · P{c.priority}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-text-faint" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ 5. AUDIT TIMELINE ═══ */}
        <Section icon={History} title="Audit Timeline" count={auditEvents.length}>
          {auditEvents.length === 0 ? (
            <EmptyState message="No audit events recorded for this shipment." />
          ) : (
            <div className="relative pl-4 border-l-2 border-border space-y-3">
              {auditEvents.map((e) => (
                <div key={e.id} className="relative">
                  <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-border bg-surface-2" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text">{e.eventType}</p>
                      <p className="text-[10px] text-text-faint">{e.aggregateType} · <span className="font-mono tracking-wider">{shortHash(e.hash)}</span></p>
                    </div>
                    <span className="text-[10px] text-text-faint tabular-nums whitespace-nowrap shrink-0">{fmtDate(e.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ═══ BACKEND GAPS ═══ */}
        {gaps.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Backend Integration Notes</h3>
            </div>
            <ul className="space-y-1">
              {gaps.map((g, i) => <li key={i} className="text-xs text-amber-400/80">• {g}</li>)}
            </ul>
          </div>
        )}
      </div>
    </RequireRole>
  );
}
