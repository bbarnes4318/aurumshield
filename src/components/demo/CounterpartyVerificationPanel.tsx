/* ================================================================
   COUNTERPARTY VERIFICATION PANEL

   Split-view verification checks for buyer + seller entities.
   Animated sequential check reveals (<400ms each).
   Includes: Entity Match, UBO, Sanctions, PEP, Source of Funds,
   AML Risk Score with Low/Medium/High banding,
   and "Clearing Eligible" conclusion banner.
   ================================================================ */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  FileSearch,
  ExternalLink,
} from "lucide-react";

interface VerificationCheck {
  label: string;
  status: "pass" | "pending";
}

const BUYER_CHECKS: VerificationCheck[] = [
  { label: "Entity Match", status: "pass" },
  { label: "UBO Confirmed", status: "pass" },
  { label: "Sanctions Screen", status: "pass" },
  { label: "PEP Screen", status: "pass" },
  { label: "Source of Funds", status: "pass" },
];

const SELLER_CHECKS: VerificationCheck[] = [
  { label: "Entity Match", status: "pass" },
  { label: "UBO Confirmed", status: "pass" },
  { label: "Sanctions Screen", status: "pass" },
  { label: "PEP Screen", status: "pass" },
  { label: "Vault Attestation", status: "pass" },
];

function getRiskBand(score: number): { label: string; color: string } {
  if (score <= 25) return { label: "Low", color: "text-success" };
  if (score <= 60) return { label: "Medium", color: "text-warning" };
  return { label: "High", color: "text-danger" };
}

function VerificationColumn({
  title,
  orgName,
  checks,
  riskScore,
  revealedCount,
}: {
  title: string;
  orgName: string;
  checks: VerificationCheck[];
  riskScore: number;
  revealedCount: number;
}) {
  const band = getRiskBand(riskScore);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-faint">
          {title}
        </span>
      </div>
      <p className="text-xs font-medium text-text mb-2">{orgName}</p>
      <div className="space-y-1.5" data-tour="verification-sequence">
        {checks.map((check, idx) => {
          const isRevealed = idx < revealedCount;
          return (
            <div
              key={check.label}
              className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
                isRevealed ? "opacity-100" : "opacity-0"
              }`}
            >
              <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
              <span className="text-text-muted">{check.label}</span>
              <span className="ml-auto text-[10px] font-mono text-success">
                PASS
              </span>
            </div>
          );
        })}
      </div>
      {revealedCount >= checks.length && (
        <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
          <span className="text-[10px] uppercase tracking-wider text-text-faint">
            AML Risk Score
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-text">
              {riskScore}/100
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${band.color}`}>
              {band.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface CounterpartyVerificationPanelProps {
  buyerOrg?: string;
  sellerOrg?: string;
  /** Callback when "Open Verification Report" is clicked */
  onOpenReport?: () => void;
}

export function CounterpartyVerificationPanel({
  buyerOrg = "Meridian Capital Partners LLC",
  sellerOrg = "Helvetia Precious Metals AG",
  onOpenReport,
}: CounterpartyVerificationPanelProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const totalChecks = Math.max(BUYER_CHECKS.length, SELLER_CHECKS.length);

  useEffect(() => {
    if (revealedCount >= totalChecks) return;
    const timer = setTimeout(
      () => setRevealedCount((c) => c + 1),
      350, // <400ms per check
    );
    return () => clearTimeout(timer);
  }, [revealedCount, totalChecks]);

  const allRevealed = revealedCount >= totalChecks;

  const handleOpenReport = useCallback(() => {
    onOpenReport?.();
  }, [onOpenReport]);

  return (
    <div
      className="card-base border border-border p-5 space-y-4"
      data-tour="counterparty-verification"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileSearch className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text">
          Counterparty Verification
        </h3>
      </div>

      {/* Two-column verification */}
      <div className="grid grid-cols-2 gap-6">
        <VerificationColumn
          title="Buyer"
          orgName={buyerOrg}
          checks={BUYER_CHECKS}
          riskScore={12}
          revealedCount={revealedCount}
        />
        <VerificationColumn
          title="Seller"
          orgName={sellerOrg}
          checks={SELLER_CHECKS}
          riskScore={8}
          revealedCount={revealedCount}
        />
      </div>

      {/* Final verdict */}
      {allRevealed && (
        <div className="rounded-sm border border-success/20 bg-success/5 px-3 py-2 text-center">
          <p className="text-xs font-semibold text-success">
            Counterparties Verified — Clearing Eligible
          </p>
        </div>
      )}

      {/* Explicit CTA for tour click gating */}
      <button
        data-tour="verification-continue"
        onClick={handleOpenReport}
        className="flex items-center justify-center gap-2 w-full rounded-sm border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-muted hover:bg-surface-3 hover:text-text transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        Open Verification Report
      </button>
    </div>
  );
}
