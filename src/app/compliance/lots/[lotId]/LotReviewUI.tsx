"use client";

/* ================================================================
   REFINERY LOT REVIEW UI — Commercial Truth Object
   ================================================================
   The refinery lot is the SINGLE SOURCE OF TRUTH for the economic
   value of gold. The buyer pays ONLY for assay-confirmed payable
   output. This view makes the assay economics the central focus.

   Sections:
     1. Lot Header / Summary
     2. Assay Economics Panel (THE COMMERCIAL TRUTH)
     3. Lot Match / Intake Context
     4. Settlement Readiness
     5. Linked Settlement Authorization
     6. Audit Timeline
     7. Backend Gaps
   ================================================================ */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { RequireRole } from "@/components/auth/require-role";
import type { LotDetailData } from "@/actions/compliance-queries";
import {
  ArrowLeft,
  Shield,
  FlaskConical,
  Truck,
  Landmark,
  CheckCircle2,
  History,
  Inbox,
  ExternalLink,
  Info,
  Scale,
} from "lucide-react";

// ─── HELPERS ───────────────────────────────────────────────────────────────────

const ASSAY_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING:            { label: "Pending Receipt",    cls: "text-slate-400 bg-slate-400/10 border-slate-400/20" },
  RECEIVED:           { label: "Received",           cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  UNDER_ASSAY:        { label: "Under Assay",        cls: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  COMPLETE:           { label: "Assay Complete",      cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  ASSAY_EXCEPTION:    { label: "Assay Exception",    cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  QUARANTINED:        { label: "Quarantined",         cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  SETTLEMENT_READY:   { label: "Settlement Ready",    cls: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
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

// ─── ASSAY METRIC CARD ─────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, highlight }: {
  label: string; value: string | null; unit?: string; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-4 text-center",
      highlight
        ? "border-gold/30 bg-gold/5"
        : "border-border bg-surface-3/30",
    )}>
      <p className="typo-label text-text-faint mb-1.5">{label}</p>
      <p className={cn(
        "text-xl font-bold tabular-nums tracking-tight",
        highlight ? "text-gold" : value ? "text-text" : "text-text-faint/30",
      )}>
        {value ?? "—"}
      </p>
      {unit && value && <p className="text-[10px] text-text-faint mt-0.5">{unit}</p>}
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────

export default function LotReviewUI({ data }: { data: LotDetailData }) {
  const { lot, shipment, supplierSubject, refinerySubject, intakeCase, linkedSettlements, auditEvents, gaps } = data;
  const aBadge = ASSAY_STATUS_BADGE[lot.assayStatus] ?? ASSAY_STATUS_BADGE.PENDING;

  return (
    <RequireRole allowedRoles={["admin", "compliance", "treasury", "vault_ops"]}>
      <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Link href="/compliance/inbox" className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-text transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Back to Inbox
        </Link>

        {/* ═══ 1. LOT HEADER ═══ */}
        <div className="rounded-lg border border-border bg-surface-2 p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <FlaskConical className="h-5 w-5 text-text-faint" />
              <h1 className="text-lg font-semibold text-text tracking-tight">Refinery Lot Review</h1>
              <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold", aBadge.cls)}>
                {aBadge.label}
              </span>
              {lot.settlementReady && (
                <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase">Settlement Ready</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-[10px] text-text-faint tabular-nums flex-wrap">
              <span>ID: <span className="font-mono tracking-wider">{lot.id.slice(0, 12)}</span></span>
              {lot.receivedAt && <span>Received: {fmtDate(lot.receivedAt)}</span>}
              <span>Created: {fmtDate(lot.createdAt)}</span>
              {lot.assayCertificateRef && <span>Cert: <span className="font-mono">{lot.assayCertificateRef}</span></span>}
            </div>
          </div>
        </div>

        {/* ═══ 2. ASSAY ECONOMICS — THE COMMERCIAL TRUTH ═══ */}
        <div className="rounded-lg border-2 border-gold/20 bg-surface-2 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold text-gold tracking-tight uppercase">Assay Economics — Commercial Truth</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Gross Weight" value={lot.grossWeight} unit="troy oz" />
            <MetricCard label="Net Weight" value={lot.netWeight} unit="troy oz" />
            <MetricCard label="Fineness" value={lot.fineness} unit="purity factor" />
            <MetricCard label="Recoverable Gold" value={lot.recoverableGoldWeight} unit="troy oz" />
            <MetricCard label="Payable Gold" value={lot.payableGoldWeight} unit="troy oz" highlight />
            <MetricCard label="Payable Value" value={lot.payableValue ? `$${lot.payableValue}` : null} highlight />
          </div>
        </div>

        {/* ═══ 3. LOT MATCH / INTAKE CONTEXT ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Source Shipment</h3>
            </div>
            {shipment ? (
              <Link href={`/compliance/shipments/${shipment.id}`} className="flex items-center justify-between rounded border border-border/50 bg-surface-3/50 px-3 py-2 text-xs hover:bg-surface-3 transition-colors">
                <div>
                  <p className="font-medium text-text">{shipment.mineReference}</p>
                  <p className="text-[10px] text-text-faint">{shipment.shipmentStatus} · {shipment.armoredCarrierName}</p>
                </div>
                <ExternalLink className="h-3 w-3 text-text-faint" />
              </Link>
            ) : (
              <p className="text-xs text-text-faint/50">No shipment linked</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Subjects</h3>
            </div>
            <div className="space-y-2">
              {supplierSubject && (
                <div className="text-xs">
                  <p className="text-text-faint">Supplier: <span className="font-medium text-text">{supplierSubject.legalName}</span></p>
                </div>
              )}
              {refinerySubject && (
                <div className="text-xs">
                  <p className="text-text-faint">Refinery: <span className="font-medium text-text">{refinerySubject.legalName}</span></p>
                </div>
              )}
              {!supplierSubject && !refinerySubject && <p className="text-xs text-text-faint/50">No subjects linked</p>}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Intake Case</h3>
            </div>
            {intakeCase ? (
              <Link href={`/compliance/inbox/${intakeCase.id}`} className="flex items-center justify-between rounded border border-border/50 bg-surface-3/50 px-3 py-2 text-xs hover:bg-surface-3 transition-colors">
                <div>
                  <p className="font-medium text-text">{intakeCase.caseType}</p>
                  <p className="text-[10px] text-text-faint">{intakeCase.status} · P{intakeCase.priority}</p>
                </div>
                <ExternalLink className="h-3 w-3 text-text-faint" />
              </Link>
            ) : (
              <p className="text-xs text-text-faint/50">No intake case linked</p>
            )}
          </div>
        </div>

        {/* ═══ 4. SETTLEMENT READINESS ═══ */}
        <Section icon={CheckCircle2} title="Settlement Readiness">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="typo-label text-text-faint mb-1">Assay Status</p>
              <span className={cn("inline-block rounded border px-2 py-0.5 text-[11px] font-semibold", aBadge.cls)}>{aBadge.label}</span>
            </div>
            <div>
              <p className="typo-label text-text-faint mb-1">Settlement Ready</p>
              <span className={cn(
                "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                lot.settlementReady ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10",
              )}>{lot.settlementReady ? "YES" : "NO"}</span>
            </div>
            <div>
              <p className="typo-label text-text-faint mb-1">Payable Determined</p>
              <span className={cn(
                "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                lot.payableValue ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10",
              )}>{lot.payableValue ? "YES" : "PENDING"}</span>
            </div>
            <div>
              <p className="typo-label text-text-faint mb-1">Assay Certificate</p>
              <span className={cn(
                "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                lot.assayCertificateRef ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10",
              )}>{lot.assayCertificateRef ? "ATTACHED" : "MISSING"}</span>
            </div>
          </div>
        </Section>

        {/* ═══ 5. LINKED SETTLEMENTS ═══ */}
        <Section icon={Landmark} title="Settlement Authorizations" count={linkedSettlements.length}>
          {linkedSettlements.length === 0 ? (
            <EmptyState message="No settlement authorizations linked to this lot." />
          ) : (
            <div className="space-y-2">
              {linkedSettlements.map((sa) => (
                <Link key={sa.id} href={`/compliance/settlements/${sa.id}`} className="flex items-center justify-between rounded border border-border/50 bg-surface-3/50 px-3 py-2 text-xs hover:bg-surface-3 transition-colors">
                  <div>
                    <p className="font-medium text-text">{sa.verdict}</p>
                    <p className="text-[10px] text-text-faint">{sa.paymentRail} · ${sa.payableValue}</p>
                  </div>
                  <ExternalLink className="h-3 w-3 text-text-faint" />
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* ═══ 6. AUDIT TIMELINE ═══ */}
        <Section icon={History} title="Audit Timeline" count={auditEvents.length}>
          {auditEvents.length === 0 ? (
            <EmptyState message="No audit events recorded for this lot." />
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
