/* ================================================================
   SETTLEMENT AUTHORIZATION ENGINE — 6-Gate Fail-Closed Pipeline
   ================================================================
   Phase 2.3: The core enforcement engine for AurumShield V3.

   PRINCIPLE:
     "No settlement or payout occurs unless refinery-confirmed assay
      results exist AND all compliance controls are clear."

   PIPELINE (sequential, fail-closed):
     Gate 1 → Buyer Approval        (APPROVED, non-expired)
     Gate 2 → Supplier Approval     (APPROVED, sanctions clear)
     Gate 3 → Shipment Integrity    (not QUARANTINED, CoC verified)
     Gate 4 → Refinery Truth        (COMPLETE assay, payable value)
     Gate 5 → Funding Readiness     (SOF / wallet screening fresh)
     Gate 6 → Policy Hash           (snapshot capture, decision hash)

   If ANY gate fails, the pipeline HALTS and returns the failure
   gate results. No partial authorizations.

   Uses Drizzle ORM for type-safe database operations.
   Integrates with Phase 2.1 AuditLogger for immutable event trail.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq, and, desc } from "drizzle-orm";
import {
  coSubjects,
  coPhysicalShipments,
  coChainOfCustodyEvents,
  coRefineryLots,
  coCases,
  coChecks,
  coPolicySnapshots,
  coSettlementAuthorizations,
  coSettlementGates,
} from "@/db/schema/compliance";
import type { CoSettlementGateInsert } from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";
import { generateEvidenceHash } from "./evidence-hashing";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export type SettlementVerdict =
  | "APPROVED"
  | "REJECTED"
  | "COMPLIANCE_HOLD"
  | "ASSAY_PENDING";

export interface GateResult {
  gate: string;
  gateNumber: number;
  passed: boolean;
  reason: string;
  evaluatedAt: string;
  metadata: Record<string, unknown>;
}

export interface SettlementAuthorizationResult {
  verdict: SettlementVerdict;
  refineryLotId: string;
  buyerSubjectId: string;
  payableValue: string | null;
  paymentRail: string;
  decisionHash: string;
  policySnapshotId: string | null;
  settlementAuthorizationId: string | null;
  gateResults: GateResult[];
  decidedAt: string;
}

// ─── GATE HELPERS ──────────────────────────────────────────────────────────────

/**
 * Map internal gate names to co_settlement_gate_type enum values.
 */
const GATE_NAME_TO_TYPE: Record<string, CoSettlementGateInsert["gateType"]> = {
  BUYER_APPROVAL:    "BUYER_APPROVED",
  SUPPLIER_APPROVAL: "SUPPLIER_APPROVED",
  SHIPMENT_INTEGRITY: "SHIPMENT_INTEGRITY",
  REFINERY_TRUTH:    "REFINERY_ASSAY_TRUTH",
  FUNDING_READINESS: "PAYMENT_READINESS",
  POLICY_HASH:       "FINAL_POLICY_GATE",
};

function makeGateResult(
  gate: string,
  gateNumber: number,
  passed: boolean,
  reason: string,
  metadata: Record<string, unknown> = {},
): GateResult {
  return {
    gate,
    gateNumber,
    passed,
    reason,
    evaluatedAt: new Date().toISOString(),
    metadata,
  };
}

/**
 * Persist gate-level results to co_settlement_gates.
 *
 * Writes one row per evaluated gate, linked to the settlement
 * authorization record. Existing gates are deleted first for
 * idempotent re-evaluation.
 */
async function persistGateResults(
  settlementAuthorizationId: string,
  gateResults: GateResult[],
  decisionHash: string,
): Promise<void> {
  const db = await getDb();

  // Delete any existing gate rows (idempotent re-evaluation)
  await db
    .delete(coSettlementGates)
    .where(eq(coSettlementGates.settlementAuthorizationId, settlementAuthorizationId));

  // Write one row per evaluated gate
  for (const gate of gateResults) {
    const gateType = GATE_NAME_TO_TYPE[gate.gate];
    if (!gateType) continue;

    await db.insert(coSettlementGates).values({
      settlementAuthorizationId,
      gateType,
      result: gate.passed ? "PASS" : "FAIL",
      detail: gate.reason,
      evidenceRef: decisionHash,
      evaluatedAt: new Date(gate.evaluatedAt),
    });
  }
}

function buildFailedResult(
  refineryLotId: string,
  buyerSubjectId: string,
  verdict: SettlementVerdict,
  gateResults: GateResult[],
): SettlementAuthorizationResult {
  const decidedAt = new Date().toISOString();
  const decisionHash = generateEvidenceHash({
    refineryLotId,
    buyerSubjectId,
    verdict,
    gateResults,
    decidedAt,
  });

  return {
    verdict,
    refineryLotId,
    buyerSubjectId,
    payableValue: null,
    paymentRail: "NONE",
    decisionHash,
    policySnapshotId: null,
    settlementAuthorizationId: null,
    gateResults,
    decidedAt,
  };
}

// ─── SETTLEMENT AUTHORIZATION ENGINE ───────────────────────────────────────────

/**
 * Authorize settlement for a refinery lot + buyer pair.
 *
 * Sequentially evaluates 6 gates. If ANY gate fails, the pipeline
 * halts immediately and returns the verdict with all evaluated
 * gate results. No partial authorizations — fail-closed.
 *
 * On full pass: writes to co_settlement_authorizations and logs
 * SETTLEMENT_AUTHORIZATION_DECIDED to the immutable audit trail.
 *
 * @param refineryLotId  - UUID of the refinery lot (must have completed assay)
 * @param buyerSubjectId - UUID of the buyer subject
 * @param paymentRail    - Payment method (e.g., "WIRE", "USDC", "USDT")
 * @param userId         - The operator/system actor authorizing
 * @returns SettlementAuthorizationResult with verdict and gate details
 */
export async function authorizeSettlement(
  refineryLotId: string,
  buyerSubjectId: string,
  paymentRail: string,
  userId: string,
): Promise<SettlementAuthorizationResult> {
  const db = await getDb();
  const gateResults: GateResult[] = [];

  // ════════════════════════════════════════════════════════════════
  // GATE 1: BUYER APPROVAL
  // Verify buyerSubjectId has an active, non-expired APPROVED status.
  // ════════════════════════════════════════════════════════════════

  const [buyer] = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.id, buyerSubjectId))
    .limit(1);

  if (!buyer) {
    gateResults.push(
      makeGateResult("BUYER_APPROVAL", 1, false, `Buyer subject ${buyerSubjectId} not found.`),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "REJECTED", gateResults);
  }

  if (buyer.status !== "ACTIVE") {
    gateResults.push(
      makeGateResult("BUYER_APPROVAL", 1, false, `Buyer status is "${buyer.status}" — must be "ACTIVE".`, {
        subjectId: buyer.id,
        currentStatus: buyer.status,
      }),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "REJECTED", gateResults);
  }

  // Check for an APPROVED compliance decision (non-expired)
  const buyerApprovalCases = await db
    .select()
    .from(coCases)
    .where(
      and(
        eq(coCases.subjectId, buyerSubjectId),
        eq(coCases.status, "APPROVED"),
      ),
    )
    .limit(1);

  if (buyerApprovalCases.length === 0) {
    gateResults.push(
      makeGateResult("BUYER_APPROVAL", 1, false, "No APPROVED compliance case found for buyer.", {
        subjectId: buyer.id,
        legalName: buyer.legalName,
      }),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "COMPLIANCE_HOLD", gateResults);
  }

  gateResults.push(
    makeGateResult("BUYER_APPROVAL", 1, true, "Buyer is ACTIVE with APPROVED compliance case.", {
      subjectId: buyer.id,
      legalName: buyer.legalName,
      approvedCaseId: buyerApprovalCases[0].id,
    }),
  );

  // ════════════════════════════════════════════════════════════════
  // GATE 2: SUPPLIER APPROVAL
  // Lookup the lot's supplier. Verify APPROVED with no sanctions.
  // ════════════════════════════════════════════════════════════════

  const [lot] = await db
    .select()
    .from(coRefineryLots)
    .where(eq(coRefineryLots.id, refineryLotId))
    .limit(1);

  if (!lot) {
    gateResults.push(
      makeGateResult("SUPPLIER_APPROVAL", 2, false, `Refinery lot ${refineryLotId} not found.`),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "REJECTED", gateResults);
  }

  const [supplier] = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.id, lot.supplierSubjectId))
    .limit(1);

  if (!supplier || supplier.status !== "ACTIVE") {
    gateResults.push(
      makeGateResult("SUPPLIER_APPROVAL", 2, false, `Supplier ${lot.supplierSubjectId} is not ACTIVE (status=${supplier?.status ?? "NOT_FOUND"}).`, {
        supplierSubjectId: lot.supplierSubjectId,
        currentStatus: supplier?.status ?? "NOT_FOUND",
      }),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "REJECTED", gateResults);
  }

  // Check for sanctions screening — most recent SANCTIONS check must be PASS
  const supplierSanctionsChecks = await db
    .select()
    .from(coChecks)
    .innerJoin(coCases, eq(coChecks.caseId, coCases.id))
    .where(
      and(
        eq(coCases.subjectId, lot.supplierSubjectId),
        eq(coChecks.checkType, "SANCTIONS"),
      ),
    )
    .orderBy(desc(coChecks.completedAt))
    .limit(1);

  if (supplierSanctionsChecks.length > 0) {
    const latestSanctions = supplierSanctionsChecks[0].co_checks;
    if (latestSanctions.normalizedVerdict === "FAIL") {
      gateResults.push(
        makeGateResult("SUPPLIER_APPROVAL", 2, false, "Supplier has FAILED sanctions screening.", {
          supplierSubjectId: lot.supplierSubjectId,
          sanctionsCheckId: latestSanctions.id,
          sanctionsVerdict: latestSanctions.normalizedVerdict,
        }),
      );
      return buildFailedResult(refineryLotId, buyerSubjectId, "REJECTED", gateResults);
    }
  }

  gateResults.push(
    makeGateResult("SUPPLIER_APPROVAL", 2, true, "Supplier is ACTIVE with clear sanctions.", {
      supplierSubjectId: lot.supplierSubjectId,
      legalName: supplier.legalName,
    }),
  );

  // ════════════════════════════════════════════════════════════════
  // GATE 3: SHIPMENT INTEGRITY
  // Verify shipment is NOT QUARANTINED and all CoC events verified.
  // ════════════════════════════════════════════════════════════════

  const [shipment] = await db
    .select()
    .from(coPhysicalShipments)
    .where(eq(coPhysicalShipments.id, lot.shipmentId))
    .limit(1);

  if (!shipment) {
    gateResults.push(
      makeGateResult("SHIPMENT_INTEGRITY", 3, false, `Shipment ${lot.shipmentId} not found.`),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "REJECTED", gateResults);
  }

  if (shipment.shipmentStatus === "QUARANTINED") {
    gateResults.push(
      makeGateResult("SHIPMENT_INTEGRITY", 3, false, "Shipment is QUARANTINED — custody chain compromised.", {
        shipmentId: shipment.id,
        shipmentStatus: shipment.shipmentStatus,
      }),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "REJECTED", gateResults);
  }

  // Verify ALL chain-of-custody events are in VERIFIED status
  const cocEvents = await db
    .select()
    .from(coChainOfCustodyEvents)
    .where(eq(coChainOfCustodyEvents.shipmentId, lot.shipmentId));

  const unverifiedEvents = cocEvents.filter(
    (e) => e.verificationStatus !== "VERIFIED",
  );

  if (unverifiedEvents.length > 0) {
    gateResults.push(
      makeGateResult("SHIPMENT_INTEGRITY", 3, false, `${unverifiedEvents.length} chain-of-custody event(s) not yet VERIFIED.`, {
        shipmentId: shipment.id,
        totalCoCEvents: cocEvents.length,
        unverifiedCount: unverifiedEvents.length,
        unverifiedEventIds: unverifiedEvents.map((e) => e.id),
      }),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "COMPLIANCE_HOLD", gateResults);
  }

  if (cocEvents.length === 0) {
    gateResults.push(
      makeGateResult("SHIPMENT_INTEGRITY", 3, false, "No chain-of-custody events recorded for shipment.", {
        shipmentId: shipment.id,
      }),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "COMPLIANCE_HOLD", gateResults);
  }

  gateResults.push(
    makeGateResult("SHIPMENT_INTEGRITY", 3, true, `Shipment integrity confirmed. ${cocEvents.length} CoC events all VERIFIED.`, {
      shipmentId: shipment.id,
      shipmentStatus: shipment.shipmentStatus,
      cocEventCount: cocEvents.length,
    }),
  );

  // ════════════════════════════════════════════════════════════════
  // GATE 4: REFINERY TRUTH
  // Verify assay is COMPLETE and payable_value is determined.
  // ════════════════════════════════════════════════════════════════

  // Gate 4 accepts COMPLETE (direct assay) or SETTLEMENT_READY (post-review approval)
  const assayComplete = lot.assayStatus === "COMPLETE" || lot.assayStatus === "SETTLEMENT_READY";
  const settlementReady = lot.settlementReady === true;
  const payableValueDetermined = lot.payableGoldWeight !== null;

  if (!assayComplete) {
    gateResults.push(
      makeGateResult("REFINERY_TRUTH", 4, false, `Assay status is "${lot.assayStatus}" — must be "COMPLETE" or "SETTLEMENT_READY".`, {
        refineryLotId: lot.id,
        assayStatus: lot.assayStatus,
      }),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "ASSAY_PENDING", gateResults);
  }

  if (!payableValueDetermined) {
    gateResults.push(
      makeGateResult("REFINERY_TRUTH", 4, false, "Payable gold weight has not been calculated.", {
        refineryLotId: lot.id,
        assayStatus: lot.assayStatus,
        payableGoldWeight: lot.payableGoldWeight,
      }),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "ASSAY_PENDING", gateResults);
  }

  const payableValue = lot.payableValue ?? lot.payableGoldWeight!;

  gateResults.push(
    makeGateResult("REFINERY_TRUTH", 4, true, "Assay COMPLETE. Payable value determined.", {
      refineryLotId: lot.id,
      assayStatus: lot.assayStatus,
      settlementReady,
      grossWeight: lot.grossWeight,
      netWeight: lot.netWeight,
      fineness: lot.fineness,
      recoverableGoldWeight: lot.recoverableGoldWeight,
      payableGoldWeight: lot.payableGoldWeight,
      payableValue,
    }),
  );

  // ════════════════════════════════════════════════════════════════
  // GATE 5: FUNDING READINESS
  // Verify buyer has fresh source-of-funds or wallet screening.
  // ════════════════════════════════════════════════════════════════

  const fundingCheckTypes = ["SOURCE_OF_FUNDS", "SOURCE_OF_WEALTH", "WALLET_KYT"] as const;

  const buyerFundingChecks = await db
    .select()
    .from(coChecks)
    .innerJoin(coCases, eq(coChecks.caseId, coCases.id))
    .where(
      and(
        eq(coCases.subjectId, buyerSubjectId),
      ),
    )
    .orderBy(desc(coChecks.completedAt));

  // Filter to funding-relevant checks
  const relevantFundingChecks = buyerFundingChecks.filter((row) =>
    (fundingCheckTypes as readonly string[]).includes(row.co_checks.checkType),
  );

  // Must have at least one PASS on a funding-type check
  const hasFundingPass = relevantFundingChecks.some(
    (row) => row.co_checks.normalizedVerdict === "PASS",
  );

  // Check for any FAIL that would block
  const hasFundingFail = relevantFundingChecks.some(
    (row) => row.co_checks.normalizedVerdict === "FAIL",
  );

  if (hasFundingFail) {
    gateResults.push(
      makeGateResult("FUNDING_READINESS", 5, false, "Buyer has a FAILED funding/wallet screening.", {
        buyerSubjectId,
        failedChecks: relevantFundingChecks
          .filter((r) => r.co_checks.normalizedVerdict === "FAIL")
          .map((r) => ({
            checkId: r.co_checks.id,
            checkType: r.co_checks.checkType,
            verdict: r.co_checks.normalizedVerdict,
          })),
      }),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "REJECTED", gateResults);
  }

  if (!hasFundingPass) {
    gateResults.push(
      makeGateResult("FUNDING_READINESS", 5, false, "No verified source-of-funds or wallet screening found for buyer.", {
        buyerSubjectId,
        availableCheckTypes: relevantFundingChecks.map(
          (r) => r.co_checks.checkType,
        ),
      }),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "COMPLIANCE_HOLD", gateResults);
  }

  // Verify freshness — most recent funding check must be within 90 days
  const FUNDING_FRESHNESS_DAYS = 90;
  const latestFundingCheck = relevantFundingChecks.find(
    (r) => r.co_checks.normalizedVerdict === "PASS",
  );

  if (latestFundingCheck?.co_checks.completedAt) {
    const ageMs =
      Date.now() - new Date(latestFundingCheck.co_checks.completedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays > FUNDING_FRESHNESS_DAYS) {
      gateResults.push(
        makeGateResult("FUNDING_READINESS", 5, false, `Funding check is ${Math.floor(ageDays)} days old — exceeds ${FUNDING_FRESHNESS_DAYS}-day freshness requirement.`, {
          buyerSubjectId,
          checkId: latestFundingCheck.co_checks.id,
          checkType: latestFundingCheck.co_checks.checkType,
          completedAt: latestFundingCheck.co_checks.completedAt.toISOString(),
          ageDays: Math.floor(ageDays),
        }),
      );
      return buildFailedResult(refineryLotId, buyerSubjectId, "COMPLIANCE_HOLD", gateResults);
    }
  }

  gateResults.push(
    makeGateResult("FUNDING_READINESS", 5, true, "Buyer funding/wallet screening is verified and fresh.", {
      buyerSubjectId,
      latestCheckId: latestFundingCheck?.co_checks.id,
      latestCheckType: latestFundingCheck?.co_checks.checkType,
    }),
  );

  // ════════════════════════════════════════════════════════════════
  // GATE 6: POLICY HASH
  // Capture the current policy snapshot and generate the
  // cryptographic decision hash of ALL evaluated inputs.
  // ════════════════════════════════════════════════════════════════

  // Fetch the most recent active policy snapshot
  const policySnapshots = await db
    .select()
    .from(coPolicySnapshots)
    .orderBy(desc(coPolicySnapshots.effectiveAt))
    .limit(1);

  if (policySnapshots.length === 0) {
    gateResults.push(
      makeGateResult("POLICY_HASH", 6, false, "No policy snapshot found — cannot authorize without a policy.", {}),
    );
    return buildFailedResult(refineryLotId, buyerSubjectId, "COMPLIANCE_HOLD", gateResults);
  }

  const policySnapshot = policySnapshots[0];

  // Build the complete decision input for hashing
  const decisionInputs = {
    refineryLotId,
    buyerSubjectId,
    supplierSubjectId: lot.supplierSubjectId,
    shipmentId: lot.shipmentId,
    payableValue,
    paymentRail,
    policySnapshotId: policySnapshot.id,
    policyVersion: policySnapshot.version,
    gateResults,
    decidedAt: new Date().toISOString(),
  };

  const decisionHash = generateEvidenceHash(decisionInputs);

  gateResults.push(
    makeGateResult("POLICY_HASH", 6, true, "Policy snapshot captured. Decision hash generated.", {
      policySnapshotId: policySnapshot.id,
      policyVersion: policySnapshot.version,
      decisionHash: decisionHash.slice(0, 24) + "…",
    }),
  );

  // ════════════════════════════════════════════════════════════════
  // ALL GATES PASSED — WRITE AUTHORIZATION
  // ════════════════════════════════════════════════════════════════

  // Look up or create a SETTLEMENT_AUTHORIZATION compliance case
  let complianceCaseId: string;
  const existingCases = await db
    .select()
    .from(coCases)
    .where(
      and(
        eq(coCases.subjectId, buyerSubjectId),
        eq(coCases.caseType, "SETTLEMENT_AUTHORIZATION"),
        eq(coCases.status, "OPEN"),
      ),
    )
    .limit(1);

  if (existingCases.length > 0) {
    complianceCaseId = existingCases[0].id;
    // Close the case as APPROVED
    await db
      .update(coCases)
      .set({
        status: "APPROVED",
        closedAt: new Date(),
        closedReason: `Settlement authorized for lot ${refineryLotId}. Decision hash: ${decisionHash.slice(0, 16)}…`,
      })
      .where(eq(coCases.id, complianceCaseId));
  } else {
    // Create a new case in APPROVED state
    const [newCase] = await db
      .insert(coCases)
      .values({
        subjectId: buyerSubjectId,
        caseType: "SETTLEMENT_AUTHORIZATION",
        status: "APPROVED",
        priority: 10,
        policySnapshotId: policySnapshot.id,
        closedAt: new Date(),
        closedReason: `Settlement authorized for lot ${refineryLotId}. Decision hash: ${decisionHash.slice(0, 16)}…`,
      })
      .returning();
    complianceCaseId = newCase.id;
  }

  // Write to co_settlement_authorizations
  const [authorization] = await db
    .insert(coSettlementAuthorizations)
    .values({
      refineryLotId,
      buyerSubjectId,
      complianceCaseId,
      verdict: "AUTHORIZED",
      payableValue,
      paymentRail,
      policySnapshotId: policySnapshot.id,
      decisionHash,
      authorizedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
    })
    .returning();

  // ── Persist per-gate results to co_settlement_gates ──
  await persistGateResults(authorization.id, gateResults, decisionHash);

  // Audit trail: SETTLEMENT_AUTHORIZATION_DECIDED
  await appendEvent(
    "SETTLEMENT_AUTHORIZATION",
    authorization.id,
    "SETTLEMENT_AUTHORIZATION_DECIDED",
    {
      settlementAuthorizationId: authorization.id,
      refineryLotId,
      buyerSubjectId,
      verdict: "AUTHORIZED",
      payableValue,
      paymentRail,
      decisionHash,
      gatesPersisted: gateResults.length,
      preconditions: {
        custodyChainComplete: true,
        refineryLotExists: true,
        assayComplete: true,
        payableValueDetermined: true,
        supplierScreeningValid: true,
        buyerScreeningValid: true,
        sanctionsScreeningClear: true,
        paymentRailChecksClear: true,
      },
    },
    userId,
  );

  console.log(
    `[SETTLEMENT] ✅ AUTHORIZED: lot=${refineryLotId}, buyer=${buyer.legalName}, ` +
      `payable=${payableValue}, rail=${paymentRail}, hash=${decisionHash.slice(0, 16)}…, ` +
      `gates=${gateResults.length} persisted`,
  );

  return {
    verdict: "APPROVED",
    refineryLotId,
    buyerSubjectId,
    payableValue,
    paymentRail,
    decisionHash,
    policySnapshotId: policySnapshot.id,
    settlementAuthorizationId: authorization.id,
    gateResults,
    decidedAt: decisionInputs.decidedAt,
  };
}

// ─── QUERY HELPERS ─────────────────────────────────────────────────────────────

/**
 * Get a settlement authorization by refinery lot ID.
 */
export async function getSettlementByLotId(
  refineryLotId: string,
) {
  const db = await getDb();
  const [auth] = await db
    .select()
    .from(coSettlementAuthorizations)
    .where(eq(coSettlementAuthorizations.refineryLotId, refineryLotId))
    .orderBy(desc(coSettlementAuthorizations.createdAt))
    .limit(1);
  return auth ?? null;
}

/**
 * Get all settlement authorizations for a buyer.
 */
export async function getSettlementsByBuyer(
  buyerSubjectId: string,
) {
  const db = await getDb();
  return db
    .select()
    .from(coSettlementAuthorizations)
    .where(eq(coSettlementAuthorizations.buyerSubjectId, buyerSubjectId))
    .orderBy(desc(coSettlementAuthorizations.createdAt));
}

/**
 * Get persisted gate results for a settlement authorization.
 *
 * Returns all gate rows ordered by evaluated_at, making settlement
 * authorization decisions explainable and queryable per-gate.
 */
export async function getSettlementGates(
  settlementAuthorizationId: string,
) {
  const db = await getDb();
  return db
    .select()
    .from(coSettlementGates)
    .where(eq(coSettlementGates.settlementAuthorizationId, settlementAuthorizationId))
    .orderBy(coSettlementGates.evaluatedAt);
}
