/* ================================================================
   SHIPMENT REVIEW ENGINE — Physical Shipment Case Handler
   ================================================================
   Phase 4.1: Automated case handler for PHYSICAL_SHIPMENT_REVIEW.

   Consumes the output of validateShipmentIntegrity (Phase 3.3)
   and takes action:

     intact=false → QUARANTINED + EVENT_DRIVEN_REVIEW case
     intact=true  → CLEARED_FOR_INTAKE (if DELIVERED_TO_REFINERY)

   All state transitions are logged via audit trail with the
   SHIPMENT_REVIEW_DECIDED event type.

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq, desc, and } from "drizzle-orm";
import {
  coPhysicalShipments,
  coSubjects,
  coCases,
  coPolicySnapshots,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";
import { generateEvidenceHash } from "./evidence-hashing";
import {
  validateShipmentIntegrity,
  type ShipmentIntegrityResult,
} from "./physical-validation-engine";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export type ShipmentReviewVerdict =
  | "CLEARED"
  | "QUARANTINED"
  | "ALREADY_QUARANTINED"
  | "NOT_READY";

export interface ShipmentReviewResult {
  verdict: ShipmentReviewVerdict;
  shipmentId: string;
  previousStatus: string;
  newStatus: string | null;
  integrityResult: ShipmentIntegrityResult;
  reviewCaseId: string | null;
  decisionHash: string;
  reason: string;
  decidedAt: string;
}

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

export class ShipmentNotFoundError extends Error {
  constructor(shipmentId: string) {
    super(`NOT_FOUND: Physical shipment ${shipmentId} does not exist.`);
    this.name = "ShipmentNotFoundError";
  }
}

// ─── REVIEW ENGINE ─────────────────────────────────────────────────────────────

/**
 * Evaluate and disposition a physical shipment.
 *
 * FLOW:
 *   1. Fetch shipment → validate it exists
 *   2. Guard: if already QUARANTINED → return early
 *   3. Run validateShipmentIntegrity()
 *   4a. intact=false → QUARANTINE the shipment + open EVENT_DRIVEN_REVIEW
 *   4b. intact=true + DELIVERED_TO_REFINERY → CLEARED_FOR_INTAKE
 *   4c. intact=true + other status → NOT_READY (no transition)
 *   5. Audit log SHIPMENT_REVIEW_DECIDED
 *
 * @param shipmentId - UUID of the physical shipment to review
 * @param userId     - The operator/system actor performing the review
 * @returns ShipmentReviewResult with verdict and full context
 */
export async function evaluateShipment(
  shipmentId: string,
  userId: string,
): Promise<ShipmentReviewResult> {
  const db = await getDb();
  const decidedAt = new Date().toISOString();

  // ── Step 1: Fetch the shipment ──

  const [shipment] = await db
    .select()
    .from(coPhysicalShipments)
    .where(eq(coPhysicalShipments.id, shipmentId))
    .limit(1);

  if (!shipment) {
    throw new ShipmentNotFoundError(shipmentId);
  }

  const previousStatus = shipment.shipmentStatus;

  // ── Step 2: Guard — already quarantined ──

  if (previousStatus === "QUARANTINED") {
    const decisionHash = generateEvidenceHash({
      shipmentId,
      verdict: "ALREADY_QUARANTINED",
      previousStatus,
      decidedAt,
    });

    return {
      verdict: "ALREADY_QUARANTINED",
      shipmentId,
      previousStatus,
      newStatus: null,
      integrityResult: {
        intact: false,
        shipmentId,
        totalEvents: 0,
        verifiedEvents: 0,
        failedEvents: 0,
        sealMatch: false,
        timelineValid: false,
        breakReason: "Shipment is already quarantined.",
        details: [],
      },
      reviewCaseId: null,
      decisionHash,
      reason: "Shipment was already in QUARANTINED status — no re-evaluation.",
      decidedAt,
    };
  }

  // ── Step 3: Run integrity validation ──

  const integrityResult = await validateShipmentIntegrity(shipmentId);

  // ════════════════════════════════════════════════════════════════
  // Step 4a: FAIL-CLOSED — Integrity violated → QUARANTINE
  // ════════════════════════════════════════════════════════════════

  if (!integrityResult.intact) {
    // Quarantine the shipment
    // CONCURRENCY: Only quarantine if still in previous status
    await db
      .update(coPhysicalShipments)
      .set({ shipmentStatus: "QUARANTINED" })
      .where(
        and(
          eq(coPhysicalShipments.id, shipmentId),
          eq(coPhysicalShipments.shipmentStatus, previousStatus as typeof coPhysicalShipments.shipmentStatus.enumValues[number]),
        ),
      );

    // Open an EVENT_DRIVEN_REVIEW case for the supplier
    const reviewCaseId = await openReviewCase(
      shipment.supplierSubjectId,
      shipmentId,
      integrityResult.breakReason ?? "Shipment integrity check failed.",
      userId,
    );

    const decisionHash = generateEvidenceHash({
      shipmentId,
      verdict: "QUARANTINED",
      previousStatus,
      newStatus: "QUARANTINED",
      breakReason: integrityResult.breakReason,
      totalEvents: integrityResult.totalEvents,
      failedEvents: integrityResult.failedEvents,
      sealMatch: integrityResult.sealMatch,
      timelineValid: integrityResult.timelineValid,
      reviewCaseId,
      decidedAt,
    });

    // Audit trail
    await appendEvent(
      "PHYSICAL_SHIPMENT",
      shipmentId,
      "SHIPMENT_REVIEW_DECIDED",
      {
        shipmentId,
        verdict: "QUARANTINED",
        previousStatus,
        newStatus: "QUARANTINED",
        breakReason: integrityResult.breakReason,
        integrityChecks: {
          totalEvents: integrityResult.totalEvents,
          verifiedEvents: integrityResult.verifiedEvents,
          failedEvents: integrityResult.failedEvents,
          sealMatch: integrityResult.sealMatch,
          timelineValid: integrityResult.timelineValid,
        },
        reviewCaseId,
        decisionHash,
      },
      userId,
    );

    console.error(
      `[SHIPMENT_REVIEW] ⛔ QUARANTINED: shipment=${shipmentId}, ` +
        `reason="${integrityResult.breakReason}", reviewCase=${reviewCaseId}`,
    );

    return {
      verdict: "QUARANTINED",
      shipmentId,
      previousStatus,
      newStatus: "QUARANTINED",
      integrityResult,
      reviewCaseId,
      decisionHash,
      reason: integrityResult.breakReason ?? "Integrity check failed.",
      decidedAt,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Step 4b: PASS — Integrity intact + DELIVERED_TO_REFINERY
  //          → Transition to CLEARED_FOR_INTAKE
  // ════════════════════════════════════════════════════════════════

  if (previousStatus === "DELIVERED_TO_REFINERY") {
    // CONCURRENCY: Conditional guard — only clear if still DELIVERED_TO_REFINERY
    await db
      .update(coPhysicalShipments)
      .set({ shipmentStatus: "CLEARED_FOR_INTAKE" })
      .where(
        and(
          eq(coPhysicalShipments.id, shipmentId),
          eq(coPhysicalShipments.shipmentStatus, "DELIVERED_TO_REFINERY"),
        ),
      );

    const decisionHash = generateEvidenceHash({
      shipmentId,
      verdict: "CLEARED",
      previousStatus,
      newStatus: "CLEARED_FOR_INTAKE",
      integrityChecks: {
        totalEvents: integrityResult.totalEvents,
        verifiedEvents: integrityResult.verifiedEvents,
        sealMatch: integrityResult.sealMatch,
        timelineValid: integrityResult.timelineValid,
      },
      decidedAt,
    });

    // Audit trail
    await appendEvent(
      "PHYSICAL_SHIPMENT",
      shipmentId,
      "SHIPMENT_REVIEW_DECIDED",
      {
        shipmentId,
        verdict: "CLEARED",
        previousStatus,
        newStatus: "CLEARED_FOR_INTAKE",
        integrityChecks: {
          totalEvents: integrityResult.totalEvents,
          verifiedEvents: integrityResult.verifiedEvents,
          failedEvents: 0,
          sealMatch: integrityResult.sealMatch,
          timelineValid: integrityResult.timelineValid,
        },
        decisionHash,
      },
      userId,
    );

    console.log(
      `[SHIPMENT_REVIEW] ✅ CLEARED: shipment=${shipmentId}, ` +
        `events=${integrityResult.totalEvents}, verified=${integrityResult.verifiedEvents}, ` +
        `seal_match=${integrityResult.sealMatch}`,
    );

    return {
      verdict: "CLEARED",
      shipmentId,
      previousStatus,
      newStatus: "CLEARED_FOR_INTAKE",
      integrityResult,
      reviewCaseId: null,
      decisionHash,
      reason: "All integrity checks passed. Shipment cleared for refinery intake.",
      decidedAt,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Step 4c: NOT_READY — Integrity intact but wrong status
  // (e.g., still IN_TRANSIT — can't clear yet)
  // ════════════════════════════════════════════════════════════════

  const decisionHash = generateEvidenceHash({
    shipmentId,
    verdict: "NOT_READY",
    previousStatus,
    integrityIntact: true,
    decidedAt,
  });

  console.log(
    `[SHIPMENT_REVIEW] ⏳ NOT_READY: shipment=${shipmentId}, ` +
      `status=${previousStatus} — integrity passed but shipment not yet ` +
      `DELIVERED_TO_REFINERY.`,
  );

  return {
    verdict: "NOT_READY",
    shipmentId,
    previousStatus,
    newStatus: null,
    integrityResult,
    reviewCaseId: null,
    decisionHash,
    reason:
      `Integrity checks passed, but shipment status is "${previousStatus}" — ` +
      `must be "DELIVERED_TO_REFINERY" before clearing for intake.`,
    decidedAt,
  };
}

// ─── INTERNAL HELPERS ──────────────────────────────────────────────────────────

/**
 * Open an EVENT_DRIVEN_REVIEW case for the supplier when a shipment
 * fails integrity checks and is quarantined.
 *
 * @returns The ID of the newly created compliance case
 */
async function openReviewCase(
  supplierSubjectId: string,
  shipmentId: string,
  breakReason: string,
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
      `[SHIPMENT_REVIEW] Supplier ${supplierSubjectId} not found — ` +
        `cannot open review case for shipment ${shipmentId}.`,
    );
    // Return a sentinel — do not crash the quarantine flow
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
      `[SHIPMENT_REVIEW] No policy snapshot found — ` +
        `cannot open review case for shipment ${shipmentId}.`,
    );
    return "NO_POLICY_SNAPSHOT";
  }

  // Create the review case
  const [reviewCase] = await db
    .insert(coCases)
    .values({
      subjectId: supplierSubjectId,
      caseType: "PHYSICAL_SHIPMENT_REVIEW",
      status: "OPEN",
      priority: 90, // High priority — quarantine event
      policySnapshotId: policySnapshot.id,
      closedReason: null,
    })
    .returning();

  // Audit the case creation
  await appendEvent(
    "COMPLIANCE_CASE",
    reviewCase.id,
    "SHIPMENT_REVIEW_DECIDED",
    {
      shipmentId,
      verdict: "QUARANTINED",
      previousStatus: "DELIVERED_TO_REFINERY",
      newStatus: "QUARANTINED",
      caseId: reviewCase.id,
      subjectId: supplierSubjectId,
      subjectName: supplier.legalName,
      reason: breakReason,
      action: "EVENT_DRIVEN_REVIEW_OPENED",
    },
    userId,
  );

  console.log(
    `[SHIPMENT_REVIEW] Opened PHYSICAL_SHIPMENT_REVIEW case ${reviewCase.id} ` +
      `for supplier "${supplier.legalName}" (shipment=${shipmentId})`,
  );

  return reviewCase.id;
}
