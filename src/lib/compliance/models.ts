/* ================================================================
   COMPLIANCE CASE MODEL — Domain Types & PostgreSQL CRUD
   ================================================================
   Central data model for the unified KYC/KYB case management
   system. Each user has at most one active ComplianceCase that
   tracks their verification journey from OPEN → APPROVED.

   All mutations append events to compliance_events for a complete
   audit trail. Status transitions are enforced at the application
   layer, not the database.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { z } from "zod";

/* ── Status & Tier Enums ── */

export const COMPLIANCE_CASE_STATUSES = [
  "OPEN",
  "PENDING_USER",
  "PENDING_PROVIDER",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CLOSED",
] as const;

export type ComplianceCaseStatus = (typeof COMPLIANCE_CASE_STATUSES)[number];

export const COMPLIANCE_TIERS = [
  "BROWSE",
  "QUOTE",
  "LOCK",
  "EXECUTE",
] as const;

export type ComplianceTier = (typeof COMPLIANCE_TIERS)[number];

export const EVENT_ACTORS = ["USER", "PROVIDER", "SYSTEM"] as const;
export type ComplianceEventActor = (typeof EVENT_ACTORS)[number];

/* ── Domain Interfaces ── */

export interface ComplianceCase {
  id: string;
  userId: string;
  orgId: string | null;
  status: ComplianceCaseStatus;
  tier: ComplianceTier;
  orgType: string | null;
  jurisdiction: string | null;
  providerInquiryId: string | null;
  /** Distinguishes KYC (individual) vs KYB (company) track */
  entityType: "individual" | "company" | null;
  /** Veriff session identifier */
  veriffSessionId: string | null;
  /** Parallel engagement flag — UNDER_REVIEW users get mock checkout access */
  parallelEngagementEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceEvent {
  id: string;
  caseId: string;
  eventId: string;
  actor: ComplianceEventActor;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

/* ── Zod Schemas ── */

export const createCaseSchema = z.object({
  userId: z.string().min(1),
  orgId: z.string().nullable().optional(),
  orgType: z.string().nullable().optional(),
  jurisdiction: z.string().nullable().optional(),
  providerInquiryId: z.string().nullable().optional(),
  entityType: z.enum(["individual", "company"]).nullable().optional(),
  veriffSessionId: z.string().nullable().optional(),
  parallelEngagementEnabled: z.boolean().optional(),
  status: z.enum(COMPLIANCE_CASE_STATUSES).optional(),
  tier: z.enum(COMPLIANCE_TIERS).optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;

/* ── Row → Domain Mappers ── */

interface ComplianceCaseRow {
  id: string;
  user_id: string;
  org_id: string | null;
  status: ComplianceCaseStatus;
  tier: ComplianceTier;
  org_type: string | null;
  jurisdiction: string | null;
  provider_inquiry_id: string | null;
  entity_type: "individual" | "company" | null;
  veriff_session_id: string | null;
  parallel_engagement_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface ComplianceEventRow {
  id: string;
  case_id: string;
  event_id: string;
  actor: ComplianceEventActor;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

function caseRowToDomain(row: ComplianceCaseRow): ComplianceCase {
  return {
    id: row.id,
    userId: row.user_id,
    orgId: row.org_id,
    status: row.status,
    tier: row.tier,
    orgType: row.org_type,
    jurisdiction: row.jurisdiction,
    providerInquiryId: row.provider_inquiry_id,
    entityType: row.entity_type ?? null,
    veriffSessionId: row.veriff_session_id ?? null,
    parallelEngagementEnabled: row.parallel_engagement_enabled ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function eventRowToDomain(row: ComplianceEventRow): ComplianceEvent {
  return {
    id: row.id,
    caseId: row.case_id,
    eventId: row.event_id,
    actor: row.actor,
    action: row.action,
    details: row.details ?? {},
    createdAt: row.created_at,
  };
}

/* ================================================================
   CRUD FUNCTIONS
   ================================================================ */

/**
 * Retrieve the active ComplianceCase for a user.
 * Returns null if no case exists.
 */
export async function getComplianceCaseByUserId(
  userId: string,
): Promise<ComplianceCase | null> {
  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    const { rows } = await client.query<ComplianceCaseRow>(
      "SELECT * FROM compliance_cases WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    return rows.length > 0 ? caseRowToDomain(rows[0]) : null;
  } finally {
    try { await client.end(); } catch { /* ignore cleanup */ }
  }
}

/**
 * Retrieve a ComplianceCase by its primary key.
 */
export async function getComplianceCaseById(
  caseId: string,
): Promise<ComplianceCase | null> {
  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    const { rows } = await client.query<ComplianceCaseRow>(
      "SELECT * FROM compliance_cases WHERE id = $1",
      [caseId],
    );
    return rows.length > 0 ? caseRowToDomain(rows[0]) : null;
  } finally {
    try { await client.end(); } catch { /* ignore cleanup */ }
  }
}

/**
 * Create a new ComplianceCase. Uses ON CONFLICT to return the
 * existing case if one already exists for this user (idempotent).
 */
export async function createComplianceCase(
  input: CreateCaseInput,
): Promise<ComplianceCase> {
  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    const { rows } = await client.query<ComplianceCaseRow>(
      `INSERT INTO compliance_cases (
        user_id, org_id, status, tier, org_type, jurisdiction, provider_inquiry_id,
        entity_type, veriff_session_id, parallel_engagement_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE SET
        org_id              = COALESCE(EXCLUDED.org_id, compliance_cases.org_id),
        org_type            = COALESCE(EXCLUDED.org_type, compliance_cases.org_type),
        jurisdiction        = COALESCE(EXCLUDED.jurisdiction, compliance_cases.jurisdiction),
        provider_inquiry_id = COALESCE(EXCLUDED.provider_inquiry_id, compliance_cases.provider_inquiry_id),
        entity_type         = COALESCE(EXCLUDED.entity_type, compliance_cases.entity_type),
        veriff_session_id   = COALESCE(EXCLUDED.veriff_session_id, compliance_cases.veriff_session_id)
      RETURNING *`,
      [
        input.userId,
        input.orgId ?? null,
        input.status ?? "OPEN",
        input.tier ?? "BROWSE",
        input.orgType ?? null,
        input.jurisdiction ?? null,
        input.providerInquiryId ?? null,
        input.entityType ?? null,
        input.veriffSessionId ?? null,
        input.parallelEngagementEnabled ?? false,
      ],
    );

    return caseRowToDomain(rows[0]);
  } finally {
    try { await client.end(); } catch { /* ignore cleanup */ }
  }
}

/* ================================================================
   STATE MACHINE CONFINEMENT — RSK-009
   ================================================================
   Compliance state transitions are confined to a strict mathematical
   graph. Any UPDATE that does not match an allowed edge in the
   transition matrix is rejected at both the application layer
   (pre-flight check) AND the database layer (WHERE status = $expected).

   This eliminates:
   - Race conditions (two concurrent webhooks)
   - Code-level exploits (REJECTED → APPROVED bypass)
   - Blind CRUD mutations without provenance
   ================================================================ */

/**
 * Immutable transition matrix.
 * Key = current status, Value = set of statuses reachable from it.
 *
 * Graph edges:
 *   OPEN ──→ PENDING_USER, CLOSED
 *   PENDING_USER ──→ PENDING_PROVIDER, CLOSED
 *   PENDING_PROVIDER ──→ UNDER_REVIEW, PENDING_USER, CLOSED
 *   UNDER_REVIEW ──→ APPROVED, REJECTED, PENDING_PROVIDER
 *   APPROVED ──→ (terminal)
 *   REJECTED ──→ OPEN (re-application only)
 *   CLOSED ──→ (terminal)
 */
export const ALLOWED_TRANSITIONS: Readonly<
  Record<ComplianceCaseStatus, readonly ComplianceCaseStatus[]>
> = {
  OPEN: ["PENDING_USER", "CLOSED"],
  PENDING_USER: ["PENDING_PROVIDER", "CLOSED"],
  PENDING_PROVIDER: ["UNDER_REVIEW", "APPROVED", "REJECTED", "PENDING_USER", "CLOSED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "PENDING_PROVIDER"],
  APPROVED: [],
  REJECTED: ["OPEN"],
  CLOSED: [],
} as const;

/**
 * Thrown when a state transition violates the confinement matrix
 * OR when a concurrent mutation has already moved the state.
 */
export class StateTransitionConflictError extends Error {
  public readonly caseId: string;
  public readonly expectedStatus: ComplianceCaseStatus;
  public readonly targetStatus: ComplianceCaseStatus;

  constructor(
    caseId: string,
    expectedStatus: ComplianceCaseStatus,
    targetStatus: ComplianceCaseStatus,
    reason: "INVALID_TRANSITION" | "CONCURRENT_CONFLICT",
  ) {
    const msg =
      reason === "INVALID_TRANSITION"
        ? `STATE_TRANSITION_DENIED: ${expectedStatus} → ${targetStatus} is not an allowed edge in the compliance state machine (caseId=${caseId})`
        : `STATE_TRANSITION_CONFLICT: Case ${caseId} is no longer in status ${expectedStatus} — concurrent mutation detected. Target was ${targetStatus}`;
    super(msg);
    this.name = "StateTransitionConflictError";
    this.caseId = caseId;
    this.expectedStatus = expectedStatus;
    this.targetStatus = targetStatus;
  }
}

/**
 * Update a ComplianceCase status with strict state machine confinement.
 *
 * Enforces two layers of protection:
 *   1. Application-layer: validates the transition against ALLOWED_TRANSITIONS
 *   2. Database-layer: WHERE status = $expectedPreviousStatus (optimistic lock)
 *
 * If the database returns zero rows, a concurrent mutation has already
 * moved the case — throws StateTransitionConflictError.
 *
 * @param caseId - The compliance case primary key
 * @param targetStatus - The desired new status
 * @param expectedPreviousStatus - The status you believe the case is currently in
 * @param tier - Optional tier promotion
 */
export async function updateComplianceCaseStatus(
  caseId: string,
  targetStatus: ComplianceCaseStatus,
  expectedPreviousStatus: ComplianceCaseStatus,
  tier?: ComplianceTier,
): Promise<ComplianceCase> {
  // ── Layer 1: Application-level transition matrix check ──
  const allowed = ALLOWED_TRANSITIONS[expectedPreviousStatus];
  if (!allowed.includes(targetStatus)) {
    throw new StateTransitionConflictError(
      caseId,
      expectedPreviousStatus,
      targetStatus,
      "INVALID_TRANSITION",
    );
  }

  // ── Layer 2: Database-level optimistic lock ──
  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    const tierClause = tier !== undefined
      ? ", tier = $4"
      : "";
    const values: unknown[] = tier !== undefined
      ? [targetStatus, caseId, expectedPreviousStatus, tier]
      : [targetStatus, caseId, expectedPreviousStatus];

    const { rows } = await client.query<ComplianceCaseRow>(
      `UPDATE compliance_cases
       SET status = $1${tierClause}
       WHERE id = $2 AND status = $3
       RETURNING *`,
      values,
    );

    if (rows.length === 0) {
      // The case is no longer in the expected state — concurrent mutation
      throw new StateTransitionConflictError(
        caseId,
        expectedPreviousStatus,
        targetStatus,
        "CONCURRENT_CONFLICT",
      );
    }

    console.log(
      `[COMPLIANCE] Case ${caseId}: ${expectedPreviousStatus} → ${targetStatus}` +
        (tier ? ` (tier=${tier})` : ""),
    );

    return caseRowToDomain(rows[0]);
  } finally {
    try { await client.end(); } catch { /* ignore cleanup */ }
  }
}

/**
 * Update the provider inquiry ID on an existing case.
 */
export async function updateComplianceCaseInquiryId(
  caseId: string,
  providerInquiryId: string,
): Promise<void> {
  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    await client.query(
      "UPDATE compliance_cases SET provider_inquiry_id = $1 WHERE id = $2",
      [providerInquiryId, caseId],
    );
  } finally {
    try { await client.end(); } catch { /* ignore cleanup */ }
  }
}
