/* ================================================================
   REFINERY INTAKE REVIEW ENGINE — Lot Case Handler
   ================================================================
   Phase 4.2: Automated case handler for REFINERY_INTAKE_REVIEW.

   Consumes the output of validateAssayEconomics (Phase 3.3)
   and takes action:

     valid=false → ASSAY_EXCEPTION + EVENT_DRIVEN_REVIEW case
     valid=true  → SETTLEMENT_READY + evidence hash of assay cert

   All state transitions are logged via audit trail with the
   REFINERY_LOT_APPROVED or REFINERY_LOT_EXCEPTION event type.

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq, desc } from "drizzle-orm";
import {
  coRefineryLots,
  coSubjects,
  coCases,
  coPolicySnapshots,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";
import { generateEvidenceHash } from "./evidence-hashing";
import {
  validateAssayEconomics,
  type AssayEconomicsResult,
} from "./physical-validation-engine";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export type RefineryReviewVerdict =
  | "APPROVED"
  | "EXCEPTION"
  | "ALREADY_EXCEPTION"
  | "ASSAY_NOT_COMPLETE";

export interface RefineryReviewResult {
  verdict: RefineryReviewVerdict;
  lotId: string;
  previousAssayStatus: string;
  newAssayStatus: string | null;
  economicsResult: AssayEconomicsResult;
  reviewCaseId: string | null;
  evidenceHash: string;
  reason: string;
  decidedAt: string;
}

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

export class LotNotFoundError extends Error {
  constructor(lotId: string) {
    super(`NOT_FOUND: Refinery lot ${lotId} does not exist.`);
    this.name = "LotNotFoundError";
  }
}

// ─── REVIEW ENGINE ─────────────────────────────────────────────────────────────

/**
 * Evaluate and disposition a refinery lot after assay.
 *
 * FLOW:
 *   1. Fetch lot → validate it exists
 *   2. Guard: if already ASSAY_EXCEPTION → return early
 *   3. Guard: if assay not yet COMPLETE → return ASSAY_NOT_COMPLETE
 *   4. Run validateAssayEconomics()
 *   5a. valid=false → ASSAY_EXCEPTION + open EVENT_DRIVEN_REVIEW
 *   5b. valid=true → SETTLEMENT_READY + evidence hash
 *   6. Audit log REFINERY_LOT_APPROVED / REFINERY_LOT_EXCEPTION
 *
 * @param lotId  - UUID of the refinery lot to review
 * @param userId - The operator/system actor performing the review
 * @returns RefineryReviewResult with verdict and full context
 */
export async function evaluateRefineryLot(
  lotId: string,
  userId: string,
): Promise<RefineryReviewResult> {
  const db = await getDb();
  const decidedAt = new Date().toISOString();

  // ── Step 1: Fetch the lot ──

  const [lot] = await db
    .select()
    .from(coRefineryLots)
    .where(eq(coRefineryLots.id, lotId))
    .limit(1);

  if (!lot) {
    throw new LotNotFoundError(lotId);
  }

  const previousAssayStatus = lot.assayStatus;

  // ── Step 2: Guard — already in ASSAY_EXCEPTION ──

  if (previousAssayStatus === "ASSAY_EXCEPTION") {
    const evidenceHash = generateEvidenceHash({
      lotId,
      verdict: "ALREADY_EXCEPTION",
      previousAssayStatus,
      decidedAt,
    });

    return {
      verdict: "ALREADY_EXCEPTION",
      lotId,
      previousAssayStatus,
      newAssayStatus: null,
      economicsResult: {
        valid: false,
        lotId,
        grossWeight: 0,
        netWeight: 0,
        fineness: 0,
        recoverableGoldWeight: 0,
        payableGoldWeight: 0,
        storedPayableValue: null,
        calculatedPayableValue: 0,
        oraclePrice: 0,
        discountRate: 0,
        valueDeltaPct: null,
        assayCertificateRef: null,
        exceptionReason: "Lot is already in ASSAY_EXCEPTION status.",
        assertions: [],
      },
      reviewCaseId: null,
      evidenceHash,
      reason: "Lot was already in ASSAY_EXCEPTION status — no re-evaluation.",
      decidedAt,
    };
  }

  // ── Step 3: Guard — assay must be COMPLETE ──

  if (previousAssayStatus !== "COMPLETE") {
    const evidenceHash = generateEvidenceHash({
      lotId,
      verdict: "ASSAY_NOT_COMPLETE",
      previousAssayStatus,
      decidedAt,
    });

    return {
      verdict: "ASSAY_NOT_COMPLETE",
      lotId,
      previousAssayStatus,
      newAssayStatus: null,
      economicsResult: {
        valid: false,
        lotId,
        grossWeight: 0,
        netWeight: 0,
        fineness: 0,
        recoverableGoldWeight: 0,
        payableGoldWeight: 0,
        storedPayableValue: null,
        calculatedPayableValue: 0,
        oraclePrice: 0,
        discountRate: 0,
        valueDeltaPct: null,
        assayCertificateRef: null,
        exceptionReason: `Assay status is "${previousAssayStatus}" — must be "COMPLETE".`,
        assertions: [],
      },
      reviewCaseId: null,
      evidenceHash,
      reason:
        `Assay status is "${previousAssayStatus}" — lot cannot be reviewed ` +
        `until assay is "COMPLETE".`,
      decidedAt,
    };
  }

  // ── Step 4: Run economics validation ──

  const economicsResult = await validateAssayEconomics(lotId);

  // ════════════════════════════════════════════════════════════════
  // Step 5a: EXCEPTION — Economics invalid → ASSAY_EXCEPTION
  // ════════════════════════════════════════════════════════════════

  if (!economicsResult.valid) {
    // Transition lot to ASSAY_EXCEPTION
    await db
      .update(coRefineryLots)
      .set({
        assayStatus: "ASSAY_EXCEPTION",
        settlementReady: false,
      })
      .where(eq(coRefineryLots.id, lotId));

    // Open an EVENT_DRIVEN_REVIEW case for the supplier
    const reviewCaseId = await openRefineryReviewCase(
      lot.supplierSubjectId,
      lotId,
      economicsResult.exceptionReason ?? "Assay economics validation failed.",
      userId,
    );

    const evidenceHash = generateEvidenceHash({
      lotId,
      verdict: "EXCEPTION",
      previousAssayStatus,
      newAssayStatus: "ASSAY_EXCEPTION",
      exceptionReason: economicsResult.exceptionReason,
      grossWeight: economicsResult.grossWeight,
      netWeight: economicsResult.netWeight,
      fineness: economicsResult.fineness,
      recoverableGoldWeight: economicsResult.recoverableGoldWeight,
      calculatedPayableValue: economicsResult.calculatedPayableValue,
      assertions: economicsResult.assertions,
      reviewCaseId,
      decidedAt,
    });

    // Audit trail
    await appendEvent(
      "REFINERY_LOT",
      lotId,
      "REFINERY_LOT_EXCEPTION",
      {
        lotId,
        verdict: "EXCEPTION",
        previousAssayStatus,
        newAssayStatus: "ASSAY_EXCEPTION",
        grossWeight: economicsResult.grossWeight,
        netWeight: economicsResult.netWeight,
        fineness: economicsResult.fineness,
        recoverableGoldWeight: economicsResult.recoverableGoldWeight,
        payableGoldWeight: economicsResult.payableGoldWeight,
        calculatedPayableValue: economicsResult.calculatedPayableValue,
        oraclePrice: economicsResult.oraclePrice,
        discountRate: economicsResult.discountRate,
        assayCertificateRef: economicsResult.assayCertificateRef,
        exceptionReason: economicsResult.exceptionReason,
        reviewCaseId,
        evidenceHash,
      },
      userId,
    );

    console.error(
      `[REFINERY_REVIEW] ⛔ EXCEPTION: lot=${lotId}, ` +
        `reason="${economicsResult.exceptionReason}", reviewCase=${reviewCaseId}`,
    );

    return {
      verdict: "EXCEPTION",
      lotId,
      previousAssayStatus,
      newAssayStatus: "ASSAY_EXCEPTION",
      economicsResult,
      reviewCaseId,
      evidenceHash,
      reason: economicsResult.exceptionReason ?? "Economics validation failed.",
      decidedAt,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Step 5b: APPROVED — Economics valid → SETTLEMENT_READY
  // ════════════════════════════════════════════════════════════════

  // Generate evidence hash of the assay certificate + calculated value
  const evidenceHash = generateEvidenceHash({
    lotId,
    verdict: "APPROVED",
    previousAssayStatus,
    newAssayStatus: "SETTLEMENT_READY",
    assayCertificateRef: economicsResult.assayCertificateRef,
    grossWeight: economicsResult.grossWeight,
    netWeight: economicsResult.netWeight,
    fineness: economicsResult.fineness,
    recoverableGoldWeight: economicsResult.recoverableGoldWeight,
    payableGoldWeight: economicsResult.payableGoldWeight,
    calculatedPayableValue: economicsResult.calculatedPayableValue,
    storedPayableValue: economicsResult.storedPayableValue,
    oraclePrice: economicsResult.oraclePrice,
    discountRate: economicsResult.discountRate,
    valueDeltaPct: economicsResult.valueDeltaPct,
    decidedAt,
  });

  // Transition lot to SETTLEMENT_READY
  await db
    .update(coRefineryLots)
    .set({
      assayStatus: "SETTLEMENT_READY",
      settlementReady: true,
    })
    .where(eq(coRefineryLots.id, lotId));

  // Audit trail
  await appendEvent(
    "REFINERY_LOT",
    lotId,
    "REFINERY_LOT_APPROVED",
    {
      lotId,
      verdict: "APPROVED",
      previousAssayStatus,
      newAssayStatus: "SETTLEMENT_READY",
      grossWeight: economicsResult.grossWeight,
      netWeight: economicsResult.netWeight,
      fineness: economicsResult.fineness,
      recoverableGoldWeight: economicsResult.recoverableGoldWeight,
      payableGoldWeight: economicsResult.payableGoldWeight,
      calculatedPayableValue: economicsResult.calculatedPayableValue,
      oraclePrice: economicsResult.oraclePrice,
      discountRate: economicsResult.discountRate,
      assayCertificateRef: economicsResult.assayCertificateRef,
      evidenceHash,
    },
    userId,
  );

  console.log(
    `[REFINERY_REVIEW] ✅ APPROVED: lot=${lotId}, ` +
      `payable=$${economicsResult.calculatedPayableValue.toFixed(2)}, ` +
      `fineness=${economicsResult.fineness}, ` +
      `hash=${evidenceHash.slice(0, 16)}…`,
  );

  return {
    verdict: "APPROVED",
    lotId,
    previousAssayStatus,
    newAssayStatus: "SETTLEMENT_READY",
    economicsResult,
    reviewCaseId: null,
    evidenceHash,
    reason: "All assay economics assertions passed. Lot cleared for settlement.",
    decidedAt,
  };
}

// ─── INTERNAL HELPERS ──────────────────────────────────────────────────────────

/**
 * Open a REFINERY_INTAKE_REVIEW case when assay economics fail.
 *
 * @returns The ID of the newly created compliance case
 */
async function openRefineryReviewCase(
  supplierSubjectId: string,
  lotId: string,
  exceptionReason: string,
  userId: string,
): Promise<string> {
  const db = await getDb();

  // Verify supplier exists
  const [supplier] = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.id, supplierSubjectId))
    .limit(1);

  if (!supplier) {
    console.error(
      `[REFINERY_REVIEW] Supplier ${supplierSubjectId} not found — ` +
        `cannot open review case for lot ${lotId}.`,
    );
    return "SUPPLIER_NOT_FOUND";
  }

  // Fetch latest policy snapshot
  const [policySnapshot] = await db
    .select()
    .from(coPolicySnapshots)
    .orderBy(desc(coPolicySnapshots.effectiveAt))
    .limit(1);

  if (!policySnapshot) {
    console.error(
      `[REFINERY_REVIEW] No policy snapshot found — ` +
        `cannot open review case for lot ${lotId}.`,
    );
    return "NO_POLICY_SNAPSHOT";
  }

  // Create the review case
  const [reviewCase] = await db
    .insert(coCases)
    .values({
      subjectId: supplierSubjectId,
      caseType: "REFINERY_INTAKE_REVIEW",
      status: "OPEN",
      priority: 95, // Very high — assay exception
      policySnapshotId: policySnapshot.id,
      closedReason: null,
    })
    .returning();

  // Audit the case creation
  await appendEvent(
    "COMPLIANCE_CASE",
    reviewCase.id,
    "REFINERY_LOT_EXCEPTION",
    {
      lotId,
      verdict: "EXCEPTION",
      previousAssayStatus: "COMPLETE",
      newAssayStatus: "ASSAY_EXCEPTION",
      caseId: reviewCase.id,
      subjectId: supplierSubjectId,
      subjectName: supplier.legalName,
      reason: exceptionReason,
      action: "REFINERY_INTAKE_REVIEW_OPENED",
    },
    userId,
  );

  console.log(
    `[REFINERY_REVIEW] Opened REFINERY_INTAKE_REVIEW case ${reviewCase.id} ` +
      `for supplier "${supplier.legalName}" (lot=${lotId})`,
  );

  return reviewCase.id;
}
