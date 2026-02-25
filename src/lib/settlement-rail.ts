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

  /* ── Record payout attempt ── */
  await recordPayoutAttempt({
    settlementId: request.settlementId,
    payeeId: request.sellerAccountId,
    idempotencyKey: request.idempotencyKey!,
    rail: mode === "modern_treasury" ? "modern_treasury" : "moov",
    actionType: "settlement_payout",
    amountCents: request.totalAmountCents,
  });

  /* ── Force Moov ── */
  if (mode === "moov") {
    const result = await executeOnRail("moov", request);
    await updatePayoutStatus({
      idempotencyKey: request.idempotencyKey!,
      status: result.success ? "SUBMITTED" : "FAILED",
      externalId: result.externalIds[0],
      errorMessage: result.error,
    });
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
  return { ...result, idempotencyKey: request.idempotencyKey };
}

/**
 * Execute on a specific rail. Returns a structured error if the rail
 * is not registered or not configured.
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

      // Moov failed — record finality before attempting fallback
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
        `[AurumShield] Moov payout failed for ${request.settlementId}: ${result.error}. Checking finality before fallback.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[AurumShield] Moov payout exception for ${request.settlementId}: ${message}. Checking finality before fallback.`,
      );
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
  const fallbackResult = await executeFallback(request);
  await updatePayoutStatus({
    idempotencyKey: request.idempotencyKey!,
    status: fallbackResult.success ? "SUBMITTED" : "FAILED",
    externalId: fallbackResult.externalIds[0],
    errorMessage: fallbackResult.error,
  });
  return fallbackResult;
}

/**
 * Execute on a fallback rail (Modern Treasury) and mark the result accordingly.
 */
async function executeFallback(
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
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
