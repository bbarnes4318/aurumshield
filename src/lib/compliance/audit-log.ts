/* ================================================================
   COMPLIANCE AUDIT LOGGER — Immutable Hash-Chained Event Log
   ================================================================
   Phase 2.1: Every critical physical and compliance event is
   written to the co_audit_events table with cryptographic hash
   chaining for tamper detection.

   Hash Chain Model:
     Event[0]: hash = H("GENESIS:" + H(payload))
     Event[N]: hash = H(Event[N-1].hash + ":" + H(payload))

   Verification:
     verifyAuditChain() replays the entire chain from genesis,
     recalculating each hash. Any mismatch indicates tampering.

   Uses the pooled DB client (getPoolClient) for connection reuse.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import {
  generateChainedHash,
} from "./evidence-hashing";

// ─── V3 EVENT TYPES ────────────────────────────────────────────────────────────

/**
 * Exhaustive list of V3 Compliance OS event types.
 * Maps directly to the mine-to-refinery-to-settlement lifecycle.
 */
export const V3_EVENT_TYPES = [
  "SHIPMENT_CREATED",
  "CUSTODY_EVENT_ADDED",
  "BRINKS_HANDOFF_VERIFIED",
  "REFINERY_RECEIPT_RECORDED",
  "ASSAY_COMPLETED",
  "PAYABLE_VALUE_CALCULATED",
  "SETTLEMENT_AUTHORIZATION_DECIDED",
  "COMPLIANCE_DECISION_RENDERED",
  "SHIPMENT_REVIEW_DECIDED",
  "REFINERY_LOT_APPROVED",
  "REFINERY_LOT_EXCEPTION",
  "REVIEWER_ASSIGNED",
  "TASK_GENERATED",
  "TASK_COMPLETED",
  "MANUAL_DISPOSITION_RENDERED",
  // WS5 hardening events
  "CHECK_EXPIRED",
  "PERIODIC_REVIEW_OPENED",
  "PROACTIVE_RESCREEN_TRIGGERED",
  "STALE_CHECK_SWEEP_COMPLETED",
  "SANCTIONS_REFRESH_COMPLETED",
  "IDENFY_RESULT_RECEIVED",
] as const;

export type V3EventType = (typeof V3_EVENT_TYPES)[number];

// ─── V3 AGGREGATE TYPES ────────────────────────────────────────────────────────

export const V3_AGGREGATE_TYPES = [
  "SHIPMENT",
  "PHYSICAL_SHIPMENT",
  "REFINERY_LOT",
  "CUSTODY_CHAIN",
  "COMPLIANCE_CASE",
  "SETTLEMENT_AUTHORIZATION",
  "SUBJECT",
  // WS5 hardening aggregates
  "COMPLIANCE_CHECK",
  "COMPLIANCE_SUBJECT",
  "SYSTEM",
] as const;

export type V3AggregateType = (typeof V3_AGGREGATE_TYPES)[number];

// ─── STRICTLY TYPED EVENT PAYLOADS ─────────────────────────────────────────────

export interface ShipmentCreatedPayload {
  shipmentId: string;
  supplierSubjectId: string;
  refinerySubjectId: string;
  mineReference: string;
  originCountry: string;
  armoredCarrierName: string;
  brinksReference: string | null;
}

export interface CustodyEventAddedPayload {
  shipmentId: string;
  custodyEventId: string;
  eventType: string;
  location: string | null;
  partyFrom: string | null;
  partyTo: string | null;
  sealNumber: string | null;
  verificationStatus: string;
}

export interface BrinksHandoffVerifiedPayload {
  shipmentId: string;
  brinksReference: string;
  sealNumber: string;
  handoffTimestamp: string;
  verifiedBy: string;
}

export interface RefineryReceiptRecordedPayload {
  shipmentId: string;
  refineryLotId: string;
  refinerySubjectId: string;
  receivedAt: string;
  grossWeight: string;
  sealIntact: boolean;
}

export interface AssayCompletedPayload {
  refineryLotId: string;
  grossWeight: string;
  netWeight: string;
  fineness: string;
  recoverableGoldWeight: string;
  assayCertificateRef: string | null;
}

export interface PayableValueCalculatedPayload {
  refineryLotId: string;
  payableGoldWeight: string;
  payableValue: string;
  spotPriceAtCalculation: string;
  calculationMethod: string;
}

export interface SettlementAuthorizationDecidedPayload {
  settlementAuthorizationId: string;
  refineryLotId: string;
  buyerSubjectId: string;
  verdict: string;
  payableValue: string;
  paymentRail: string;
  decisionHash: string;
  gatesPersisted?: number;
  preconditions: {
    custodyChainComplete: boolean;
    refineryLotExists: boolean;
    assayComplete: boolean;
    payableValueDetermined: boolean;
    supplierScreeningValid: boolean;
    buyerScreeningValid: boolean;
    sanctionsScreeningClear: boolean;
    paymentRailChecksClear: boolean;
  };
}

export interface ComplianceDecisionRenderedPayload {
  decisionId: string;
  caseId: string;
  subjectId: string;
  decisionType: "INTERIM" | "FINAL";
  decision: string;
  reasonCodes: string[];
  decisionHash: string;
}

export interface ShipmentReviewDecidedPayload {
  shipmentId: string;
  verdict: string;
  previousStatus: string;
  newStatus: string;
  breakReason?: string;
  integrityChecks?: {
    totalEvents: number;
    verifiedEvents: number;
    failedEvents: number;
    sealMatch: boolean;
    timelineValid: boolean;
  };
  reviewCaseId?: string | null;
  decisionHash?: string;
  /** Present only for case-creation events */
  caseId?: string;
  subjectId?: string;
  subjectName?: string;
  reason?: string;
  action?: string;
}

export interface RefineryLotReviewPayload {
  lotId: string;
  verdict: string;
  previousAssayStatus: string;
  newAssayStatus: string;
  grossWeight?: number;
  netWeight?: number;
  fineness?: number;
  recoverableGoldWeight?: number;
  payableGoldWeight?: number;
  calculatedPayableValue?: number;
  oraclePrice?: number;
  discountRate?: number;
  assayCertificateRef?: string | null;
  exceptionReason?: string;
  reviewCaseId?: string | null;
  evidenceHash?: string;
  /** Present only for case-creation events */
  caseId?: string;
  subjectId?: string;
  subjectName?: string;
  reason?: string;
  action?: string;
}

export interface ReviewerAssignedPayload {
  caseId: string;
  reviewerId: string;
  previousReviewerId?: string | null;
  caseType: string;
  caseStatus: string;
}

export interface TaskGeneratedPayload {
  caseId: string;
  taskId: string;
  taskType: string;
  description: string;
  required: boolean;
  assigneeId?: string | null;
}

export interface TaskCompletedPayload {
  caseId: string;
  taskId: string;
  taskType: string;
  completedBy: string;
  completionNotes: string;
  allRequiredComplete: boolean;
  caseTransitioned: boolean;
  newCaseStatus?: string;
}

export interface ManualDispositionRenderedPayload {
  caseId: string;
  subjectId: string;
  reviewerId: string;
  originalReviewerId: string | null;
  verdict: "APPROVED" | "REJECTED";
  rationale: string;
  caseType: string;
  priority: number;
  fourEyesRequired: boolean;
  fourEyesSatisfied: boolean;
  dispositionHash: string;
  downstreamAction: string;
}

/**
 * Union map of event type → payload interface.
 * Enforces type safety at the call site.
 */
export interface V3EventPayloadMap {
  SHIPMENT_CREATED: ShipmentCreatedPayload;
  CUSTODY_EVENT_ADDED: CustodyEventAddedPayload;
  BRINKS_HANDOFF_VERIFIED: BrinksHandoffVerifiedPayload;
  REFINERY_RECEIPT_RECORDED: RefineryReceiptRecordedPayload;
  ASSAY_COMPLETED: AssayCompletedPayload;
  PAYABLE_VALUE_CALCULATED: PayableValueCalculatedPayload;
  SETTLEMENT_AUTHORIZATION_DECIDED: SettlementAuthorizationDecidedPayload;
  COMPLIANCE_DECISION_RENDERED: ComplianceDecisionRenderedPayload;
  SHIPMENT_REVIEW_DECIDED: ShipmentReviewDecidedPayload;
  REFINERY_LOT_APPROVED: RefineryLotReviewPayload;
  REFINERY_LOT_EXCEPTION: RefineryLotReviewPayload;
  REVIEWER_ASSIGNED: ReviewerAssignedPayload;
  TASK_GENERATED: TaskGeneratedPayload;
  TASK_COMPLETED: TaskCompletedPayload;
  MANUAL_DISPOSITION_RENDERED: ManualDispositionRenderedPayload;
  // WS5 hardening events — flexible payloads for system/check events
  CHECK_EXPIRED: Record<string, unknown>;
  PERIODIC_REVIEW_OPENED: Record<string, unknown>;
  PROACTIVE_RESCREEN_TRIGGERED: Record<string, unknown>;
  STALE_CHECK_SWEEP_COMPLETED: Record<string, unknown>;
  SANCTIONS_REFRESH_COMPLETED: Record<string, unknown>;
  IDENFY_RESULT_RECEIVED: Record<string, unknown>;
}

// ─── DATABASE ROW INTERFACE ────────────────────────────────────────────────────

interface AuditEventRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  hash: string;
  previous_hash: string | null;
  created_at: string;
}

// ─── AUDIT LOGGER ──────────────────────────────────────────────────────────────

/**
 * Append a hash-chained audit event to the co_audit_events table.
 *
 * Process:
 *   1. Fetch the most recent hash for the aggregate to chain from
 *   2. Generate a new chained hash: H(previousHash + H(payload))
 *   3. Insert the event with the computed hash and link
 *
 * @param aggregateType - The domain aggregate (SHIPMENT, REFINERY_LOT, etc.)
 * @param aggregateId   - UUID of the aggregate instance
 * @param eventType     - V3 event type (strictly typed)
 * @param payload       - Event payload (typed per event type)
 * @param userId        - The user/system actor triggering the event
 * @returns The inserted audit event record
 *
 * @example
 *   await appendEvent(
 *     "SHIPMENT",
 *     shipmentId,
 *     "SHIPMENT_CREATED",
 *     { shipmentId, supplierSubjectId, ... },
 *     operatorUserId,
 *   );
 */
export async function appendEvent<T extends V3EventType>(
  aggregateType: V3AggregateType,
  aggregateId: string,
  eventType: T,
  payload: V3EventPayloadMap[T],
  userId: string,
): Promise<{ id: string; hash: string }> {
  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();

  try {
    // ── Step 1: Fetch the most recent hash for this aggregate ──
    const { rows: lastRows } = await client.query<{ hash: string }>(
      `SELECT hash FROM co_audit_events
       WHERE aggregate_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [aggregateId],
    );

    const previousHash = lastRows.length > 0 ? lastRows[0].hash : null;

    // ── Step 2: Generate chained hash ──
    // Stamp the payload with audit metadata before hashing
    const hashablePayload = {
      ...payload,
      _audit: {
        aggregateType,
        aggregateId,
        eventType,
        userId,
        timestamp: new Date().toISOString(),
      },
    };

    const hash = generateChainedHash(hashablePayload, previousHash);

    // ── Step 3: Insert the event ──
    const { rows } = await client.query<{ id: string; hash: string }>(
      `INSERT INTO co_audit_events (
        aggregate_type, aggregate_id, event_type,
        payload, hash, previous_hash
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6)
      RETURNING id, hash`,
      [
        aggregateType,
        aggregateId,
        eventType,
        JSON.stringify(hashablePayload),
        hash,
        previousHash,
      ],
    );

    console.log(
      `[AUDIT] ${aggregateType}/${aggregateId}: ${eventType} → ${hash.slice(0, 16)}… ` +
        `(chain: ${previousHash ? previousHash.slice(0, 12) + "…" : "GENESIS"}, ` +
        `actor: ${userId})`,
    );

    return rows[0];
  } finally {
    client.release();
  }
}

// ─── CHAIN VERIFICATION ────────────────────────────────────────────────────────

/**
 * Verify the integrity of the entire audit chain for an aggregate.
 *
 * Replays the chain from genesis to the most recent event,
 * recalculating every hash and comparing against the stored value.
 * Any mismatch indicates database tampering.
 *
 * @param aggregateId - UUID of the aggregate to verify
 * @returns Verification result with details
 *
 * @example
 *   const result = await verifyAuditChain(shipmentId);
 *   if (!result.valid) {
 *     console.error("TAMPER DETECTED:", result.brokenAt);
 *   }
 */
export async function verifyAuditChain(
  aggregateId: string,
): Promise<{
  valid: boolean;
  totalEvents: number;
  verifiedEvents: number;
  brokenAt: number | null;
  brokenEventId: string | null;
  details: string;
}> {
  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();

  try {
    // Fetch all events in chronological order
    const { rows } = await client.query<AuditEventRow>(
      `SELECT id, aggregate_type, aggregate_id, event_type,
              payload, hash, previous_hash, created_at
       FROM co_audit_events
       WHERE aggregate_id = $1
       ORDER BY created_at ASC`,
      [aggregateId],
    );

    if (rows.length === 0) {
      return {
        valid: true,
        totalEvents: 0,
        verifiedEvents: 0,
        brokenAt: null,
        brokenEventId: null,
        details: "No events found for aggregate — chain is trivially valid.",
      };
    }

    let expectedPreviousHash: string | null = null;

    for (let i = 0; i < rows.length; i++) {
      const event = rows[i];

      // ── Verify previous_hash link ──
      if (event.previous_hash !== expectedPreviousHash) {
        return {
          valid: false,
          totalEvents: rows.length,
          verifiedEvents: i,
          brokenAt: i,
          brokenEventId: event.id,
          details:
            `Chain link broken at event[${i}] (id=${event.id}): ` +
            `expected previous_hash=${expectedPreviousHash ?? "null"}, ` +
            `found=${event.previous_hash ?? "null"}.`,
        };
      }

      // ── Recalculate hash from stored payload ──
      const recalculatedHash = generateChainedHash(
        event.payload,
        expectedPreviousHash,
      );

      if (recalculatedHash !== event.hash) {
        return {
          valid: false,
          totalEvents: rows.length,
          verifiedEvents: i,
          brokenAt: i,
          brokenEventId: event.id,
          details:
            `Hash mismatch at event[${i}] (id=${event.id}): ` +
            `stored=${event.hash.slice(0, 16)}…, ` +
            `recalculated=${recalculatedHash.slice(0, 16)}…. ` +
            `Payload may have been tampered with.`,
        };
      }

      // Move to next link
      expectedPreviousHash = event.hash;
    }

    console.log(
      `[AUDIT] Chain verification PASSED for aggregate ${aggregateId}: ` +
        `${rows.length} events verified.`,
    );

    return {
      valid: true,
      totalEvents: rows.length,
      verifiedEvents: rows.length,
      brokenAt: null,
      brokenEventId: null,
      details: `All ${rows.length} events verified. Chain integrity confirmed.`,
    };
  } finally {
    client.release();
  }
}

// ─── QUERY HELPERS ─────────────────────────────────────────────────────────────

/**
 * Retrieve all audit events for an aggregate, ordered chronologically.
 */
export async function getAuditTrail(
  aggregateId: string,
): Promise<AuditEventRow[]> {
  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<AuditEventRow>(
      `SELECT id, aggregate_type, aggregate_id, event_type,
              payload, hash, previous_hash, created_at
       FROM co_audit_events
       WHERE aggregate_id = $1
       ORDER BY created_at ASC`,
      [aggregateId],
    );
    return rows;
  } finally {
    client.release();
  }
}

/**
 * Retrieve the latest audit event for an aggregate.
 * Useful for checking the current head of the hash chain.
 */
export async function getLatestAuditEvent(
  aggregateId: string,
): Promise<AuditEventRow | null> {
  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<AuditEventRow>(
      `SELECT id, aggregate_type, aggregate_id, event_type,
              payload, hash, previous_hash, created_at
       FROM co_audit_events
       WHERE aggregate_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [aggregateId],
    );
    return rows.length > 0 ? rows[0] : null;
  } finally {
    client.release();
  }
}
