"use client";

import { cn } from "@/lib/utils";
import type { VerificationCase, EvidenceItem } from "@/lib/mock-data";
import { EvidenceCard } from "@/components/ui/evidence-card";
import { mockKycProvider, mockAmlProvider } from "@/lib/kyc-adapters";
import { getOrg } from "@/lib/auth-store";
import { getEvidenceStore } from "@/lib/verification-engine";
import { CheckCircle2, XCircle, AlertTriangle, FileSearch } from "lucide-react";

const OUTCOME_COLORS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  PASS: { icon: CheckCircle2, color: "text-success" },
  CLEAR: { icon: CheckCircle2, color: "text-success" },
  FAIL: { icon: XCircle, color: "text-danger" },
  CONFIRMED_MATCH: { icon: XCircle, color: "text-danger" },
  REVIEW: { icon: AlertTriangle, color: "text-warning" },
  POSSIBLE_MATCH: { icon: AlertTriangle, color: "text-warning" },
};

interface DecisionPanelProps {
  verificationCase: VerificationCase;
  userId: string;
  orgId: string;
  className?: string;
}

export function DecisionPanel({ verificationCase: vc, userId, orgId, className }: DecisionPanelProps) {
  const org = getOrg(orgId);

  // Run adapter checks (deterministic, no side effects)
  const kycIdResult = mockKycProvider.verifyIdentityDocument(userId, orgId);
  const kycLivenessResult = mockKycProvider.verifyLiveness(userId);
  const amlSanctionsResult = mockAmlProvider.screenSanctions(org?.legalName ?? userId, orgId);
  const amlPepResult = mockAmlProvider.screenPEP(org?.legalName ?? userId, orgId);

  const adapterResults = [
    { label: "ID Document Check", ...kycIdResult },
    { label: "Liveness Verification", ...kycLivenessResult },
    { label: "Sanctions Screening", ...amlSanctionsResult },
    { label: "PEP Screening", ...amlPepResult },
  ];

  // Get evidence items linked to this case
  const allEvidence = getEvidenceStore();
  const caseEvidence: EvidenceItem[] = vc.evidenceIds
    .map((id) => allEvidence.find((e) => e.id === id))
    .filter((e): e is EvidenceItem => !!e);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Adapter Results */}
      <div className="rounded-[var(--radius)] border border-border bg-surface-1">
        <div className="p-4 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">Screening Results</p>
          <p className="text-xs text-text-faint mt-0.5">Deterministic adapter outcomes</p>
        </div>
        <div className="divide-y divide-border">
          {adapterResults.map((result) => {
            const outcome = OUTCOME_COLORS[result.outcome] ?? OUTCOME_COLORS.PASS;
            const OutcomeIcon = outcome.icon;
            return (
              <div key={result.label} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text">{result.label}</span>
                  <div className="flex items-center gap-1">
                    <OutcomeIcon className={cn("h-3.5 w-3.5", outcome.color)} />
                    <span className={cn("text-[10px] font-bold uppercase tracking-wide", outcome.color)}>
                      {result.outcome}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-text-faint">{result.detail}</p>
                <p className="text-[10px] text-text-faint mt-0.5 font-mono">
                  Provider: {result.providerName}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evidence */}
      <div className="rounded-[var(--radius)] border border-border bg-surface-1">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-text-faint" />
            <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
              Evidence ({caseEvidence.length})
            </p>
          </div>
        </div>
        {caseEvidence.length === 0 ? (
          <div className="p-4 text-xs text-text-faint">No evidence items linked to this case.</div>
        ) : (
          <div className="p-3 space-y-2">
            {caseEvidence.map((item) => (
              <EvidenceCard key={item.id} item={item} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
