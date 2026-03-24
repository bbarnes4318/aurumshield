/* ================================================================
   SUBJECT DECISION ENGINE — Compliance Check Evaluation
   ================================================================
   Phase 3.1: Evaluates all collected compliance checks for a case
   and renders a formal co_decisions record.

   EVALUATION ORDER (fail-closed, sequential):
     1. Sanctions Hard-Stop — any FAIL or CONFIRMED_MATCH → REJECTED
     2. Manual Review Routing — any REVIEW → AWAITING_INTERNAL_REVIEW
     3. Completeness Check — all required checks for risk tier present
     4. Pass Verification — all required checks have PASS verdict
     5. Decision Rendering — hash, insert, close case, update subject

   RISK TIER CHECK MATRIX:
     INDIVIDUAL (STANDARD):
       KYC_ID, LIVENESS, SANCTIONS, PEP, SOURCE_OF_FUNDS

     INDIVIDUAL (HIGH):
       KYC_ID, LIVENESS, SANCTIONS, PEP, SOURCE_OF_FUNDS,
       SOURCE_OF_WEALTH, PROOF_OF_ADDRESS, ADVERSE_MEDIA

     ENTITY (STANDARD):
       KYB_REGISTRATION, UBO, SANCTIONS, PEP, ADVERSE_MEDIA,
       AUTHORIZED_SIGNATORY

     ENTITY (HIGH):
       KYB_REGISTRATION, UBO, LEI, SANCTIONS, PEP, ADVERSE_MEDIA,
       AUTHORIZED_SIGNATORY, SOURCE_OF_FUNDS

     SUPPLIER:
       KYB_REGISTRATION, UBO, SANCTIONS, PEP, ADVERSE_MEDIA,
       SANCTIONS_ORIGIN, SOURCE_OF_FUNDS

     REFINERY:
       KYB_REGISTRATION, UBO, SANCTIONS, PEP, ADVERSE_MEDIA,
       REFINERY_ELIGIBILITY, SOURCE_OF_FUNDS

     INTERNAL_USER:
       KYC_ID, SANCTIONS, TRAINING_COMPLETION

   Uses Drizzle ORM for type-safe database operations.
   Integrates with Phase 2.1 AuditLogger and evidence-hashing.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq, and, desc } from "drizzle-orm";
import {
  coSubjects,
  coCases,
  coChecks,
  coDecisions,
  coPolicySnapshots,
  type CoCase,
  type CoCheck,
  type CoSubject,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";
import { generateEvidenceHash } from "./evidence-hashing";

// ─── RISK TIER CHECK MATRIX ────────────────────────────────────────────────────

type CheckType = CoCheck["checkType"];

/**
 * Maps (subjectType, riskTier) → required check types.
 * If a subject type is not listed here, it cannot be evaluated.
 */
const REQUIRED_CHECKS_MATRIX: Record<string, Record<string, CheckType[]>> = {
  INDIVIDUAL: {
    STANDARD: [
      "KYC_ID",
      "LIVENESS",
      "SANCTIONS",
      "PEP",
      "SOURCE_OF_FUNDS",
    ],
    HIGH: [
      "KYC_ID",
      "LIVENESS",
      "SANCTIONS",
      "PEP",
      "SOURCE_OF_FUNDS",
      "SOURCE_OF_WEALTH",
      "PROOF_OF_ADDRESS",
      "ADVERSE_MEDIA",
    ],
    ENHANCED: [
      "KYC_ID",
      "LIVENESS",
      "SANCTIONS",
      "PEP",
      "SOURCE_OF_FUNDS",
      "SOURCE_OF_WEALTH",
      "PROOF_OF_ADDRESS",
      "ADVERSE_MEDIA",
      "WALLET_KYT",
    ],
  },
  ENTITY: {
    STANDARD: [
      "KYB_REGISTRATION",
      "UBO",
      "SANCTIONS",
      "PEP",
      "ADVERSE_MEDIA",
      "AUTHORIZED_SIGNATORY",
    ],
    HIGH: [
      "KYB_REGISTRATION",
      "UBO",
      "LEI",
      "SANCTIONS",
      "PEP",
      "ADVERSE_MEDIA",
      "AUTHORIZED_SIGNATORY",
      "SOURCE_OF_FUNDS",
    ],
  },
  SUPPLIER: {
    STANDARD: [
      "KYB_REGISTRATION",
      "UBO",
      "SANCTIONS",
      "PEP",
      "ADVERSE_MEDIA",
      "SANCTIONS_ORIGIN",
      "SOURCE_OF_FUNDS",
    ],
    HIGH: [
      "KYB_REGISTRATION",
      "UBO",
      "LEI",
      "SANCTIONS",
      "PEP",
      "ADVERSE_MEDIA",
      "SANCTIONS_ORIGIN",
      "SOURCE_OF_FUNDS",
      "SOURCE_OF_WEALTH",
    ],
  },
  REFINERY: {
    STANDARD: [
      "KYB_REGISTRATION",
      "UBO",
      "SANCTIONS",
      "PEP",
      "ADVERSE_MEDIA",
      "REFINERY_ELIGIBILITY",
      "SOURCE_OF_FUNDS",
    ],
    HIGH: [
      "KYB_REGISTRATION",
      "UBO",
      "LEI",
      "SANCTIONS",
      "PEP",
      "ADVERSE_MEDIA",
      "REFINERY_ELIGIBILITY",
      "SOURCE_OF_FUNDS",
      "SOURCE_OF_WEALTH",
    ],
  },
  INTERNAL_USER: {
    STANDARD: [
      "KYC_ID",
      "SANCTIONS",
      "TRAINING_COMPLETION",
    ],
    HIGH: [
      "KYC_ID",
      "SANCTIONS",
      "PEP",
      "TRAINING_COMPLETION",
    ],
  },
};

/**
 * Sanctions result codes that constitute a confirmed match.
 * Any of these in the result_code field → immediate REJECTED.
 */
const SANCTIONS_CONFIRMED_CODES = new Set([
  "CONFIRMED_MATCH",
  "TRUE_POSITIVE",
  "SANCTIONS_HIT",
  "SDN_MATCH",
  "OFAC_MATCH",
  "EU_SANCTIONS_MATCH",
  "UN_SANCTIONS_MATCH",
]);

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export interface CheckEvaluation {
  checkId: string;
  checkType: CheckType;
  verdict: CoCheck["normalizedVerdict"];
  resultCode: string | null;
  status: "SATISFIED" | "FAILED" | "REVIEW" | "MISSING" | "ERROR";
  detail: string;
}

export type DecisionOutcome = "APPROVED" | "REJECTED" | "MANUAL_REVIEW" | "INCOMPLETE";

export interface DecisionResult {
  outcome: DecisionOutcome;
  caseId: string;
  subjectId: string;
  subjectType: CoSubject["subjectType"];
  riskTier: string;
  decisionId: string | null;
  decisionHash: string;
  policySnapshotId: string | null;
  reasonCodes: string[];
  checkEvaluations: CheckEvaluation[];
  decidedAt: string;
}

// ─── DECISION ENGINE ───────────────────────────────────────────────────────────

/**
 * Evaluate a compliance case and render a formal decision.
 *
 * FLOW:
 *   1. Load case, subject, all checks, and latest policy snapshot
 *   2. Resolve required checks for subject type + risk tier
 *   3. SANCTIONS HARD-STOP — any FAIL/CONFIRMED_MATCH → REJECTED
 *   4. REVIEW ROUTING — any REVIEW verdict → AWAITING_INTERNAL_REVIEW
 *   5. COMPLETENESS — all required check types present?
 *   6. PASS VERIFICATION — all required checks have PASS?
 *   7. RENDER DECISION — hash, insert co_decisions, update case/subject
 *   8. AUDIT LOG — COMPLIANCE_DECISION_RENDERED
 *
 * @param caseId - UUID of the compliance case to evaluate
 * @param userId - The operator/system actor evaluating
 * @returns DecisionResult with full evaluation details
 */
export async function evaluateSubjectCase(
  caseId: string,
  userId: string,
): Promise<DecisionResult> {
  const db = await getDb();
  const decidedAt = new Date().toISOString();
  const checkEvaluations: CheckEvaluation[] = [];
  const reasonCodes: string[] = [];

  // ── Step 1: Load case, subject, checks, policy ──

  const [complianceCase] = await db
    .select()
    .from(coCases)
    .where(eq(coCases.id, caseId))
    .limit(1);

  if (!complianceCase) {
    throw new CaseNotFoundError(caseId);
  }

  if (complianceCase.status === "APPROVED" || complianceCase.status === "REJECTED") {
    throw new CaseAlreadyDecidedError(caseId, complianceCase.status);
  }

  const [subject] = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.id, complianceCase.subjectId))
    .limit(1);

  if (!subject) {
    throw new SubjectNotFoundError(complianceCase.subjectId);
  }

  const checks = await db
    .select()
    .from(coChecks)
    .where(eq(coChecks.caseId, caseId));

  const policySnapshots = await db
    .select()
    .from(coPolicySnapshots)
    .orderBy(desc(coPolicySnapshots.effectiveAt))
    .limit(1);

  const policySnapshot = policySnapshots[0] ?? null;
  const policySnapshotId = policySnapshot?.id ?? complianceCase.policySnapshotId;

  // ── Step 2: Resolve required checks for subject type + risk tier ──

  const subjectType = subject.subjectType;
  const riskTier = subject.riskTier;

  const tierMatrix = REQUIRED_CHECKS_MATRIX[subjectType];
  if (!tierMatrix) {
    throw new UnsupportedSubjectTypeError(subjectType);
  }

  const requiredChecks = tierMatrix[riskTier] ?? tierMatrix["STANDARD"];
  if (!requiredChecks) {
    throw new UnsupportedRiskTierError(subjectType, riskTier);
  }

  // Build a map of check type → most recent check
  const checksByType = new Map<CheckType, CoCheck>();
  for (const check of checks) {
    const existing = checksByType.get(check.checkType);
    if (!existing || (check.completedAt && existing.completedAt &&
        new Date(check.completedAt) > new Date(existing.completedAt))) {
      checksByType.set(check.checkType, check);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Step 3: SANCTIONS HARD-STOP
  // If ANY SANCTIONS check has FAIL or CONFIRMED_MATCH → REJECTED
  // This runs FIRST, before any other evaluation.
  // ════════════════════════════════════════════════════════════════

  const sanctionsChecks = checks.filter((c) => c.checkType === "SANCTIONS");

  for (const sanctionsCheck of sanctionsChecks) {
    const isFail = sanctionsCheck.normalizedVerdict === "FAIL";
    const isConfirmedMatch =
      sanctionsCheck.resultCode !== null &&
      SANCTIONS_CONFIRMED_CODES.has(sanctionsCheck.resultCode);

    if (isFail || isConfirmedMatch) {
      reasonCodes.push("SANCTIONS_HARD_STOP");
      reasonCodes.push(
        `CHECK_${sanctionsCheck.id}_${sanctionsCheck.normalizedVerdict}`,
      );

      checkEvaluations.push({
        checkId: sanctionsCheck.id,
        checkType: "SANCTIONS",
        verdict: sanctionsCheck.normalizedVerdict,
        resultCode: sanctionsCheck.resultCode,
        status: "FAILED",
        detail: `Sanctions hard-stop: verdict=${sanctionsCheck.normalizedVerdict}, result_code=${sanctionsCheck.resultCode}`,
      });

      // ── REJECTED: Suspend subject, reject case, render decision ──
      const decisionHash = generateEvidenceHash({
        caseId,
        subjectId: subject.id,
        decision: "REJECTED",
        reasonCodes,
        sanctionsCheckId: sanctionsCheck.id,
        policySnapshotId,
        decidedAt,
      });

      // Suspend the subject
      await db
        .update(coSubjects)
        .set({ status: "SUSPENDED" })
        .where(eq(coSubjects.id, subject.id));

      // Reject the case
      await db
        .update(coCases)
        .set({
          status: "REJECTED",
          closedAt: new Date(),
          closedReason: `SANCTIONS_HARD_STOP: Check ${sanctionsCheck.id} returned ${sanctionsCheck.normalizedVerdict} / ${sanctionsCheck.resultCode}`,
        })
        .where(eq(coCases.id, caseId));

      // Insert decision record
      const [decision] = await db
        .insert(coDecisions)
        .values({
          caseId,
          subjectId: subject.id,
          decisionType: "FINAL",
          decision: "REJECTED",
          reasonCodes,
          decisionHash,
          expiresAt: null,
        })
        .returning();

      // Audit trail
      await appendEvent(
        "COMPLIANCE_CASE",
        caseId,
        "COMPLIANCE_DECISION_RENDERED",
        {
          decisionId: decision.id,
          caseId,
          subjectId: subject.id,
          decisionType: "FINAL",
          decision: "REJECTED",
          reasonCodes,
          decisionHash,
        },
        userId,
      );

      console.error(
        `[DECISION] ⛔ REJECTED (sanctions hard-stop): case=${caseId}, ` +
          `subject=${subject.legalName}, check=${sanctionsCheck.id}`,
      );

      return {
        outcome: "REJECTED",
        caseId,
        subjectId: subject.id,
        subjectType,
        riskTier,
        decisionId: decision.id,
        decisionHash,
        policySnapshotId,
        reasonCodes,
        checkEvaluations,
        decidedAt,
      };
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Step 4: EVALUATE ALL REQUIRED CHECKS
  // Build the evaluation results for each required check type.
  // ════════════════════════════════════════════════════════════════

  let hasReviewItems = false;
  let hasMissingChecks = false;
  let hasFailedChecks = false;
  let hasErrorChecks = false;

  for (const requiredType of requiredChecks) {
    const check = checksByType.get(requiredType);

    if (!check) {
      // Required check not yet performed
      hasMissingChecks = true;
      reasonCodes.push(`MISSING_CHECK_${requiredType}`);
      checkEvaluations.push({
        checkId: "N/A",
        checkType: requiredType,
        verdict: null,
        resultCode: null,
        status: "MISSING",
        detail: `Required check ${requiredType} has not been performed.`,
      });
      continue;
    }

    if (check.status === "PENDING" || !check.normalizedVerdict) {
      // Check initiated but not yet completed
      hasMissingChecks = true;
      reasonCodes.push(`PENDING_CHECK_${requiredType}`);
      checkEvaluations.push({
        checkId: check.id,
        checkType: requiredType,
        verdict: check.normalizedVerdict,
        resultCode: check.resultCode,
        status: "MISSING",
        detail: `Check ${requiredType} is still PENDING (status=${check.status}).`,
      });
      continue;
    }

    switch (check.normalizedVerdict) {
      case "PASS":
        checkEvaluations.push({
          checkId: check.id,
          checkType: requiredType,
          verdict: "PASS",
          resultCode: check.resultCode,
          status: "SATISFIED",
          detail: `Check ${requiredType} passed.`,
        });
        break;

      case "FAIL":
        hasFailedChecks = true;
        reasonCodes.push(`FAILED_${requiredType}`);
        checkEvaluations.push({
          checkId: check.id,
          checkType: requiredType,
          verdict: "FAIL",
          resultCode: check.resultCode,
          status: "FAILED",
          detail: `Check ${requiredType} failed (result_code=${check.resultCode}).`,
        });
        break;

      case "REVIEW":
        hasReviewItems = true;
        reasonCodes.push(`REVIEW_${requiredType}`);
        checkEvaluations.push({
          checkId: check.id,
          checkType: requiredType,
          verdict: "REVIEW",
          resultCode: check.resultCode,
          status: "REVIEW",
          detail: `Check ${requiredType} requires manual review (result_code=${check.resultCode}).`,
        });
        break;

      case "ERROR":
        hasErrorChecks = true;
        reasonCodes.push(`ERROR_${requiredType}`);
        checkEvaluations.push({
          checkId: check.id,
          checkType: requiredType,
          verdict: "ERROR",
          resultCode: check.resultCode,
          status: "ERROR",
          detail: `Check ${requiredType} returned an error. Must be re-run.`,
        });
        break;

      case "EXPIRED":
        hasMissingChecks = true;
        reasonCodes.push(`EXPIRED_${requiredType}`);
        checkEvaluations.push({
          checkId: check.id,
          checkType: requiredType,
          verdict: "EXPIRED",
          resultCode: check.resultCode,
          status: "MISSING",
          detail: `Check ${requiredType} has expired. Must be re-run.`,
        });
        break;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Step 5: MANUAL REVIEW ROUTING
  // If any check returned REVIEW → AWAITING_INTERNAL_REVIEW
  // ════════════════════════════════════════════════════════════════

  if (hasReviewItems) {
    // Transition case to AWAITING_INTERNAL_REVIEW
    await db
      .update(coCases)
      .set({ status: "AWAITING_INTERNAL_REVIEW" })
      .where(eq(coCases.id, caseId));

    const decisionHash = generateEvidenceHash({
      caseId,
      subjectId: subject.id,
      decision: "MANUAL_REVIEW",
      reasonCodes,
      policySnapshotId,
      decidedAt,
    });

    // Insert an INTERIM decision
    const [decision] = await db
      .insert(coDecisions)
      .values({
        caseId,
        subjectId: subject.id,
        decisionType: "INTERIM",
        decision: "MANUAL_REVIEW",
        reasonCodes,
        decisionHash,
      })
      .returning();

    await appendEvent(
      "COMPLIANCE_CASE",
      caseId,
      "COMPLIANCE_DECISION_RENDERED",
      {
        decisionId: decision.id,
        caseId,
        subjectId: subject.id,
        decisionType: "INTERIM",
        decision: "MANUAL_REVIEW",
        reasonCodes,
        decisionHash,
      },
      userId,
    );

    console.log(
      `[DECISION] ⏸ MANUAL_REVIEW: case=${caseId}, subject=${subject.legalName}, ` +
        `reviewItems=${checkEvaluations.filter((e) => e.status === "REVIEW").length}`,
    );

    return {
      outcome: "MANUAL_REVIEW",
      caseId,
      subjectId: subject.id,
      subjectType,
      riskTier,
      decisionId: decision.id,
      decisionHash,
      policySnapshotId,
      reasonCodes,
      checkEvaluations,
      decidedAt,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Step 6: COMPLETENESS + FAILURE CHECK
  // All required checks must be present. Any failures → REJECTED.
  // ════════════════════════════════════════════════════════════════

  if (hasMissingChecks || hasErrorChecks) {
    const decisionHash = generateEvidenceHash({
      caseId,
      subjectId: subject.id,
      decision: "INCOMPLETE",
      reasonCodes,
      policySnapshotId,
      decidedAt,
    });

    console.log(
      `[DECISION] ⏳ INCOMPLETE: case=${caseId}, subject=${subject.legalName}, ` +
        `missing=${checkEvaluations.filter((e) => e.status === "MISSING").length}, ` +
        `errors=${checkEvaluations.filter((e) => e.status === "ERROR").length}`,
    );

    return {
      outcome: "INCOMPLETE",
      caseId,
      subjectId: subject.id,
      subjectType,
      riskTier,
      decisionId: null,
      decisionHash,
      policySnapshotId,
      reasonCodes,
      checkEvaluations,
      decidedAt,
    };
  }

  if (hasFailedChecks) {
    // Non-sanctions failures → REJECTED (but no subject suspension)
    const decisionHash = generateEvidenceHash({
      caseId,
      subjectId: subject.id,
      decision: "REJECTED",
      reasonCodes,
      policySnapshotId,
      decidedAt,
    });

    await db
      .update(coCases)
      .set({
        status: "REJECTED",
        closedAt: new Date(),
        closedReason: `Failed checks: ${reasonCodes.filter((r) => r.startsWith("FAILED_")).join(", ")}`,
      })
      .where(eq(coCases.id, caseId));

    const [decision] = await db
      .insert(coDecisions)
      .values({
        caseId,
        subjectId: subject.id,
        decisionType: "FINAL",
        decision: "REJECTED",
        reasonCodes,
        decisionHash,
      })
      .returning();

    await appendEvent(
      "COMPLIANCE_CASE",
      caseId,
      "COMPLIANCE_DECISION_RENDERED",
      {
        decisionId: decision.id,
        caseId,
        subjectId: subject.id,
        decisionType: "FINAL",
        decision: "REJECTED",
        reasonCodes,
        decisionHash,
      },
      userId,
    );

    console.log(
      `[DECISION] ❌ REJECTED: case=${caseId}, subject=${subject.legalName}, ` +
        `failedChecks=${reasonCodes.filter((r) => r.startsWith("FAILED_")).join(", ")}`,
    );

    return {
      outcome: "REJECTED",
      caseId,
      subjectId: subject.id,
      subjectType,
      riskTier,
      decisionId: decision.id,
      decisionHash,
      policySnapshotId,
      reasonCodes,
      checkEvaluations,
      decidedAt,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Step 7: ALL CHECKS PASSED — APPROVE
  // Generate decision hash, insert co_decisions, update case/subject.
  // ════════════════════════════════════════════════════════════════

  const approvalDecisionHash = generateEvidenceHash({
    caseId,
    subjectId: subject.id,
    subjectType,
    riskTier,
    decision: "APPROVED",
    checksEvaluated: checkEvaluations.map((e) => ({
      checkId: e.checkId,
      checkType: e.checkType,
      verdict: e.verdict,
    })),
    policySnapshotId,
    decidedAt,
  });

  // Insert FINAL APPROVED decision
  const [approvalDecision] = await db
    .insert(coDecisions)
    .values({
      caseId,
      subjectId: subject.id,
      decisionType: "FINAL",
      decision: "APPROVED",
      reasonCodes: ["ALL_CHECKS_PASSED"],
      decisionHash: approvalDecisionHash,
      expiresAt: calculateDecisionExpiry(subject.riskTier),
    })
    .returning();

  // Close the case as APPROVED
  await db
    .update(coCases)
    .set({
      status: "APPROVED",
      closedAt: new Date(),
      closedReason: "All required compliance checks passed.",
    })
    .where(eq(coCases.id, caseId));

  // Update subject status to ACTIVE (approved)
  await db
    .update(coSubjects)
    .set({ status: "ACTIVE" })
    .where(eq(coSubjects.id, subject.id));

  // Audit trail
  await appendEvent(
    "COMPLIANCE_CASE",
    caseId,
    "COMPLIANCE_DECISION_RENDERED",
    {
      decisionId: approvalDecision.id,
      caseId,
      subjectId: subject.id,
      decisionType: "FINAL",
      decision: "APPROVED",
      reasonCodes: ["ALL_CHECKS_PASSED"],
      decisionHash: approvalDecisionHash,
    },
    userId,
  );

  console.log(
    `[DECISION] ✅ APPROVED: case=${caseId}, subject=${subject.legalName} ` +
      `(${subjectType}/${riskTier}), hash=${approvalDecisionHash.slice(0, 16)}…`,
  );

  return {
    outcome: "APPROVED",
    caseId,
    subjectId: subject.id,
    subjectType,
    riskTier,
    decisionId: approvalDecision.id,
    decisionHash: approvalDecisionHash,
    policySnapshotId,
    reasonCodes: ["ALL_CHECKS_PASSED"],
    checkEvaluations,
    decidedAt,
  };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

/**
 * Calculate decision expiry based on risk tier.
 *   STANDARD: 365 days
 *   HIGH:     180 days
 *   ENHANCED: 90 days
 */
function calculateDecisionExpiry(riskTier: string): Date {
  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  switch (riskTier) {
    case "ENHANCED":
      return new Date(now + 90 * MS_PER_DAY);
    case "HIGH":
      return new Date(now + 180 * MS_PER_DAY);
    case "STANDARD":
    default:
      return new Date(now + 365 * MS_PER_DAY);
  }
}

/**
 * Get the required checks for a subject type and risk tier.
 * Useful for UI to show which checks are still needed.
 */
export function getRequiredChecks(
  subjectType: string,
  riskTier: string,
): CheckType[] {
  const tierMatrix = REQUIRED_CHECKS_MATRIX[subjectType];
  if (!tierMatrix) return [];
  return tierMatrix[riskTier] ?? tierMatrix["STANDARD"] ?? [];
}

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

export class CaseNotFoundError extends Error {
  public readonly caseId: string;
  constructor(caseId: string) {
    super(`CASE_NOT_FOUND: Compliance case ${caseId} does not exist.`);
    this.name = "CaseNotFoundError";
    this.caseId = caseId;
  }
}

export class CaseAlreadyDecidedError extends Error {
  public readonly caseId: string;
  public readonly currentStatus: string;
  constructor(caseId: string, currentStatus: string) {
    super(
      `CASE_ALREADY_DECIDED: Case ${caseId} is already "${currentStatus}" — ` +
        `cannot re-evaluate.`,
    );
    this.name = "CaseAlreadyDecidedError";
    this.caseId = caseId;
    this.currentStatus = currentStatus;
  }
}

export class SubjectNotFoundError extends Error {
  public readonly subjectId: string;
  constructor(subjectId: string) {
    super(`SUBJECT_NOT_FOUND: Subject ${subjectId} does not exist.`);
    this.name = "SubjectNotFoundError";
    this.subjectId = subjectId;
  }
}

export class UnsupportedSubjectTypeError extends Error {
  public readonly subjectType: string;
  constructor(subjectType: string) {
    super(
      `UNSUPPORTED_SUBJECT_TYPE: No check matrix defined for subject type "${subjectType}".`,
    );
    this.name = "UnsupportedSubjectTypeError";
    this.subjectType = subjectType;
  }
}

export class UnsupportedRiskTierError extends Error {
  public readonly subjectType: string;
  public readonly riskTier: string;
  constructor(subjectType: string, riskTier: string) {
    super(
      `UNSUPPORTED_RISK_TIER: No check matrix for "${subjectType}" / "${riskTier}".`,
    );
    this.name = "UnsupportedRiskTierError";
    this.subjectType = subjectType;
    this.riskTier = riskTier;
  }
}
