"use client";

/* ================================================================
   DEMO FLOW TIMELINE — Reads real data from settlement + certificate stores
   
   Displays the full settlement lifecycle from REAL ledger entries.
   Never hardcodes steps — all data derived from actual store state.
   ================================================================ */

import { useSettlementLedger } from "@/hooks/use-mock-queries";
import { getCertificateBySettlementId } from "@/lib/certificate-engine";

interface DemoFlowTimelineProps {
  settlementId: string;
}

/** Map ledger entry types to human-readable step labels. */
const STEP_LABELS: Record<string, string> = {
  ESCROW_OPENED: "Settlement Opened",
  FUNDS_DEPOSITED: "Funds Confirmed",
  GOLD_ALLOCATED: "Gold Allocated",
  VERIFICATION_PASSED: "Verification Cleared",
  AUTHORIZATION: "Authorized",
  DVP_EXECUTED: "DvP Executed",
  ESCROW_CLOSED: "Escrow Closed",
  SETTLEMENT_AUTHORIZED: "Settlement Authorized",
  FUNDS_RELEASED: "Funds Released",
  GOLD_RELEASED: "Gold Released",
};

/** Map actor roles to institutional labels. */
const ACTOR_LABELS: Record<string, string> = {
  admin: "Clearing Authority",
  treasury: "Treasury Operations",
  vault_ops: "Vault Operations",
  compliance: "Compliance Officer",
  buyer: "Buyer",
  seller: "Seller",
};

export function DemoFlowTimeline({ settlementId }: DemoFlowTimelineProps) {
  const { data: ledgerEntries, isLoading } = useSettlementLedger(settlementId);

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
        <span className="typo-mono text-xs text-text-faint">{settlementId}</span>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {ledgerEntries.map((entry, idx) => {
          const isLast = idx === ledgerEntries.length - 1 && !certificate;
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
              <div className="pb-4 pt-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-text">
                    {STEP_LABELS[entry.type] ?? entry.type}
                  </span>
                  <span className="text-[10px] text-text-faint">
                    {ACTOR_LABELS[entry.actorRole] ?? entry.actorRole}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-3">
                  <span className="typo-mono text-[10px] text-text-faint">
                    {new Date(entry.timestamp).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </span>
                  <span className="typo-mono text-[10px] text-text-faint">
                    {entry.id}
                  </span>
                </div>
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
            <div className="pb-1 pt-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-gold">
                  Clearing Certificate Issued
                </span>
                <span className="text-[10px] text-text-faint">System</span>
              </div>
              <div className="mt-0.5 flex items-center gap-3">
                <span className="typo-mono text-[10px] text-text-faint">
                  {new Date(certificate.issuedAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })}
                </span>
                <span className="typo-mono text-[10px] text-gold/70">
                  {certificate.certificateNumber}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
