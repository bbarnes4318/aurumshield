"use client";

/* ================================================================
   DEMO FLOW TIMELINE — Institutional settlement lifecycle rendering
   
   Reads real data from settlement + certificate stores.
   Displays canonical institutional step labels, UTC timestamps,
   actor role labels. No raw ledger IDs in primary view.
   No animations, no retail iconography.
   ================================================================ */

import { useState } from "react";
import { useSettlementLedger } from "@/hooks/use-mock-queries";
import { getCertificateBySettlementId } from "@/lib/certificate-engine";

interface DemoFlowTimelineProps {
  settlementId: string;
}

/** Canonical institutional step labels — keyed by ledger entry type. */
const STEP_LABELS: Record<string, string> = {
  ESCROW_OPENED: "Settlement Opened",
  FUNDS_DEPOSITED: "Funds Confirmed Final",
  GOLD_ALLOCATED: "Gold Allocated to Vault Account",
  VERIFICATION_PASSED: "Compliance Verification Cleared",
  AUTHORIZATION: "Settlement Authorized",
  SETTLEMENT_AUTHORIZED: "Settlement Authorized",
  DVP_EXECUTED: "Delivery versus Payment Executed",
  ESCROW_CLOSED: "Escrow Closed",
  FUNDS_RELEASED: "Funds Released",
  GOLD_RELEASED: "Gold Released",
};

/** Map actor roles to institutional labels. */
const ACTOR_LABELS: Record<string, string> = {
  admin: "Clearing Authority",
  treasury: "Treasury",
  vault_ops: "Vault Ops",
  compliance: "Compliance",
  buyer: "Buyer",
  seller: "Seller",
  system: "System",
  SYSTEM: "System",
};

/** Format ISO timestamp to institutional format: DD MMM YYYY · HH:MM UTC */
function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mon = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${mon} ${year} · ${hours}:${mins} UTC`;
}

export function DemoFlowTimeline({ settlementId }: DemoFlowTimelineProps) {
  const { data: ledgerEntries, isLoading } = useSettlementLedger(settlementId);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="card-base p-4">
        <p className="text-xs text-text-faint">Loading settlement ledger…</p>
      </div>
    );
  }

  if (!ledgerEntries || ledgerEntries.length === 0) {
    return (
      <div className="card-base p-4">
        <p className="text-xs text-text-faint">No ledger entries available.</p>
      </div>
    );
  }

  // Check for certificate
  const certificate = getCertificateBySettlementId(settlementId);

  return (
    <div className="card-base p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">
          Settlement Lifecycle
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
          {ledgerEntries.length + (certificate ? 1 : 0)} Steps
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {ledgerEntries.map((entry, idx) => {
          const isLast = idx === ledgerEntries.length - 1 && !certificate;
          const isExpanded = expandedEntry === entry.id;
          const actorLabel = ACTOR_LABELS[entry.actorRole] ?? ACTOR_LABELS[entry.actor] ?? entry.actorRole;
          const stepLabel = STEP_LABELS[entry.type] ?? entry.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <div key={entry.id} className="flex gap-3">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-success/40 bg-success/10">
                  <svg className="h-2.5 w-2.5 text-success" fill="currentColor" viewBox="0 0 8 8">
                    <path d="M6.41 1L2.64 4.63 1.18 3.22 0 4.4l2.64 2.6L7.59 2.18z" />
                  </svg>
                </div>
                {!isLast && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>

              {/* Step content */}
              <div className="pb-4 pt-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-text">
                    {stepLabel}
                  </span>
                  <span className="text-[10px] text-text-faint">
                    {actorLabel}
                  </span>
                </div>
                <div className="mt-0.5">
                  <span className="typo-mono text-[10px] text-text-faint">
                    {fmtTimestamp(entry.timestamp)}
                  </span>
                </div>
                {/* Expandable details — ledger entry ID hidden from primary view */}
                <button
                  onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                  className="mt-1 text-[9px] text-text-faint/60 hover:text-text-faint transition-colors"
                >
                  {isExpanded ? "Hide Details" : "Details"}
                </button>
                {isExpanded && (
                  <div className="mt-1 rounded border border-border/50 bg-surface-2 px-2.5 py-1.5">
                    <div className="text-[9px] text-text-faint space-y-0.5">
                      <div><span className="text-text-faint/60">Entry ID:</span> <span className="typo-mono">{entry.id}</span></div>
                      <div><span className="text-text-faint/60">Actor:</span> <span className="typo-mono">{entry.actorUserId ?? entry.actor}</span></div>
                      {entry.detail && (
                        <div><span className="text-text-faint/60">Detail:</span> <span className="typo-mono">{entry.detail}</span></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Certificate issued step (if exists) */}
        {certificate && (
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
                <svg className="h-2.5 w-2.5 text-gold" fill="currentColor" viewBox="0 0 8 8">
                  <path d="M6.41 1L2.64 4.63 1.18 3.22 0 4.4l2.64 2.6L7.59 2.18z" />
                </svg>
              </div>
            </div>
            <div className="pb-1 pt-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-gold">
                  Clearing Certificate Issued
                </span>
                <span className="text-[10px] text-text-faint">System</span>
              </div>
              <div className="mt-0.5">
                <span className="typo-mono text-[10px] text-text-faint">
                  {fmtTimestamp(certificate.issuedAt)}
                </span>
              </div>
              <div className="mt-1">
                <span className="typo-mono text-[10px] text-gold/70">
                  {certificate.certificateNumber}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pending: Clearing Certificate (if not yet issued) */}
        {!certificate && (
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2">
                <div className="h-1.5 w-1.5 rounded-full bg-text-faint/40" />
              </div>
            </div>
            <div className="pb-1 pt-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-text-faint">
                  Clearing Certificate Issued
                </span>
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-surface-2 text-text-faint border border-border">
                  Pending
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
