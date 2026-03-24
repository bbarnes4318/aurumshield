"use client";

/* ================================================================
   SETTLEMENT AUTHORIZATION UI — Payment Authorization Review
   ================================================================
   Settlement happens AFTER refinery truth is known. This view
   presents the authorization verdict, linked lot economics,
   buyer/payment context, and decision integrity for operator review.

   6-Gate Pipeline: The settlement service evaluates 6 gates at
   authorization time but only the final verdict is persisted.
   Individual gate results require a co_settlement_gates table.

   Sections:
     1. Authorization Header / Summary
     2. Settlement Gate Summary (best-effort from available data)
     3. Linked Refinery Truth Panel
     4. Buyer / Payment Context
     5. Decision Integrity
     6. Audit Timeline
     7. Backend Gaps
   ================================================================ */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { RequireRole } from "@/components/auth/require-role";
import type { SettlementDetailData } from "@/actions/compliance-queries";
import {
  ArrowLeft,
  Shield,
  FlaskConical,
  Landmark,
  Users,
  CheckCircle2,
  XCircle,
  History,
  Inbox,
  ExternalLink,
  Info,
  Hash,
  CreditCard,
} from "lucide-react";

// ─── HELPERS ───────────────────────────────────────────────────────────────────

const VERDICT_BADGE: Record<string, { label: string; cls: string }> = {
  AUTHORIZED:         { label: "Authorized",          cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  DENIED:             { label: "Denied",              cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  PENDING:            { label: "Pending",             cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  EXPIRED:            { label: "Expired",             cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20" },
  CONDITIONAL:        { label: "Conditional",         cls: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
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
  return h.slice(0, 16) + "…";
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

// ─── GATE STATUS CARD ──────────────────────────────────────────────────────────

function GateCard({ gate, label, available, pass }: {
  gate: number; label: string; available: boolean; pass?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3 text-center",
      !available ? "border-border/30 bg-surface-3/10" :
      pass ? "border-emerald-500/20 bg-emerald-500/5" :
      "border-red-500/20 bg-red-500/5",
    )}>
      <p className="text-[10px] text-text-faint mb-1">Gate {gate}</p>
      <p className="text-xs font-semibold text-text tracking-tight mb-0.5">{label}</p>
      {!available ? (
        <span className="text-[10px] text-text-faint/40">No data</span>
      ) : pass ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400 mx-auto" />
      )}
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────

export default function SettlementAuthUI({ data }: { data: SettlementDetailData }) {
  const { authorization, lot, buyerSubject, complianceCase, policySnapshot, auditEvents, gaps } = data;
  const vBadge = VERDICT_BADGE[authorization.verdict] ?? VERDICT_BADGE.PENDING;

  // Derive best-effort gate status from available data
  const isAuthorized = authorization.verdict === "AUTHORIZED";

  return (
    <RequireRole allowedRoles={["admin", "compliance", "treasury", "vault_ops"]}>
      <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Link href="/compliance/inbox" className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-text transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Back to Inbox
        </Link>

        {/* ═══ 1. AUTHORIZATION HEADER ═══ */}
        <div className="rounded-lg border border-border bg-surface-2 p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <Landmark className="h-5 w-5 text-text-faint" />
              <h1 className="text-lg font-semibold text-text tracking-tight">Settlement Authorization</h1>
              <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold", vBadge.cls)}>
                {vBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-text-faint tabular-nums flex-wrap">
              <span>ID: <span className="font-mono tracking-wider">{authorization.id.slice(0, 12)}</span></span>
              <span>Payment Rail: <span className="font-medium text-text-muted">{authorization.paymentRail}</span></span>
              <span>Payable: <span className="font-bold text-text">${authorization.payableValue}</span></span>
              {authorization.authorizedAt && <span>Authorized: {fmtDate(authorization.authorizedAt)}</span>}
              {authorization.expiresAt && <span>Expires: {fmtDate(authorization.expiresAt)}</span>}
              <span>Created: {fmtDate(authorization.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* ═══ 2. SETTLEMENT GATE SUMMARY ═══ */}
        <Section icon={Shield} title="6-Gate Pipeline Summary">
          <p className="text-[10px] text-text-faint mb-3">
            Gate-level results derived from available data. Individual gate pass/fail detail requires a dedicated <code className="font-mono">co_settlement_gates</code> table.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <GateCard gate={1} label="Custody Chain" available={false} />
            <GateCard gate={2} label="Refinery Lot" available={!!lot} pass={!!lot && lot.assayStatus === "COMPLETE"} />
            <GateCard gate={3} label="Assay Complete" available={!!lot} pass={!!lot && !!lot.payableValue} />
            <GateCard gate={4} label="Supplier Screening" available={false} />
            <GateCard gate={5} label="Buyer Screening" available={!!buyerSubject} pass={!!buyerSubject && buyerSubject.status === "ACTIVE"} />
            <GateCard gate={6} label="Policy Gate" available={isAuthorized} pass={isAuthorized} />
          </div>
        </Section>

        {/* ═══ 3. LINKED REFINERY TRUTH ═══ */}
        <Section icon={FlaskConical} title="Refinery Truth">
          {lot ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="typo-label text-text-faint mb-1">Assay Status</p>
                  <p className="text-sm font-medium text-text">{lot.assayStatus}</p>
                </div>
                <div>
                  <p className="typo-label text-text-faint mb-1">Payable Gold</p>
                  <p className="text-sm font-bold tabular-nums text-text">{lot.payableGoldWeight ?? "—"} <span className="text-text-faint font-normal">oz</span></p>
                </div>
                <div>
                  <p className="typo-label text-text-faint mb-1">Payable Value</p>
                  <p className="text-sm font-bold tabular-nums text-gold">{lot.payableValue ? `$${lot.payableValue}` : "—"}</p>
                </div>
                <div>
                  <p className="typo-label text-text-faint mb-1">Settlement Ready</p>
                  <span className={cn(
                    "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                    lot.settlementReady ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10",
                  )}>{lot.settlementReady ? "YES" : "NO"}</span>
                </div>
              </div>
              <Link href={`/compliance/lots/${lot.id}`} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors">
                View full lot detail <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <EmptyState message="No refinery lot linked to this authorization." />
          )}
        </Section>

        {/* ═══ 4. BUYER / PAYMENT CONTEXT ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Buyer</h3>
            </div>
            {buyerSubject ? (
              <div>
                <p className="text-sm font-medium text-text">{buyerSubject.legalName}</p>
                <p className="text-[10px] text-text-faint uppercase tracking-wider mt-0.5">{buyerSubject.subjectType} · {buyerSubject.status}</p>
                <p className="text-[10px] text-text-faint mt-1">Risk Tier: <span className="font-mono">{buyerSubject.riskTier}</span></p>
              </div>
            ) : (
              <p className="text-xs text-text-faint/50">No buyer subject linked</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Payment</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="typo-label text-text-faint mb-1">Payment Rail</p>
                <p className="text-sm font-medium text-text">{authorization.paymentRail}</p>
              </div>
              <div>
                <p className="typo-label text-text-faint mb-1">Payable Value</p>
                <p className="text-sm font-bold tabular-nums text-text">${authorization.payableValue}</p>
              </div>
            </div>
            {complianceCase && (
              <Link href={`/compliance/inbox/${complianceCase.id}`} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors mt-3">
                View compliance case <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* ═══ 5. DECISION INTEGRITY ═══ */}
        <Section icon={Hash} title="Decision Integrity">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="typo-label text-text-faint mb-1">Decision Hash</p>
              <p className="font-mono text-xs text-text-muted break-all">{authorization.decisionHash}</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="typo-label text-text-faint mb-1">Policy Snapshot</p>
                {policySnapshot ? (
                  <p className="text-xs text-text-muted">Version <span className="font-bold">{policySnapshot.version}</span> · Effective: {fmtDate(policySnapshot.effectiveAt)}</p>
                ) : (
                  <p className="text-xs text-text-faint/50">{authorization.policySnapshotId?.slice(0, 8) ?? "—"}</p>
                )}
              </div>
              <div>
                <p className="typo-label text-text-faint mb-1">Timestamps</p>
                <div className="flex items-center gap-4 text-xs text-text-muted tabular-nums">
                  <span>Created: {fmtDate(authorization.createdAt)}</span>
                  {authorization.authorizedAt && <span>Authorized: {fmtDate(authorization.authorizedAt)}</span>}
                  {authorization.expiresAt && <span>Expires: {fmtDate(authorization.expiresAt)}</span>}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ 6. AUDIT TIMELINE ═══ */}
        <Section icon={History} title="Audit Timeline" count={auditEvents.length}>
          {auditEvents.length === 0 ? (
            <EmptyState message="No audit events recorded for this authorization." />
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
