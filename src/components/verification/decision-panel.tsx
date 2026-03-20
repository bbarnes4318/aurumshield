"use client";

/* ================================================================
   DECISION PANEL — BSA/AML Compliance Officer Workstation
   ================================================================
   Displays three mandatory compliance badges for every corporate
   entity and enforces a UI gate on case approval:

     1. Entity KYB (Veriff)        — Pass / Fail / Pending
     2. UBO Identity               — Pass / Fail / Pending
     3. OFAC / Global Sanctions    — Clear / Flagged

   Part 1027 Physical Metals Due Diligence (3 mandatory attestations):
     4. Chain of Custody Verified
     5. Assay Authenticity
     6. Form 8300 Applicability

   The "Approve Case" button is DISABLED unless all three badges
   read Pass or Clear AND all three DD attestations are checked.

   If the officer manually overrides a restricted case, a mandatory
   "BSA Officer Audit Note" text input must be completed.
   ================================================================ */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { VerificationCase, EvidenceItem } from "@/lib/mock-data";
import { EvidenceCard } from "@/components/ui/evidence-card";
import { mockKycProvider, mockAmlProvider, mockKybProvider } from "@/lib/kyc-adapters";
import { getOrg } from "@/lib/auth-store";
import { getEvidenceStore } from "@/lib/verification-engine";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSearch,
  Shield,
  Loader2,
  ClipboardCheck,
} from "lucide-react";

/* ── Badge Status Derivation ── */

type BadgeStatus = "PASS" | "FAIL" | "PENDING";
type SanctionsBadgeStatus = "CLEAR" | "FLAGGED";

interface ComplianceBadge {
  label: string;
  status: BadgeStatus | SanctionsBadgeStatus;
  detail: string;
  provider: string;
}

function deriveBadgeColor(status: string): {
  bg: string;
  text: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (status) {
    case "PASS":
    case "CLEAR":
      return {
        bg: "bg-emerald-400/10",
        text: "text-emerald-400",
        border: "border-emerald-400/20",
        icon: CheckCircle2,
      };
    case "FAIL":
    case "FLAGGED":
      return {
        bg: "bg-red-400/10",
        text: "text-red-400",
        border: "border-red-400/20",
        icon: XCircle,
      };
    case "PENDING":
      return {
        bg: "bg-amber-400/10",
        text: "text-amber-400",
        border: "border-amber-400/20",
        icon: Loader2,
      };
    default:
      return {
        bg: "bg-zinc-400/10",
        text: "text-zinc-400",
        border: "border-zinc-400/20",
        icon: AlertTriangle,
      };
  }
}

/* ── Adapter Result Row (secondary) ── */

const OUTCOME_COLORS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  PASS: { icon: CheckCircle2, color: "text-success" },
  CLEAR: { icon: CheckCircle2, color: "text-success" },
  FAIL: { icon: XCircle, color: "text-danger" },
  CONFIRMED_MATCH: { icon: XCircle, color: "text-danger" },
  REVIEW: { icon: AlertTriangle, color: "text-warning" },
  POSSIBLE_MATCH: { icon: AlertTriangle, color: "text-warning" },
};

/* ── Props ── */

interface DecisionPanelProps {
  verificationCase: VerificationCase;
  userId: string;
  orgId: string;
  className?: string;
}

/* ================================================================
   COMPONENT
   ================================================================ */

export function DecisionPanel({ verificationCase: vc, userId, orgId, className }: DecisionPanelProps) {
  const org = getOrg(orgId);
  const entityName = org?.legalName ?? userId;

  /* ── State ── */
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [auditNote, setAuditNote] = useState("");

  /* ── Part 1027: Physical Metals Due Diligence attestations ── */
  const [ddChainOfCustody, setDdChainOfCustody] = useState(false);
  const [ddAssayAuthenticity, setDdAssayAuthenticity] = useState(false);
  const [ddForm8300, setDdForm8300] = useState(false);
  const allDueDiligenceComplete = ddChainOfCustody && ddAssayAuthenticity && ddForm8300;

  /* ── Run adapter checks (deterministic, no side effects) ── */
  const kycIdResult = mockKycProvider.verifyIdentityDocument(userId, orgId);
  const kycLivenessResult = mockKycProvider.verifyLiveness(userId);
  const kycUboResult = mockKycProvider.verifyUBO(orgId, org?.type ?? "company");
  const amlSanctionsResult = mockAmlProvider.screenSanctions(entityName, orgId);
  const amlPepResult = mockAmlProvider.screenPEP(entityName, orgId);
  const kybCorpResult = mockKybProvider.verifyBusinessRegistration(orgId, org?.jurisdiction ?? "US");

  /* ── Derive 3 mandatory compliance badges ── */

  // 1. Entity KYB (Veriff) — derived from corp registry + ID doc check
  const entityKybOutcome: BadgeStatus =
    kybCorpResult.outcome === "PASS" && kycIdResult.outcome === "PASS"
      ? "PASS"
      : kybCorpResult.outcome === "REVIEW" || kycIdResult.outcome === "REVIEW"
        ? "PENDING"
        : kybCorpResult.outcome === "FAIL" || kycIdResult.outcome === "FAIL"
          ? "FAIL"
          : "PENDING";

  // 2. UBO Identity — derived from UBO check + liveness
  const uboIdentityOutcome: BadgeStatus =
    kycUboResult.outcome === "PASS" && kycLivenessResult.outcome === "PASS"
      ? "PASS"
      : kycUboResult.outcome === "REVIEW" || kycLivenessResult.outcome === "REVIEW"
        ? "PENDING"
        : kycUboResult.outcome === "FAIL" || kycLivenessResult.outcome === "FAIL"
          ? "FAIL"
          : "PENDING";

  // 3. OFAC / Global Sanctions — derived from sanctions + PEP screening
  const sanctionsOutcome: SanctionsBadgeStatus =
    amlSanctionsResult.outcome === "CLEAR" && amlPepResult.outcome === "CLEAR"
      ? "CLEAR"
      : "FLAGGED";

  const badges: ComplianceBadge[] = [
    {
      label: "Entity KYB (Veriff)",
      status: entityKybOutcome,
      detail: kybCorpResult.detail,
      provider: kybCorpResult.providerName,
    },
    {
      label: "UBO Identity",
      status: uboIdentityOutcome,
      detail: kycUboResult.detail,
      provider: kycUboResult.providerName,
    },
    {
      label: "OFAC / Global Sanctions",
      status: sanctionsOutcome,
      detail: amlSanctionsResult.detail,
      provider: amlSanctionsResult.providerName,
    },
  ];

  /* ── Approve gate logic ── */
  const allClear =
    entityKybOutcome === "PASS" &&
    uboIdentityOutcome === "PASS" &&
    sanctionsOutcome === "CLEAR";

  // A restricted case has at least one non-passing badge
  const isRestrictedCase = !allClear;

  // Override requires a filled audit note
  const canOverride = isRestrictedCase && auditNote.trim().length > 0;

  // Approve is allowed if (all clear OR override valid) AND all DD checks done
  const canApprove = (allClear || canOverride) && allDueDiligenceComplete;

  /* ── Adapter results (secondary detail) ── */
  const adapterResults = [
    { label: "ID Document Check", ...kycIdResult },
    { label: "Liveness Verification", ...kycLivenessResult },
    { label: "UBO Declaration", ...kycUboResult },
    { label: "Corp Registry (KYB)", ...kybCorpResult },
    { label: "Sanctions Screening", ...amlSanctionsResult },
    { label: "PEP Screening", ...amlPepResult },
  ];

  /* ── Evidence ── */
  const allEvidence = getEvidenceStore();
  const caseEvidence: EvidenceItem[] = vc.evidenceIds
    .map((id) => allEvidence.find((e) => e.id === id))
    .filter((e): e is EvidenceItem => !!e);

  /* ── Approve handler ── */
  const handleApprove = useCallback(async () => {
    setApproving(true);
    // TODO: POST to /api/compliance/cases/:id/approve with auditNote
    console.log("[AurumShield] Case approved", {
      userId,
      orgId,
      override: isRestrictedCase,
      auditNote: isRestrictedCase ? auditNote : undefined,
    });
    await new Promise((r) => setTimeout(r, 1500));
    setApproved(true);
    setApproving(false);
  }, [userId, orgId, isRestrictedCase, auditNote]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── BSA Compliance Badges ── */}
      <div className="rounded-(--radius) border border-border bg-surface-1">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-text-faint" />
            <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
              BSA Compliance Status
            </p>
          </div>
          <p className="text-xs text-text-faint mt-0.5">
            All three checks must pass before case approval is permitted
          </p>
        </div>

        <div className="p-4 space-y-3">
          {badges.map((badge) => {
            const style = deriveBadgeColor(badge.status);
            const BadgeIcon = style.icon;
            return (
              <div
                key={badge.label}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-4 py-3",
                  style.border,
                  style.bg,
                )}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs font-semibold text-text">{badge.label}</p>
                  <p className="text-[11px] text-text-faint mt-0.5 truncate">{badge.detail}</p>
                  <p className="text-[10px] text-text-faint mt-0.5 font-mono">
                    Provider: {badge.provider}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <BadgeIcon
                    className={cn(
                      "h-4 w-4",
                      style.text,
                      badge.status === "PENDING" && "animate-spin",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wide",
                      style.text,
                    )}
                  >
                    {badge.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BSA Officer Audit Note (required for override) ── */}
      {isRestrictedCase && !approved && (
        <div className="rounded-(--radius) border border-amber-400/20 bg-amber-400/5">
          <div className="p-4 border-b border-amber-400/15">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-amber-400" />
              <p className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                BSA Officer Audit Note
              </p>
            </div>
            <p className="text-xs text-text-faint mt-0.5">
              Required to override a restricted case. Document the regulatory
              justification for manual approval.
            </p>
          </div>
          <div className="p-4">
            <textarea
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              placeholder="Enter compliance justification for manual override…"
              rows={3}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm text-text bg-surface-1",
                "placeholder:text-text-faint/40 resize-none",
                "focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/40",
                auditNote.trim().length === 0
                  ? "border-amber-400/30"
                  : "border-emerald-400/30",
              )}
            />
            {auditNote.trim().length === 0 && (
              <p className="text-[11px] text-amber-400 mt-1.5">
                A written audit note is mandatory before overriding a flagged case.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Part 1027: Physical Metals Due Diligence ── */}
      {!approved && (
        <div className="rounded-(--radius) border border-blue-400/20 bg-blue-400/5">
          <div className="p-4 border-b border-blue-400/15">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              <p className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">
                Part 1027 — Physical Metals Due Diligence
              </p>
            </div>
            <p className="text-xs text-text-faint mt-0.5">
              All three attestations must be completed before case approval is permitted.
            </p>
          </div>
          <div className="p-4 space-y-3">
            {/* Chain of Custody */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={ddChainOfCustody}
                  onChange={(e) => setDdChainOfCustody(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                    ddChainOfCustody
                      ? "bg-emerald-500/20 border-emerald-500/40"
                      : "bg-zinc-800 border-zinc-600 group-hover:border-zinc-500",
                  )}
                >
                  {ddChainOfCustody && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                </div>
              </div>
              <div className="min-w-0">
                <p className={cn(
                  "text-xs font-semibold",
                  ddChainOfCustody ? "text-emerald-400" : "text-text",
                )}>
                  Chain of Custody Verified
                </p>
                <p className="text-[11px] text-text-faint mt-0.5 leading-relaxed">
                  I attest that the origin of this metal has been traced to a non-sanctioned,
                  OECD-compliant source.
                </p>
              </div>
            </label>

            {/* Assay Authenticity */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={ddAssayAuthenticity}
                  onChange={(e) => setDdAssayAuthenticity(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                    ddAssayAuthenticity
                      ? "bg-emerald-500/20 border-emerald-500/40"
                      : "bg-zinc-800 border-zinc-600 group-hover:border-zinc-500",
                  )}
                >
                  {ddAssayAuthenticity && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                </div>
              </div>
              <div className="min-w-0">
                <p className={cn(
                  "text-xs font-semibold",
                  ddAssayAuthenticity ? "text-emerald-400" : "text-text",
                )}>
                  Assay Authenticity
                </p>
                <p className="text-[11px] text-text-faint mt-0.5 leading-relaxed">
                  I attest that the refiner hallmarks and assay certificates have been validated
                  against the LBMA/Dubai Good Delivery list or partner refinery.
                </p>
              </div>
            </label>

            {/* Form 8300 Applicability */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={ddForm8300}
                  onChange={(e) => setDdForm8300(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                    ddForm8300
                      ? "bg-emerald-500/20 border-emerald-500/40"
                      : "bg-zinc-800 border-zinc-600 group-hover:border-zinc-500",
                  )}
                >
                  {ddForm8300 && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                </div>
              </div>
              <div className="min-w-0">
                <p className={cn(
                  "text-xs font-semibold",
                  ddForm8300 ? "text-emerald-400" : "text-text",
                )}>
                  Form 8300 Applicability
                </p>
                <p className="text-[11px] text-text-faint mt-0.5 leading-relaxed">
                  I have verified that no single or related cash-equivalent deposits exceeding
                  $10,000 were used to fund this transaction, OR the required Form 8300 has been filed.
                </p>
              </div>
            </label>
          </div>

          {/* Checklist status footer */}
          <div className="px-4 py-2.5 border-t border-blue-400/15">
            <div className="flex items-center gap-2">
              {allDueDiligenceComplete ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    Due Diligence Complete
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    {[ddChainOfCustody, ddAssayAuthenticity, ddForm8300].filter(Boolean).length}/3 Attestations Complete
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Case Button ── */}
      <div className="rounded-(--radius) border border-border bg-surface-1 p-4">
        {approved ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">Case Approved</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleApprove}
            disabled={!canApprove || approving}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2",
              "rounded-lg px-5 py-3 text-sm font-semibold",
              "transition-colors duration-150",
              canApprove && !approving
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 active:bg-emerald-500/30"
                : "bg-zinc-800/50 text-zinc-500 border border-zinc-700/30 cursor-not-allowed",
            )}
          >
            {approving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                {allClear ? "Approve Case" : "Override & Approve Case"}
              </>
            )}
          </button>
        )}
        {!canApprove && !approved && (
          <p className="text-[11px] text-zinc-500 mt-2 text-center">
            {!allDueDiligenceComplete
              ? "Approval locked — complete all Part 1027 due diligence attestations."
              : isRestrictedCase
                ? "Approval locked — complete the BSA Officer Audit Note to override."
                : "Approval locked — all compliance badges must read Pass or Clear."}
          </p>
        )}
      </div>

      {/* ── Detailed Adapter Results ── */}
      <div className="rounded-(--radius) border border-border bg-surface-1">
        <div className="p-4 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
            Screening Results
          </p>
          <p className="text-xs text-text-faint mt-0.5">
            Deterministic adapter outcomes
          </p>
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

      {/* ── Evidence ── */}
      <div className="rounded-(--radius) border border-border bg-surface-1">
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
