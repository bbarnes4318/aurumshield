/* ================================================================
   SETTLEMENT RAIL — Dual-Rail Router with DvP Idempotency
   ================================================================
   Defines the SettlementRail interface and the routeSettlement()
   router that enforces the $250k threshold logic:

     - notionalCents ≤ SETTLEMENT_ENTERPRISE_THRESHOLD → Moov
     - notionalCents > SETTLEMENT_ENTERPRISE_THRESHOLD → Modern Treasury
     - Moov failures automatically retry on Modern Treasury
       ONLY after finality oracle confirms no prior transfer

   The SETTLEMENT_RAIL env var controls the behaviour:
     "auto"             — threshold-based routing (default)
     "moov"             — force Moov for all amounts
     "modern_treasury"  — force Modern Treasury for all amounts

   Idempotency:
     Every payout request carries a deterministic key derived from
     SHA-256(settlement_id | payee_id | amount_cents | action_type).
     This key is passed to Moov (X-Idempotency-Key) and Modern
     Treasury (idempotency_key param) and persisted in the `payouts`
     table to prevent duplicate transfers.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { createHash } from "crypto";
import { checkTransferStatus } from "./moov-adapter";
import { emitSettlementFallbackEvent, emitSettlementPayoutConfirmedEvent } from "./audit-logger";
import { transitionSettlementState } from "./state-machine";

/* ---------- Types ---------- */

/** Payout instruction passed to any settlement rail. */
export interface SettlementPayoutRequest {
  /** AurumShield settlement ID (for idempotency & ledger reference) */
  settlementId: string;
  /** Seller external account identifier (varies by rail implementation) */
  sellerAccountId: string;
  /** Total settlement value in cents (smallest USD denomination) */
  totalAmountCents: number;
  /** Platform fee in cents */
  platformFeeCents: number;
  /** Optional metadata to attach to the payment order */
  metadata?: Record<string, string>;
  /**
   * Platform-generated idempotency key. Derived from:
   *   SHA-256(settlement_id | payee_id | amount_cents | action_type)
   * Passed to Moov (X-Idempotency-Key) and Modern Treasury APIs.
   */
  idempotencyKey?: string;
}

/** Result returned by any settlement rail after executing a payout. */
export interface SettlementPayoutResult {
  /** Whether the payout was executed successfully */
  success: boolean;
  /** Rail that was ultimately used */
  railUsed: "modern_treasury" | "moov";
  /** External IDs from the rail (payment order IDs, transfer IDs, etc.) */
  externalIds: string[];
  /** Seller payout amount in cents */
  sellerPayoutCents: number;
  /** Platform fee in cents */
  platformFeeCents: number;
  /** Whether this result came from a fallback retry */
  isFallback: boolean;
  /** Error message if the payout failed */
  error?: string;
  /** Idempotency key used for this payout attempt */
  idempotencyKey?: string;
  /**
   * True when the Moov payout outcome is indeterminate (timeout/5xx)
   * AND the status-check poll also failed. Settlement must be locked to
   * AMBIGUOUS_STATE and requires Treasury Admin manual reconciliation.
   */
  ambiguousState?: boolean;
}

/**
 * Settlement rail interface.
 * Each rail implementation (Modern Treasury, Moov) must implement this.
 */
export interface ISettlementRail {
  /** Human-readable rail name */
  readonly name: string;
  /** Execute a payout and fee sweep */
  executePayout(request: SettlementPayoutRequest): Promise<SettlementPayoutResult>;
  /** Check if the rail is configured (API keys present) */
  isConfigured(): boolean;
}

/* ---------- Idempotency Key Generation ---------- */

/**
 * Generate a deterministic idempotency key from settlement parameters.
 * Key = SHA-256(settlement_id | payee_id | amount_cents | action_type)
 *
 * This key is:
 * 1. Passed to Moov (X-Idempotency-Key header)
 * 2. Passed to Modern Treasury (idempotency_key param)
 * 3. Persisted in the `payouts` table for dedup on webhooks
 */
export function generateIdempotencyKey(
  settlementId: string,
  payeeId: string,
  amountCents: number,
  actionType: string,
): string {
  const payload = `${settlementId}|${payeeId}|${amountCents}|${actionType}`;
  return createHash("sha256").update(payload).digest("hex");
}

/* ---------- Payout Persistence Helpers ---------- */

/**
 * Record a payout attempt in the `payouts` table.
 * Uses ON CONFLICT to handle retries gracefully.
 */
export async function recordPayoutAttempt(params: {
  settlementId: string;
  payeeId: string;
  idempotencyKey: string;
  rail: "moov" | "modern_treasury";
  actionType: string;
  amountCents: number;
}): Promise<void> {
  try {
    const { getDbClient } = await import("@/lib/db");
    const db = await getDbClient();
    try {
      await db.query(
        `INSERT INTO payouts
           (settlement_id, payee_id, idempotency_key, rail, action_type, amount_cents, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
         ON CONFLICT (idempotency_key) DO UPDATE SET
           attempt_count = payouts.attempt_count + 1,
           updated_at = NOW()`,
        [params.settlementId, params.payeeId, params.idempotencyKey, params.rail, params.actionType, params.amountCents],
      );
    } finally {
      await db.end().catch(() => {});
    }
  } catch (err) {
    console.error("[SETTLEMENT-RAIL] Failed to record payout attempt:", err);
    // Non-fatal — payout proceeds even if persistence fails
  }
}

/**
 * Update payout status after rail execution.
 */
export async function updatePayoutStatus(params: {
  idempotencyKey: string;
  status: "SUBMITTED" | "COMPLETED" | "FAILED" | "REVERSED";
  externalId?: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { getDbClient } = await import("@/lib/db");
    const db = await getDbClient();
    try {
      await db.query(
        `UPDATE payouts SET status = $1, external_id = COALESCE($2, external_id),
         error_message = $3, updated_at = NOW()
         WHERE idempotency_key = $4`,
        [params.status, params.externalId ?? null, params.errorMessage ?? null, params.idempotencyKey],
      );
    } finally {
      await db.end().catch(() => {});
    }
  } catch (err) {
    console.error("[SETTLEMENT-RAIL] Failed to update payout status:", err);
  }
}

/**
 * Record settlement finality from external rail confirmation.
 */
export async function recordSettlementFinality(params: {
  settlementId: string;
  rail: "moov" | "modern_treasury";
  externalTransferId: string;
  idempotencyKey: string;
  finalityStatus: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED" | "REQUIRES_REVIEW";
  amountCents: number;
  leg: "seller_payout" | "fee_sweep";
  isFallback: boolean;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { getDbClient } = await import("@/lib/db");
    const db = await getDbClient();
    try {
      await db.query(
        `INSERT INTO settlement_finality
           (settlement_id, rail, external_transfer_id, idempotency_key,
            finality_status, amount_cents, leg, is_fallback, error_message,
            finalized_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                 CASE WHEN $5 IN ('COMPLETED','FAILED','REVERSED') THEN NOW() ELSE NULL END)
         ON CONFLICT DO NOTHING`,
        [
          params.settlementId, params.rail, params.externalTransferId,
          params.idempotencyKey, params.finalityStatus, params.amountCents,
          params.leg, params.isFallback, params.errorMessage ?? null,
        ],
      );
    } finally {
      await db.end().catch(() => {});
    }
  } catch (err) {
    console.error("[SETTLEMENT-RAIL] Failed to record settlement finality:", err);
  }
}

/**
 * Check if a prior transfer finality exists for a settlement on a given rail.
 * Returns the finality_status if found, null otherwise.
 * Used to gate fallback: secondary rail only if primary finality = 'FAILED'.
 */
export async function checkPriorFinality(
  settlementId: string,
  rail: "moov" | "modern_treasury",
): Promise<{ finalityStatus: string; externalTransferId: string | null } | null> {
  try {
    const { getDbClient } = await import("@/lib/db");
    const db = await getDbClient();
    try {
      const result = await db.query(
        `SELECT finality_status, external_transfer_id
         FROM settlement_finality
         WHERE settlement_id = $1 AND rail = $2 AND leg = 'seller_payout'
         ORDER BY created_at DESC LIMIT 1`,
        [settlementId, rail],
      );
      if (result.rows.length === 0) return null;
      return {
        finalityStatus: result.rows[0].finality_status,
        externalTransferId: result.rows[0].external_transfer_id,
      };
    } finally {
      await db.end().catch(() => {});
    }
  } catch (err) {
    console.error("[SETTLEMENT-RAIL] Failed to check prior finality:", err);
    return null; // Fail open — allow the caller to decide
  }
}

/* ---------- Rail Selection ---------- */

/**
 * Check if a prior payout attempt already exists for this idempotency key
 * with a non-retriable status. Returns the conflict status or null if safe.
 *
 * This is the replay guard: if a prior payout was already SUBMITTED or
 * COMPLETED, we MUST NOT re-execute. The caller should return
 * IDEMPOTENCY_CONFLICT to the upstream action.
 */
export async function checkPayoutIdempotency(
  idempotencyKey: string,
): Promise<{ status: string; externalId: string | null; settlementId: string } | null> {
  try {
    const { getDbClient } = await import("@/lib/db");
    const db = await getDbClient();
    try {
      const result = await db.query(
        `SELECT status, external_id, settlement_id
         FROM payouts
         WHERE idempotency_key = $1
           AND status IN ('SUBMITTED', 'COMPLETED')
         ORDER BY updated_at DESC LIMIT 1`,
        [idempotencyKey],
      );
      if (result.rows.length === 0) return null;
      return {
        status: result.rows[0].status,
        externalId: result.rows[0].external_id,
        settlementId: result.rows[0].settlement_id,
      };
    } finally {
      await db.end().catch(() => {});
    }
  } catch (err) {
    console.error("[SETTLEMENT-RAIL] Failed to check payout idempotency:", err);
    return null; // Fail open — caller proceeds with caution
  }
}

export type RailMode = "auto" | "moov" | "modern_treasury";

/**
 * Read the settlement rail mode from environment.
 * Defaults to "auto" if not set.
 */
function getRailMode(): RailMode {
  const mode = process.env.SETTLEMENT_RAIL ?? "auto";
  const valid: RailMode[] = ["auto", "moov", "modern_treasury"];
  return valid.includes(mode as RailMode) ? (mode as RailMode) : "auto";
}

/**
 * Read the enterprise threshold from environment.
 * Defaults to 25_000_000 ($250,000 in cents).
 */
function getEnterpriseThreshold(): number {
  const raw = process.env.SETTLEMENT_ENTERPRISE_THRESHOLD;
  if (!raw) return 25_000_000; // $250k in cents
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? 25_000_000 : parsed;
}

/* ---------- Registry ---------- */

let _moovRail: ISettlementRail | null = null;
let _modernTreasuryRail: ISettlementRail | null = null;

/**
 * Register rail implementations. Call this at app startup or lazily
 * before the first payout. Each rail registers itself via this function.
 */
export function registerSettlementRail(
  railName: "moov" | "modern_treasury",
  rail: ISettlementRail,
): void {
  if (railName === "moov") {
    _moovRail = rail;
  } else {
    _modernTreasuryRail = rail;
  }
}

/* ---------- Router ---------- */

/**
 * Route a settlement payout through the appropriate rail.
 *
 * Routing logic:
 *   1. If SETTLEMENT_RAIL === "moov", use Moov exclusively.
 *   2. If SETTLEMENT_RAIL === "modern_treasury", use Modern Treasury exclusively.
 *   3. If SETTLEMENT_RAIL === "auto":
 *      a. notionalCents ≤ threshold → Moov (with MT fallback)
 *      b. notionalCents > threshold → Modern Treasury
 *
 * Fallback: If Moov fails in auto mode, automatically retry on Modern Treasury.
 */
export async function routeSettlement(
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  const mode = getRailMode();
  const threshold = getEnterpriseThreshold();

  /* ── Generate idempotency key if not provided ── */
  if (!request.idempotencyKey) {
    request = {
      ...request,
      idempotencyKey: generateIdempotencyKey(
        request.settlementId,
        request.sellerAccountId,
        request.totalAmountCents,
        "settlement_payout",
      ),
    };
  }

  /* ── RSK-003: Pre-execution ledger guard ── */
  // 1. Check for prior SUBMITTED/COMPLETED payout with same idempotency key
  const priorPayout = await checkPayoutIdempotency(request.idempotencyKey!);
  if (priorPayout) {
    console.error(
      `[AurumShield P1 ALERT] idempotency_conflict | ` +
      `settlementId=${request.settlementId} ` +
      `idempotencyKey=${request.idempotencyKey} ` +
      `priorStatus=${priorPayout.status} ` +
      `priorExternalId=${priorPayout.externalId ?? "N/A"} | ` +
      `Replay attempt rejected — prior payout already in-flight or completed.`,
    );
    return {
      success: false,
      railUsed: "moov",
      externalIds: priorPayout.externalId ? [priorPayout.externalId] : [],
      sellerPayoutCents: 0,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      error: `IDEMPOTENCY_CONFLICT: A payout for this settlement is already ${priorPayout.status}. ` +
        `External ID: ${priorPayout.externalId ?? "pending"}. No duplicate transfer was initiated.`,
      idempotencyKey: request.idempotencyKey,
    };
  }

  // 2. Check if settlement already has COMPLETED or PENDING finality
  const settledFinality = await checkPriorFinality(request.settlementId, "moov");
  const mtFinality = await checkPriorFinality(request.settlementId, "modern_treasury");
  for (const finality of [settledFinality, mtFinality]) {
    if (finality && (finality.finalityStatus === "COMPLETED" || finality.finalityStatus === "PENDING")) {
      console.error(
        `[AurumShield P1 ALERT] settlement_already_finalized | ` +
        `settlementId=${request.settlementId} ` +
        `finalityStatus=${finality.finalityStatus} ` +
        `externalTransferId=${finality.externalTransferId ?? "N/A"} | ` +
        `Refusing duplicate payout — settlement already has active finality.`,
      );
      return {
        success: false,
        railUsed: "moov",
        externalIds: finality.externalTransferId ? [finality.externalTransferId] : [],
        sellerPayoutCents: 0,
        platformFeeCents: request.platformFeeCents,
        isFallback: false,
        error: `IDEMPOTENCY_CONFLICT: Settlement ${request.settlementId} already has ` +
          `${finality.finalityStatus} finality. No duplicate transfer was initiated.`,
        idempotencyKey: request.idempotencyKey,
      };
    }
  }

  /* ── Record payout attempt ── */
  await recordPayoutAttempt({
    settlementId: request.settlementId,
    payeeId: request.sellerAccountId,
    idempotencyKey: request.idempotencyKey!,
    rail: mode === "modern_treasury" ? "modern_treasury" : "moov",
    actionType: "settlement_payout",
    amountCents: request.totalAmountCents,
  });

  /* ── Phase 0: State Machine — PENDING_RAIL → RAIL_SUBMITTED ── */
  transitionSettlementState(
    request.settlementId,
    "PENDING_RAIL",
    "RAIL_SUBMITTED",
    "system",
    "system",
  );

  /* ── Force Moov ── */
  if (mode === "moov") {
    const result = await executeOnRail("moov", request);
    await updatePayoutStatus({
      idempotencyKey: request.idempotencyKey!,
      status: result.success ? "SUBMITTED" : "FAILED",
      externalId: result.externalIds[0],
      errorMessage: result.error,
    });
    emitPayoutAuditLog(request, result);
    return { ...result, idempotencyKey: request.idempotencyKey };
  }

  /* ── Force Modern Treasury ── */
  if (mode === "modern_treasury") {
    const result = await executeOnRail("modern_treasury", request);
    await updatePayoutStatus({
      idempotencyKey: request.idempotencyKey!,
      status: result.success ? "SUBMITTED" : "FAILED",
      externalId: result.externalIds[0],
      errorMessage: result.error,
    });
    emitPayoutAuditLog(request, result);
    return { ...result, idempotencyKey: request.idempotencyKey };
  }

  /* ── Auto mode: threshold-based routing ── */
  if (request.totalAmountCents <= threshold) {
    // Moov primary, Modern Treasury fallback (finality-gated)
    const moovResult = await executeMoovWithFallback(request);
    return { ...moovResult, idempotencyKey: request.idempotencyKey };
  }

  // Above threshold → Modern Treasury (no fallback to Moov for large amounts)
  const result = await executeOnRail("modern_treasury", request);
  await updatePayoutStatus({
    idempotencyKey: request.idempotencyKey!,
    status: result.success ? "SUBMITTED" : "FAILED",
    externalId: result.externalIds[0],
    errorMessage: result.error,
  });
  emitPayoutAuditLog(request, result);
  return { ...result, idempotencyKey: request.idempotencyKey };
}

/* ---------- Structured Audit Log ---------- */

/**
 * Emit a structured settlement_payout_confirmed audit entry.
 * Delegates to the forensic audit logger for non-repudiable JSON emission.
 */
function emitPayoutAuditLog(
  request: SettlementPayoutRequest,
  result: SettlementPayoutResult,
): void {
  // Only log successful or submitted payouts
  if (!result.success) return;

  emitSettlementPayoutConfirmedEvent({
    settlementId: request.settlementId,
    idempotencyKey: request.idempotencyKey ?? "N/A",
    railUsed: result.railUsed,
    externalIds: result.externalIds,
    sellerPayoutCents: result.sellerPayoutCents,
    platformFeeCents: result.platformFeeCents,
    totalAmountCents: request.totalAmountCents,
    isFallback: result.isFallback,
  });
}

/* ---------- Moov Error Classification ---------- */

/** Error categories that determine how the settlement rail handles failure. */
type MoovErrorClass =
  | "PROVEN_REJECTION"   // HTTP 400/422 — Moov definitively rejected; safe to fallback
  | "AMBIGUOUS_FAILURE"; // Timeout, 5xx, network error — Moov may have succeeded

/**
 * Classify a Moov error or failed result to decide whether it is safe
 * to fallback to Modern Treasury.
 *
 * PROVEN_REJECTION: HTTP 400/422 responses mean Moov definitively did NOT
 * execute the transfer. Safe to fallback.
 *
 * AMBIGUOUS_FAILURE: Timeouts (ETIMEDOUT, ECONNRESET), HTTP 5xx, network
 * errors — Moov may have received and processed the request. Fallback
 * MUST NOT proceed without a status-check poll.
 */
function classifyMoovError(errorMessage: string): MoovErrorClass {
  // HTTP 400/422 are proven rejections (bad request, validation failure)
  if (/→ 4(?:00|22):/.test(errorMessage)) {
    return "PROVEN_REJECTION";
  }
  // Everything else is ambiguous — timeouts, 5xx, network drops
  return "AMBIGUOUS_FAILURE";
}

/**
 * Build an AMBIGUOUS_STATE result with P1 alert emission.
 * This is the "circuit breaker" — prevents double-spend by refusing
 * to fallback when Moov's outcome is unknown.
 */
function buildAmbiguousResult(
  request: SettlementPayoutRequest,
  reason: string,
): SettlementPayoutResult {
  // ── P1 ALERT: settlement_ambiguous_state ──
  console.error(
    `[AurumShield P1 ALERT] settlement_ambiguous_state | ` +
    `settlementId=${request.settlementId} ` +
    `idempotencyKey=${request.idempotencyKey ?? "N/A"} ` +
    `reason=${reason} | ` +
    `ACTION REQUIRED: Treasury Admin must reconcile with Moov dashboard ` +
    `before resolving this settlement. DO NOT re-execute payout.`,
  );

  // ── Metric: settlement_ambiguous_state ──
  console.debug("[AurumShield Metric] settlement_ambiguous_state", {
    settlementId: request.settlementId,
    idempotencyKey: request.idempotencyKey,
    reason,
    timestamp: new Date().toISOString(),
  });

  return {
    success: false,
    railUsed: "moov",
    externalIds: [],
    sellerPayoutCents: 0,
    platformFeeCents: request.platformFeeCents,
    isFallback: false,
    error: `AMBIGUOUS — ${reason}. Manual reconciliation required.`,
    idempotencyKey: request.idempotencyKey,
    ambiguousState: true,
  };
}

/**
 * Execute Moov payout with finality-gated fallback to Modern Treasury.
 *
 * CRITICAL SAFETY LOGIC (RSK-003):
 *   Errors are classified as PROVEN_REJECTION or AMBIGUOUS_FAILURE.
 *
 *   Proven rejections (HTTP 400/422):
 *     → Record FAILED finality, proceed to MT fallback.
 *
 *   Ambiguous failures (timeout, 5xx, network):
 *     → Emit settlement_rail_timeout metric
 *     → Poll Moov via checkTransferStatus(idempotencyKey)
 *       - If Moov confirms success → return success (NO fallback)
 *       - If Moov confirms failure → proceed to fallback
 *       - If poll inconclusive → lock to AMBIGUOUS_STATE (NO fallback)
 *
 *   This prevents double-spend by NEVER blindly falling through to MT
 *   when Moov's outcome is unknown.
 */
async function executeMoovWithFallback(
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  // Try Moov first
  if (_moovRail && _moovRail.isConfigured()) {
    try {
      const result = await _moovRail.executePayout(request);
      if (result.success) {
        await updatePayoutStatus({
          idempotencyKey: request.idempotencyKey!,
          status: "SUBMITTED",
          externalId: result.externalIds[0],
        });
        return result;
      }

      // ── Moov returned { success: false } — classify the error ──
      const errorClass = classifyMoovError(result.error ?? "");

      if (errorClass === "PROVEN_REJECTION") {
        // Safe to fallback — Moov definitively rejected this transfer
        await updatePayoutStatus({
          idempotencyKey: request.idempotencyKey!,
          status: "FAILED",
          errorMessage: result.error,
        });
        await recordSettlementFinality({
          settlementId: request.settlementId,
          rail: "moov",
          externalTransferId: result.externalIds[0] ?? "none",
          idempotencyKey: request.idempotencyKey!,
          finalityStatus: "FAILED",
          amountCents: request.totalAmountCents,
          leg: "seller_payout",
          isFallback: false,
          errorMessage: result.error,
        });
        console.warn(
          `[AurumShield] Moov PROVEN_REJECTION for ${request.settlementId}: ${result.error}. Proceeding to finality-gated fallback.`,
        );
        // Fall through to finality-gated fallback below
      } else {
        // AMBIGUOUS_FAILURE from a { success: false } response —
        // Moov may have partially processed. Must poll.
        return await handleAmbiguousFailure(request, result.error ?? "unknown error from result");
      }
    } catch (err) {
      // ── Exception path — always ambiguous ──
      // Network timeout, DNS failure, connection reset, etc.
      const message = err instanceof Error ? err.message : String(err);

      // ── Metric: settlement_rail_timeout ──
      console.debug("[AurumShield Metric] settlement_rail_timeout", {
        settlementId: request.settlementId,
        idempotencyKey: request.idempotencyKey,
        error: message,
        timestamp: new Date().toISOString(),
      });

      return await handleAmbiguousFailure(request, message);
    }
  } else {
    console.warn(
      `[AurumShield] Moov rail not configured — checking finality before Modern Treasury fallback for ${request.settlementId}`,
    );
  }

  /* ── Finality-gated fallback ── */
  // Check if Moov has a PENDING or COMPLETED finality — if so, do NOT auto-retry
  const priorFinality = await checkPriorFinality(request.settlementId, "moov");
  if (priorFinality && priorFinality.finalityStatus !== "FAILED") {
    console.error(
      `[AurumShield] Prior Moov finality is '${priorFinality.finalityStatus}' for ${request.settlementId}. ` +
      `Refusing automatic fallback — requires manual review.`,
    );
    return {
      success: false,
      railUsed: "moov",
      externalIds: priorFinality.externalTransferId ? [priorFinality.externalTransferId] : [],
      sellerPayoutCents: 0,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      error: `Moov finality is '${priorFinality.finalityStatus}' — manual review required before fallback`,
      idempotencyKey: request.idempotencyKey,
    };
  }

  // Fallback to Modern Treasury — finality confirmed FAILED or no prior record
  const moovError = "Moov finality FAILED or no prior finality record";
  const fallbackResult = await executeFallback(request, moovError);
  await updatePayoutStatus({
    idempotencyKey: request.idempotencyKey!,
    status: fallbackResult.success ? "SUBMITTED" : "FAILED",
    externalId: fallbackResult.externalIds[0],
    errorMessage: fallbackResult.error,
  });
  return fallbackResult;
}

/**
 * Handle an ambiguous Moov failure by polling Moov's transfer API.
 *
 * Three outcomes:
 *   1. Moov confirms success → return success result, abort fallback
 *   2. Moov confirms failure → record finality, allow fallback
 *   3. Moov poll inconclusive → lock to AMBIGUOUS_STATE, abort fallback
 */
async function handleAmbiguousFailure(
  request: SettlementPayoutRequest,
  originalError: string,
): Promise<SettlementPayoutResult> {
  // ── Metric: settlement_rail_timeout ──
  console.debug("[AurumShield Metric] settlement_rail_timeout", {
    settlementId: request.settlementId,
    idempotencyKey: request.idempotencyKey,
    error: originalError,
    timestamp: new Date().toISOString(),
  });

  console.warn(
    `[AurumShield] AMBIGUOUS Moov failure for ${request.settlementId}: ${originalError}. ` +
    `Initiating status-check poll via idempotency key.`,
  );

  // Derive the seller-leg idempotency key that was sent to Moov
  const baseIdemKey = request.idempotencyKey ?? request.settlementId;
  const sellerIdemKey = `${baseIdemKey}:seller`;

  // ── Poll Moov for transfer status ──
  const pollResult = await checkTransferStatus(sellerIdemKey, request.settlementId);

  if (pollResult.found && pollResult.status) {
    const moovStatus = pollResult.status.toLowerCase();

    // Moov confirms the transfer was executed
    if (moovStatus === "completed" || moovStatus === "pending") {
      console.warn(
        `[AurumShield] Status-check poll CONFIRMED Moov transfer ` +
        `${pollResult.transferId} with status '${moovStatus}' for ${request.settlementId}. ` +
        `Fallback ABORTED — using Moov result.`,
      );

      // Record confirmed finality
      await recordSettlementFinality({
        settlementId: request.settlementId,
        rail: "moov",
        externalTransferId: pollResult.transferId ?? "poll-confirmed",
        idempotencyKey: request.idempotencyKey!,
        finalityStatus: moovStatus === "completed" ? "COMPLETED" : "PENDING",
        amountCents: request.totalAmountCents,
        leg: "seller_payout",
        isFallback: false,
      });

      await updatePayoutStatus({
        idempotencyKey: request.idempotencyKey!,
        status: "SUBMITTED",
        externalId: pollResult.transferId,
      });

      return {
        success: true,
        railUsed: "moov",
        externalIds: pollResult.transferId ? [pollResult.transferId] : [],
        sellerPayoutCents: request.totalAmountCents - request.platformFeeCents,
        platformFeeCents: request.platformFeeCents,
        isFallback: false,
        idempotencyKey: request.idempotencyKey,
      };
    }

    // Moov confirms the transfer definitively failed
    if (moovStatus === "failed" || moovStatus === "reversed") {
      console.warn(
        `[AurumShield] Status-check poll confirmed Moov transfer FAILED/REVERSED ` +
        `(${moovStatus}) for ${request.settlementId}. Safe to fallback.`,
      );

      await recordSettlementFinality({
        settlementId: request.settlementId,
        rail: "moov",
        externalTransferId: pollResult.transferId ?? "poll-confirmed-failed",
        idempotencyKey: request.idempotencyKey!,
        finalityStatus: "FAILED",
        amountCents: request.totalAmountCents,
        leg: "seller_payout",
        isFallback: false,
        errorMessage: `Poll confirmed: ${moovStatus}`,
      });

      await updatePayoutStatus({
        idempotencyKey: request.idempotencyKey!,
        status: "FAILED",
        errorMessage: `Moov transfer ${moovStatus} (confirmed via poll)`,
      });

      // Safe to fall through to finality-gated fallback
      const pollError = `Moov transfer ${moovStatus} (confirmed via poll)`;
      const fallbackResult = await executeFallback(request, pollError);
      await updatePayoutStatus({
        idempotencyKey: request.idempotencyKey!,
        status: fallbackResult.success ? "SUBMITTED" : "FAILED",
        externalId: fallbackResult.externalIds[0],
        errorMessage: fallbackResult.error,
      });
      return fallbackResult;
    }
  }

  // ── Poll inconclusive — LOCK to AMBIGUOUS_STATE ──
  // This is the safety net: we cannot determine Moov's outcome,
  // so we refuse to fallback and require manual intervention.
  return buildAmbiguousResult(
    request,
    `Moov payout outcome unknown after status-check poll. Original error: ${originalError}`,
  );
}

/**
 * Execute on a fallback rail (Modern Treasury) and mark the result accordingly.
 * Emits a P1 settlement_fallback_initiated audit event before executing.
 */
async function executeFallback(
  request: SettlementPayoutRequest,
  originalError: string = "unknown",
): Promise<SettlementPayoutResult> {
  // ── P1 ALERT: settlement_fallback_initiated ──
  emitSettlementFallbackEvent({
    settlementId: request.settlementId,
    originalRail: "moov",
    fallbackRail: "modern_treasury",
    amountCents: request.totalAmountCents,
    idempotencyKey: request.idempotencyKey,
    errorMessage: originalError,
    errorStack: new Error(originalError).stack,
  });

  const result = await executOnRailDirect("modern_treasury", request);
  return {
    ...result,
    isFallback: true,
  };
}

/**
 * Execute a payout on a named rail with no fallback.
 */
async function executOnRailDirect(
  railName: "moov" | "modern_treasury",
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  const rail = railName === "moov" ? _moovRail : _modernTreasuryRail;

  if (!rail) {
    return {
      success: false,
      railUsed: railName,
      externalIds: [],
      sellerPayoutCents: 0,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      error: `${railName} rail not registered. Call registerSettlementRail() at startup.`,
    };
  }

  if (!rail.isConfigured()) {
    return {
      success: false,
      railUsed: railName,
      externalIds: [],
      sellerPayoutCents: 0,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      error: `${railName} rail is not configured (missing API keys).`,
    };
  }

  return rail.executePayout(request);
}

/**
 * Execute on a specific rail. In auto mode with Moov, failures
 * trigger an automatic Modern Treasury fallback.
 */
async function executOnRailSingle(
  railName: "moov" | "modern_treasury",
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  return executOnRailDirect(railName, request);
}

// Alias for cleaner public API
const executOnRail = executOnRailSingle;

/**
 * Public-facing rail execution (no fallback).
 */
async function executeOnRail(
  railName: "moov" | "modern_treasury",
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  return executOnRail(railName, request);
}

/* ---------- Logistics Threshold ---------- */

/** Logistics threshold: $50,000 notional in cents */
export const LOGISTICS_THRESHOLD_CENTS = 50_000_00; // 5,000,000 cents = $50k

/**
 * Determine which logistics carrier to route to based on notional value.
 *
 * @param notionalCents Total notional USD value in cents
 * @returns "easypost" for ≤$50k, "brinks" for >$50k
 */
export function routeLogistics(
  notionalCents: number,
): "easypost" | "brinks" {
  return notionalCents <= LOGISTICS_THRESHOLD_CENTS ? "easypost" : "brinks";
}
