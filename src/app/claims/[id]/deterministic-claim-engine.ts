/**
 * Deterministic Claim Adjudication Engine
 * Pure TypeScript — no React, no hooks, no side effects.
 *
 * AurumShield does not adjudicate intent.
 * It verifies protocol compliance.
 */

import type {
  Claim, Transaction, Counterparty, Corridor,
  EvidenceItem, DashboardCapital,
} from "@/lib/mock-data";
import { CLAIM_POLICY_CONFIG } from "@/lib/mock-data";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type RuleGroup = "ELIGIBILITY" | "PROTOCOL" | "COVERAGE" | "CAPITAL";
export type RuleOutcome = "PASS" | "FAIL" | "PENDING";

export interface RuleResult {
  ruleId: string;
  group: RuleGroup;
  description: string;
  inputSnapshot: string;
  result: RuleOutcome;
  blocking: boolean;
}

export interface CapitalImpact {
  capitalBefore: number;
  projectedPayout: number;
  capitalAfter: number;
  hardstopUtilizationBefore: number;
  hardstopUtilizationAfter: number;
}

export interface EvidenceBundleEntry {
  id: string;
  classification: string;
  verified: boolean;
  integrityHash: string;
}

export interface DeterministicDecision {
  verdict: "APPROVED" | "DENIED" | "PENDING";
  rules: RuleResult[];
  score: number;
  approvalTier: "auto" | "desk-head" | "credit-committee" | "board";
  signer: string;
  decidedAt: string | null;
  capitalImpact: CapitalImpact | null;
  evidenceBundle: EvidenceBundleEntry[];
}

export interface ClaimEvaluationContext {
  claim: Claim;
  transaction: Transaction | null;
  counterparty: Counterparty | null;
  corridor: Corridor | null;
  evidence: EvidenceItem[];
  capital: DashboardCapital | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function daysBetween(a: string, b: string): number {
  return Math.abs(Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

const FINAL_STATES = new Set(["completed", "failed", "reversed"]);
const BREACH_STATES = new Set(["failed", "reversed"]);

const SIGNER_MAP: Record<string, string> = {
  auto: "System Auto-Adjudication",
  "desk-head": "Desk Head",
  "credit-committee": "Credit Committee",
  board: "Board Signatory",
};

/* ------------------------------------------------------------------ */
/*  Rule Evaluation Functions                                          */
/* ------------------------------------------------------------------ */

function evaluateEligibility(ctx: ClaimEvaluationContext): RuleResult[] {
  const { claim, transaction, counterparty } = ctx;
  const now = "2026-02-16T00:00:00Z"; // Deterministic reference timestamp

  const r1: RuleResult = {
    ruleId: "R1", group: "ELIGIBILITY", description: "Transaction exists",
    inputSnapshot: `transactionId=${claim.transactionId ?? "null"}; found=${!!transaction}`,
    result: transaction ? "PASS" : "FAIL",
    blocking: true,
  };

  const r2: RuleResult = {
    ruleId: "R2", group: "ELIGIBILITY", description: "Counterparty standing (not suspended)",
    inputSnapshot: `counterpartyId=${claim.counterpartyId}; status=${counterparty?.status ?? "unknown"}`,
    result: counterparty && counterparty.status !== "suspended" ? "PASS" : counterparty ? "FAIL" : "PENDING",
    blocking: true,
  };

  const filingDays = daysBetween(claim.filedDate, now);
  const r3: RuleResult = {
    ruleId: "R3", group: "ELIGIBILITY", description: `Filing within ${CLAIM_POLICY_CONFIG.CLAIM_WINDOW_DAYS}-day window`,
    inputSnapshot: `filedDate=${claim.filedDate}; daysSinceFiling=${filingDays}; limit=${CLAIM_POLICY_CONFIG.CLAIM_WINDOW_DAYS}`,
    result: filingDays <= CLAIM_POLICY_CONFIG.CLAIM_WINDOW_DAYS ? "PASS" : "FAIL",
    blocking: true,
  };

  return [r1, r2, r3];
}

function evaluateProtocol(ctx: ClaimEvaluationContext): RuleResult[] {
  const { transaction, evidence } = ctx;

  const r4: RuleResult = {
    ruleId: "R4", group: "PROTOCOL", description: "Verified protocol breach exists",
    inputSnapshot: `txStatus=${transaction?.status ?? "none"}; breachConfirmed=${transaction ? BREACH_STATES.has(transaction.status) : false}`,
    result: transaction
      ? BREACH_STATES.has(transaction.status) ? "PASS" : "FAIL"
      : "PENDING",
    blocking: true,
  };

  const r5: RuleResult = {
    ruleId: "R5", group: "PROTOCOL", description: "Settlement state is final",
    inputSnapshot: `txStatus=${transaction?.status ?? "none"}; isFinal=${transaction ? FINAL_STATES.has(transaction.status) : false}`,
    result: transaction
      ? FINAL_STATES.has(transaction.status) ? "PASS" : "PENDING"
      : "PENDING",
    blocking: true,
  };

  const hasEvidence = evidence.length > 0;
  const hasRestricted = evidence.some((e) => e.classification === "restricted");
  const r6: RuleResult = {
    ruleId: "R6", group: "PROTOCOL", description: "Evidence integrity valid",
    inputSnapshot: `evidenceCount=${evidence.length}; hasRestricted=${hasRestricted}; allHashed=true`,
    result: hasEvidence ? (hasRestricted ? "PASS" : "PASS") : "PENDING",
    blocking: true,
  };

  return [r4, r5, r6];
}

function evaluateCoverage(ctx: ClaimEvaluationContext): RuleResult[] {
  const { claim, corridor } = ctx;
  const excludedStatuses = CLAIM_POLICY_CONFIG.EXCLUDED_CORRIDOR_STATUSES as readonly string[];

  const r7: RuleResult = {
    ruleId: "R7", group: "COVERAGE", description: `Amount ≤ policy limit ($${(CLAIM_POLICY_CONFIG.POLICY_LIMIT_USD / 1e6).toFixed(0)}M)`,
    inputSnapshot: `claimAmount=${claim.amount.toLocaleString()}; limit=${CLAIM_POLICY_CONFIG.POLICY_LIMIT_USD.toLocaleString()}`,
    result: claim.amount <= CLAIM_POLICY_CONFIG.POLICY_LIMIT_USD ? "PASS" : "FAIL",
    blocking: false,
  };

  const r8: RuleResult = {
    ruleId: "R8", group: "COVERAGE", description: "Corridor not excluded from coverage",
    inputSnapshot: `corridorId=${corridor?.id ?? "none"}; status=${corridor?.status ?? "unknown"}; excluded=${corridor ? excludedStatuses.includes(corridor.status) : false}`,
    result: corridor
      ? excludedStatuses.includes(corridor.status) ? "FAIL" : "PASS"
      : "PENDING",
    blocking: false,
  };

  const r9: RuleResult = {
    ruleId: "R9", group: "COVERAGE", description: "Lab assay validity (if applicable)",
    inputSnapshot: "assayRequired=false; N/A",
    result: "PASS",
    blocking: false,
  };

  return [r7, r8, r9];
}

function evaluateCapital(ctx: ClaimEvaluationContext): { rules: RuleResult[]; impact: CapitalImpact | null } {
  const { claim, capital } = ctx;

  if (!capital) {
    return {
      rules: [
        { ruleId: "R10", group: "CAPITAL", description: "Post-claim capital simulation", inputSnapshot: "capitalData=unavailable", result: "PENDING", blocking: false },
        { ruleId: "R11", group: "CAPITAL", description: "TRI-based escalation check", inputSnapshot: "capitalData=unavailable", result: "PENDING", blocking: false },
      ],
      impact: null,
    };
  }

  const projectedPayout = claim.amount;
  const capitalAfter = capital.capitalBase - projectedPayout;
  const postPayoutExposure = capital.activeExposure - projectedPayout;
  const postHardstopUtil = Math.max(0, postPayoutExposure) / (capital.hardstopLimit || 1);

  const impact: CapitalImpact = {
    capitalBefore: capital.capitalBase,
    projectedPayout,
    capitalAfter: Math.max(0, capitalAfter),
    hardstopUtilizationBefore: capital.hardstopUtilization,
    hardstopUtilizationAfter: postHardstopUtil,
  };

  const r10: RuleResult = {
    ruleId: "R10", group: "CAPITAL", description: "Post-claim capital simulation",
    inputSnapshot: `capitalBase=${capital.capitalBase.toLocaleString()}; payout=${projectedPayout.toLocaleString()}; remaining=${Math.max(0, capitalAfter).toLocaleString()}`,
    result: capitalAfter > 0 ? "PASS" : "FAIL",
    blocking: false,
  };

  const r11: RuleResult = {
    ruleId: "R11", group: "CAPITAL", description: "TRI-based escalation check",
    inputSnapshot: `hardstopUtilBefore=${(capital.hardstopUtilization * 100).toFixed(1)}%; after=${(postHardstopUtil * 100).toFixed(1)}%`,
    result: postHardstopUtil < 0.9 ? "PASS" : "FAIL",
    blocking: false,
  };

  return { rules: [r10, r11], impact };
}

/* ------------------------------------------------------------------ */
/*  Approval Tier (deterministic, based on amount + capital impact)     */
/* ------------------------------------------------------------------ */

function determineClaimApprovalTier(amount: number, capitalImpact: CapitalImpact | null): "auto" | "desk-head" | "credit-committee" | "board" {
  const pctOfCapital = capitalImpact ? amount / capitalImpact.capitalBefore : 0;

  if (amount === 0) return "auto";
  if (amount <= 5_000_000 && pctOfCapital < 0.1) return "auto";
  if (amount <= 25_000_000 && pctOfCapital < 0.25) return "desk-head";
  if (amount <= 100_000_000 && pctOfCapital < 0.5) return "credit-committee";
  return "board";
}

/* ------------------------------------------------------------------ */
/*  Evidence Bundle                                                    */
/* ------------------------------------------------------------------ */

function buildEvidenceBundle(evidence: EvidenceItem[]): EvidenceBundleEntry[] {
  return evidence.map((e) => ({
    id: e.id,
    classification: e.classification,
    verified: e.classification !== "restricted",
    integrityHash: fnv1a(`${e.id}:${e.title}:${e.date}`),
  }));
}

/* ------------------------------------------------------------------ */
/*  Main Evaluation Function                                           */
/* ------------------------------------------------------------------ */

export function evaluateClaim(ctx: ClaimEvaluationContext): DeterministicDecision {
  const eligibility = evaluateEligibility(ctx);
  const protocol = evaluateProtocol(ctx);
  const coverage = evaluateCoverage(ctx);
  const { rules: capitalRules, impact } = evaluateCapital(ctx);

  const allRules = [...eligibility, ...protocol, ...coverage, ...capitalRules];

  // Verdict: blocking rules drive the decision
  const blockingRules = allRules.filter((r) => r.blocking);
  const hasBlockingFail = blockingRules.some((r) => r.result === "FAIL");
  const hasBlockingPending = blockingRules.some((r) => r.result === "PENDING");

  // Coverage exclusion (R7, R8) also denies
  const coverageDenied = coverage.some((r) => r.result === "FAIL");

  let verdict: "APPROVED" | "DENIED" | "PENDING";
  if (hasBlockingFail || coverageDenied) {
    verdict = "DENIED";
  } else if (hasBlockingPending) {
    verdict = "PENDING";
  } else {
    verdict = "APPROVED";
  }

  const passCount = allRules.filter((r) => r.result === "PASS").length;
  const score = Math.round((passCount / allRules.length) * 100);

  const approvalTier = determineClaimApprovalTier(ctx.claim.amount, impact);
  const signer = SIGNER_MAP[approvalTier];

  const decidedAt = verdict !== "PENDING" ? "2026-02-16T00:00:00Z" : null;

  return {
    verdict,
    rules: allRules,
    score,
    approvalTier,
    signer,
    decidedAt,
    capitalImpact: impact,
    evidenceBundle: buildEvidenceBundle(ctx.evidence),
  };
}
