/* ================================================================
   MANUAL DISPOSITION ENGINE — Four-Eyes Review & Final Verdict
   ================================================================
   Phase 5.2: Renders final case dispositions (APPROVED / REJECTED)
   after all reviewer tasks are complete.

   CONTROLS:
     1. Status gate — case must be READY_FOR_DISPOSITION
     2. Four-Eyes — high-risk/high-value cases require dual-signoff
        (dispositioner ≠ original assigned reviewer)
     3. Downstream triggers:
        - Identity case APPROVED → generate co_decisions record
        - Shipment case APPROVED → clear shipment for intake
        - Refinery case APPROVED → clear lot for settlement
        - Rejected → case REJECTED, physical assets stay QUARANTINED
     4. Immutable hash of rationale + reviewer + verdict
     5. Audit log MANUAL_DISPOSITION_RENDERED

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq } from "drizzle-orm";
import {
  coCases,
  coSubjects,
  coPhysicalShipments,
  coRefineryLots,
  coDecisions,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";
import { generateEvidenceHash } from "./evidence-hashing";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

/**
 * Priority threshold for requiring Four-Eyes dual-signoff.
 * Cases with priority >= this value require a different reviewer
 * to render the final disposition.
 *
 * Default: 80. Configurable via FOUR_EYES_PRIORITY_THRESHOLD.
 */
const FOUR_EYES_PRIORITY_THRESHOLD = parseInt(
  process.env.FOUR_EYES_PRIORITY_THRESHOLD || "80",
  10,
);

/**
 * Risk tiers that always require Four-Eyes signoff.
 */
const FOUR_EYES_RISK_TIERS = new Set(["HIGH", "ENHANCED"]);

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export type DispositionVerdict = "APPROVED" | "REJECTED";

export interface DispositionResult {
  caseId: string;
  subjectId: string;
  verdict: DispositionVerdict;
  reviewerId: string;
  originalReviewerId: string | null;
  fourEyesRequired: boolean;
  fourEyesSatisfied: boolean;
  dispositionHash: string;
  downstreamAction: string;
  decidedAt: string;
}

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

export class CaseNotFoundError extends Error {
  constructor(caseId: string) {
    super(`NOT_FOUND: Compliance case ${caseId} does not exist.`);
    this.name = "CaseNotFoundError";
  }
}

export class CaseNotReadyError extends Error {
  public readonly status: string;
  constructor(caseId: string, status: string) {
    super(
      `NOT_READY: Case ${caseId} has status "${status}" — ` +
        `must be "READY_FOR_DISPOSITION" for disposition.`,
    );
    this.name = "CaseNotReadyError";
    this.status = status;
  }
}

export class DualSignoffRequiredError extends Error {
  public readonly caseId: string;
  public readonly reviewerId: string;
  public readonly originalReviewerId: string;

  constructor(
    caseId: string,
    reviewerId: string,
    originalReviewerId: string,
  ) {
    super(
      `DUAL_SIGNOFF_REQUIRED: Case ${caseId} requires Four-Eyes control. ` +
        `The dispositioner (${reviewerId}) cannot be the same as the ` +
        `original assigned reviewer (${originalReviewerId}). ` +
        `A second authorized reviewer must render the final verdict.`,
    );
    this.name = "DualSignoffRequiredError";
    this.caseId = caseId;
    this.reviewerId = reviewerId;
    this.originalReviewerId = originalReviewerId;
  }
}

export class SubjectNotFoundError extends Error {
  constructor(subjectId: string) {
    super(`NOT_FOUND: Subject ${subjectId} does not exist.`);
    this.name = "SubjectNotFoundError";
  }
}

// ─── DISPOSITION ENGINE ────────────────────────────────────────────────────────

/**
 * Render the final disposition on a compliance case.
 *
 * FLOW:
 *   1. Fetch case → verify READY_FOR_DISPOSITION
 *   2. Fetch subject → determine risk tier
 *   3. FOUR-EYES CHECK → dual-signoff required for high-risk/high-value
 *   4. Generate immutable disposition hash
 *   5a. REJECTED → close case, no downstream triggers
 *   5b. APPROVED → trigger appropriate downstream engine
 *   6. Audit log MANUAL_DISPOSITION_RENDERED
 *
 * @param caseId     - UUID of the case to disposition
 * @param reviewerId - UUID of the reviewer rendering the verdict
 * @param verdict    - APPROVED or REJECTED
 * @param rationale  - Required written rationale for the decision
 * @returns DispositionResult with verdict, hash, and downstream action
 *
 * @throws CaseNotFoundError if case doesn't exist
 * @throws CaseNotReadyError if case isn't READY_FOR_DISPOSITION
 * @throws DualSignoffRequiredError if Four-Eyes is violated
 */
export async function dispositionCase(
  caseId: string,
  reviewerId: string,
  verdict: DispositionVerdict,
  rationale: string,
): Promise<DispositionResult> {
  const db = await getDb();
  const decidedAt = new Date().toISOString();

  /* ════════════════════════════════════════════════════════════════
     CONCURRENCY: The entire disposition flow — fetch, validate,
     four-eyes check, verdict execution, and audit — wrapped in a
     single transaction. Prevents double-disposition where two
     reviewers simultaneously pass the READY_FOR_DISPOSITION check
     and both render conflicting verdicts.
     ════════════════════════════════════════════════════════════════ */

  return await db.transaction(async (tx) => {
    // ── Step 1: Fetch and validate the case (inside transaction) ──

    const [complianceCase] = await tx
      .select()
      .from(coCases)
      .where(eq(coCases.id, caseId))
      .limit(1);

    if (!complianceCase) {
      throw new CaseNotFoundError(caseId);
    }

    if (complianceCase.status !== "READY_FOR_DISPOSITION") {
      throw new CaseNotReadyError(caseId, complianceCase.status);
    }

    // ── Step 2: Fetch the subject ──

    const [subject] = await tx
      .select()
      .from(coSubjects)
      .where(eq(coSubjects.id, complianceCase.subjectId))
      .limit(1);

    if (!subject) {
      throw new SubjectNotFoundError(complianceCase.subjectId);
    }

    // ── Step 3: FOUR-EYES CHECK ──

    const fourEyesRequired = isFourEyesRequired(
      complianceCase.priority,
      subject.riskTier,
    );

    const originalReviewerId = complianceCase.assignedReviewerId;

    if (fourEyesRequired && originalReviewerId) {
      if (reviewerId === originalReviewerId) {
        throw new DualSignoffRequiredError(
          caseId,
          reviewerId,
          originalReviewerId,
        );
      }
    }

    const fourEyesSatisfied =
      !fourEyesRequired || (originalReviewerId !== null && reviewerId !== originalReviewerId);

    // ── Step 4: Generate immutable disposition hash ──

    const dispositionHash = generateEvidenceHash({
      caseId,
      subjectId: subject.id,
      reviewerId,
      originalReviewerId,
      verdict,
      rationale,
      caseType: complianceCase.caseType,
      priority: complianceCase.priority,
      fourEyesRequired,
      fourEyesSatisfied,
      decidedAt,
    });

    // ── Step 5: Execute the verdict (using tx for atomicity) ──

    let downstreamAction: string;

    if (verdict === "REJECTED") {
      downstreamAction = await executeRejection(
        tx,
        complianceCase,
        subject,
        rationale,
        dispositionHash,
      );
    } else {
      downstreamAction = await executeApproval(
        tx,
        complianceCase,
        subject,
        rationale,
        dispositionHash,
      );
    }

    // ── Step 6: Audit trail ──

    await appendEvent(
      "COMPLIANCE_CASE",
      caseId,
      "MANUAL_DISPOSITION_RENDERED",
      {
        caseId,
        subjectId: subject.id,
        reviewerId,
        originalReviewerId,
        verdict,
        rationale,
        caseType: complianceCase.caseType,
        priority: complianceCase.priority,
        fourEyesRequired,
        fourEyesSatisfied,
        dispositionHash,
        downstreamAction,
      },
      reviewerId,
    );

    console.log(
      `[DISPOSITION] ${verdict === "APPROVED" ? "✅" : "❌"} ${verdict}: ` +
        `case=${caseId}, subject=${subject.legalName}, ` +
        `reviewer=${reviewerId}, fourEyes=${fourEyesRequired}/${fourEyesSatisfied}, ` +
        `downstream=${downstreamAction}, hash=${dispositionHash.slice(0, 16)}…`,
    );

    return {
      caseId,
      subjectId: subject.id,
      verdict,
      reviewerId,
      originalReviewerId,
      fourEyesRequired,
      fourEyesSatisfied,
      dispositionHash,
      downstreamAction,
      decidedAt,
    };
  }); // end transaction
}

// ─── FOUR-EYES LOGIC ───────────────────────────────────────────────────────────

/**
 * Determine if a case requires Four-Eyes dual-signoff.
 *
 * TRIGGERS:
 *   1. Case priority >= threshold (default 80)
 *   2. Subject risk tier is HIGH or ENHANCED
 *   3. Case type involves physical assets (future: payable value > $1M)
 */
function isFourEyesRequired(
  priority: number,
  riskTier: string,
): boolean {
  // Rule 1: High-priority cases
  if (priority >= FOUR_EYES_PRIORITY_THRESHOLD) {
    return true;
  }

  // Rule 2: High-risk subjects
  if (FOUR_EYES_RISK_TIERS.has(riskTier)) {
    return true;
  }

  return false;
}

// ─── REJECTION HANDLER ─────────────────────────────────────────────────────────

/**
 * Execute a REJECTED disposition.
 *
 * - Close the case as REJECTED
 * - Physical shipments remain QUARANTINED (no status change needed)
 * - Refinery lots remain in ASSAY_EXCEPTION (no status change needed)
 * - Insert a FINAL REJECTED decision record
 */
async function executeRejection(
  db: Awaited<ReturnType<typeof import("@/db/drizzle").getDb>>,
  complianceCase: { id: string; subjectId: string; caseType: string },
  subject: { id: string; legalName: string },
  rationale: string,
  dispositionHash: string,
): Promise<string> {
  // Close the case
  await db
    .update(coCases)
    .set({
      status: "REJECTED",
      closedAt: new Date(),
      closedReason: `MANUAL_DISPOSITION_REJECTED: ${rationale}`,
    })
    .where(eq(coCases.id, complianceCase.id));

  // Insert a FINAL REJECTED decision
  await db
    .insert(coDecisions)
    .values({
      caseId: complianceCase.id,
      subjectId: subject.id,
      decisionType: "FINAL",
      decision: "REJECTED",
      reasonCodes: ["MANUAL_DISPOSITION_REJECTED"],
      decisionHash: dispositionHash,
    });

  // Determine downstream context
  if (complianceCase.caseType === "PHYSICAL_SHIPMENT_REVIEW") {
    console.log(
      `[DISPOSITION] Shipment case rejected — shipment remains QUARANTINED.`,
    );
    return "SHIPMENT_REMAINS_QUARANTINED";
  }

  if (complianceCase.caseType === "REFINERY_INTAKE_REVIEW") {
    console.log(
      `[DISPOSITION] Refinery case rejected — lot remains ASSAY_EXCEPTION.`,
    );
    return "LOT_REMAINS_ASSAY_EXCEPTION";
  }

  console.log(
    `[DISPOSITION] Identity/general case rejected — subject ${subject.legalName}.`,
  );
  return "CASE_REJECTED";
}

// ─── APPROVAL HANDLER ──────────────────────────────────────────────────────────

/**
 * Execute an APPROVED disposition with downstream triggers.
 *
 * DOWNSTREAM ROUTING:
 *   - Identity cases (ONBOARDING, PERIODIC_REVIEW, EVENT_DRIVEN_REVIEW):
 *       Generate a FINAL APPROVED co_decisions record, set subject to ACTIVE
 *   - PHYSICAL_SHIPMENT_REVIEW:
 *       Clear the shipment to CLEARED_FOR_INTAKE
 *   - REFINERY_INTAKE_REVIEW:
 *       Clear the lot to SETTLEMENT_READY
 *   - Other case types:
 *       Close case as APPROVED with decision record
 */
async function executeApproval(
  db: Awaited<ReturnType<typeof import("@/db/drizzle").getDb>>,
  complianceCase: { id: string; subjectId: string; caseType: string },
  subject: { id: string; legalName: string; riskTier: string },
  rationale: string,
  dispositionHash: string,
): Promise<string> {
  // Close the case as APPROVED
  await db
    .update(coCases)
    .set({
      status: "APPROVED",
      closedAt: new Date(),
      closedReason: `MANUAL_DISPOSITION_APPROVED: ${rationale}`,
    })
    .where(eq(coCases.id, complianceCase.id));

  // Insert a FINAL APPROVED decision
  await db
    .insert(coDecisions)
    .values({
      caseId: complianceCase.id,
      subjectId: subject.id,
      decisionType: "FINAL",
      decision: "APPROVED",
      reasonCodes: ["MANUAL_DISPOSITION_APPROVED"],
      decisionHash: dispositionHash,
      expiresAt: calculateDispositionExpiry(subject.riskTier),
    })
    .returning();

  // ── Route to downstream engine based on case type ──

  const identityCaseTypes = new Set([
    "ONBOARDING",
    "PERIODIC_REVIEW",
    "EVENT_DRIVEN_REVIEW",
    "WALLET_REVIEW",
    "TRAINING_CERTIFICATION",
  ]);

  if (identityCaseTypes.has(complianceCase.caseType)) {
    // Identity case: activate the subject
    await db
      .update(coSubjects)
      .set({ status: "ACTIVE" })
      .where(eq(coSubjects.id, subject.id));

    console.log(
      `[DISPOSITION] Identity case approved — subject ${subject.legalName} → ACTIVE.`,
    );
    return "SUBJECT_ACTIVATED";
  }

  if (complianceCase.caseType === "PHYSICAL_SHIPMENT_REVIEW") {
    // Find shipments linked to this subject that are QUARANTINED
    // and clear the most recent one
    const quarantinedShipments = await db
      .select()
      .from(coPhysicalShipments)
      .where(eq(coPhysicalShipments.supplierSubjectId, complianceCase.subjectId));

    const quarantined = quarantinedShipments.filter(
      (s) => s.shipmentStatus === "QUARANTINED",
    );

    if (quarantined.length > 0) {
      // Clear the most recently quarantined shipment
      const shipmentToClear = quarantined[quarantined.length - 1];
      await db
        .update(coPhysicalShipments)
        .set({ shipmentStatus: "CLEARED_FOR_INTAKE" })
        .where(eq(coPhysicalShipments.id, shipmentToClear.id));

      console.log(
        `[DISPOSITION] Shipment ${shipmentToClear.id} → CLEARED_FOR_INTAKE.`,
      );
    }

    return "SHIPMENT_CLEARED_FOR_INTAKE";
  }

  if (complianceCase.caseType === "REFINERY_INTAKE_REVIEW") {
    // Find lots linked to this subject that are in ASSAY_EXCEPTION
    const exceptionLots = await db
      .select()
      .from(coRefineryLots)
      .where(eq(coRefineryLots.supplierSubjectId, complianceCase.subjectId));

    const exceptions = exceptionLots.filter(
      (l) => l.assayStatus === "ASSAY_EXCEPTION",
    );

    if (exceptions.length > 0) {
      const lotToClear = exceptions[exceptions.length - 1];
      await db
        .update(coRefineryLots)
        .set({
          assayStatus: "SETTLEMENT_READY",
          settlementReady: true,
        })
        .where(eq(coRefineryLots.id, lotToClear.id));

      console.log(
        `[DISPOSITION] Refinery lot ${lotToClear.id} → SETTLEMENT_READY.`,
      );
    }

    return "LOT_CLEARED_FOR_SETTLEMENT";
  }

  if (complianceCase.caseType === "SETTLEMENT_AUTHORIZATION") {
    // Settlement case manually approved — the operator must now
    // re-run the 6-gate settlement authorization pipeline to
    // generate the actual co_settlement_authorizations record.
    // We activate the subject to unblock re-evaluation.
    await db
      .update(coSubjects)
      .set({ status: "ACTIVE" })
      .where(eq(coSubjects.id, subject.id));

    console.log(
      `[DISPOSITION] Settlement authorization case approved — ` +
        `subject ${subject.legalName} → ACTIVE. Re-run settlement pipeline.`,
    );
    return "SETTLEMENT_CASE_APPROVED_RERUN_PIPELINE";
  }

  // Default: generic approval
  console.log(
    `[DISPOSITION] Generic case ${complianceCase.caseType} approved.`,
  );
  return "CASE_APPROVED";
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

/**
 * Calculate disposition decision expiry based on risk tier.
 *   STANDARD: 365 days
 *   HIGH:     180 days
 *   ENHANCED: 90 days
 */
function calculateDispositionExpiry(riskTier: string): Date {
  const now = Date.now();
  const days =
    riskTier === "ENHANCED" ? 90 : riskTier === "HIGH" ? 180 : 365;
  return new Date(now + days * 24 * 60 * 60 * 1000);
}
