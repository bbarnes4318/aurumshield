"use server";

/* ================================================================
   TREASURY ACTIONS — Manual Intervention Server Actions
   ================================================================
   Server actions for Treasury operators to resolve ambiguous
   settlement states and other manual intervention scenarios.

   Database: settlement_cases + audit_events
   Adapter:  src/lib/db.ts — getPoolClient()
   ================================================================ */

import { getPoolClient } from "@/lib/db";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";

/* ----------------------------------------------------------------
   TYPES
   ---------------------------------------------------------------- */

export type ResolutionAction = "FORCE_SETTLE" | "REVERSE";

export interface ResolutionResult {
  success: boolean;
  settlementId: string;
  action: ResolutionAction;
  previousStatus: string;
  newStatus: string;
  auditEventId: string;
  timestamp: string;
}

/* ================================================================
   ZOD SCHEMAS — Server Action Input Validation
   ================================================================ */

const ResolveAmbiguousStateSchema = z.object({
  settlementId: z.string().min(1, "Settlement ID is required").max(256),
  resolution: z.enum(["FORCE_SETTLE", "REVERSE"], {
    message: "Resolution must be FORCE_SETTLE or REVERSE",
  }),
});

/* ================================================================
   resolveAmbiguousState — Manual treasury intervention
   ================================================================
   Resolves a settlement stuck in AMBIGUOUS_STATE by either
   force-settling it or reversing it.

   Logic:
     1. UPDATE settlement_cases.status → SETTLED or REVERSED
     2. INSERT audit event → MANUAL_REVIEW_APPROVED or MANUAL_REVIEW_REJECTED
     3. If isDemo === true, simulate a 1-second delay and return success

   Wrapped in a PostgreSQL transaction for atomicity.
   ================================================================ */

export async function resolveAmbiguousState(
  settlementId: string,
  resolution: ResolutionAction,
  isDemo: boolean = false,
): Promise<ResolutionResult> {
  /* ── Admin Auth: Only treasury operators can resolve ambiguous state ── */
  await requireAdmin();

  /* ── Zod Boundary Validation ── */
  const parsed = ResolveAmbiguousStateSchema.safeParse({ settlementId, resolution });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const timestamp = new Date().toISOString();

  /* ── Demo Branch: Simulated delay + success ── */
  if (isDemo) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));

    return {
      success: true,
      settlementId,
      action: resolution,
      previousStatus: "AMBIGUOUS_STATE",
      newStatus: resolution === "FORCE_SETTLE" ? "SETTLED" : "REVERSED",
      auditEventId: `demo-audit-${Date.now()}`,
      timestamp,
    };
  }

  /* ── Live Branch: Atomic DB update ── */
  const newStatus = resolution === "FORCE_SETTLE" ? "SETTLED" : "REVERSED";
  const auditEventType =
    resolution === "FORCE_SETTLE"
      ? "MANUAL_REVIEW_APPROVED"
      : "MANUAL_REVIEW_REJECTED";

  const client = await getPoolClient();

  try {
    await client.query("BEGIN");

    // 1. Read current status for audit trail
    const { rows: currentRows } = await client.query<{
      status: string;
    }>(
      `SELECT status FROM settlement_cases WHERE id = $1 FOR UPDATE`,
      [settlementId],
    );

    if (currentRows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error(`Settlement case ${settlementId} not found.`);
    }

    const previousStatus = currentRows[0].status;

    // 2. UPDATE settlement_cases status
    await client.query(
      `UPDATE settlement_cases
       SET status = $1,
           updated_at = NOW(),
           settled_at = CASE WHEN $1 = 'SETTLED' THEN NOW() ELSE settled_at END
       WHERE id = $2`,
      [newStatus, settlementId],
    );

    // 3. INSERT audit event
    const { rows: auditRows } = await client.query<{ id: string }>(
      `INSERT INTO audit_events (
         settlement_case_id,
         event_type,
         payload,
         created_at
       ) VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [
        settlementId,
        auditEventType,
        JSON.stringify({
          resolution,
          previousStatus,
          newStatus,
          resolvedAt: timestamp,
          resolvedBy: "treasury-operator",
        }),
      ],
    );

    await client.query("COMMIT");

    return {
      success: true,
      settlementId,
      action: resolution,
      previousStatus,
      newStatus,
      auditEventId: auditRows[0]?.id ?? "unknown",
      timestamp,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
