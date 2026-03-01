/* ================================================================
   SETTLEMENT RAIL — 100% Modern Treasury (Fedwire/RTGS)
   ================================================================
   Single-rail settlement engine. All payouts route through Modern
   Treasury. There is NO fallback, NO dual-rail, NO auto-mode.
   If Modern Treasury fails, a fatal SettlementRailError is thrown
   and the settlement halts for manual intervention.

   Idempotency:
     Every payout request carries a deterministic key derived from
     SHA-256(settlement_id | payee_id | amount_cents | action_type).
     This key is passed to Modern Treasury (idempotency_key param)
     and persisted in the `payouts` table to prevent duplicate transfers.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { createHash } from "crypto";
import { emitSettlementPayoutConfirmedEvent } from "./audit-logger";
import { transitionSettlementState } from "./state-machine";

/* ---------- Types ---------- */

/** Payout instruction passed to the settlement rail. */
export interface SettlementPayoutRequest {
  /** AurumShield settlement ID (for idempotency & ledger reference) */
  settlementId: string;
  /** Seller external account identifier (Modern Treasury counterparty ID) */
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
   * Passed to Modern Treasury API.
   */
  idempotencyKey?: string;
}

/** Result returned by the settlement rail after executing a payout. */
export interface SettlementPayoutResult {
  /** Whether the payout was executed successfully */
  success: boolean;
  /** Rail that was used — always "modern_treasury" */
  railUsed: "modern_treasury";
  /** External IDs from Modern Treasury (payment order IDs) */
  externalIds: string[];
  /** Seller payout amount in cents */
  sellerPayoutCents: number;
  /** Platform fee in cents */
  platformFeeCents: number;
  /** Always false — no fallback exists */
  isFallback: false;
  /** Error message if the payout failed */
  error?: string;
  /** Idempotency key used for this payout attempt */
  idempotencyKey?: string;
}

/**
 * Settlement rail interface.
 * Only Modern Treasury implements this.
 */
export interface ISettlementRail {
  /** Human-readable rail name */
  readonly name: string;
  /** Execute a payout and fee sweep */
  executePayout(request: SettlementPayoutRequest): Promise<SettlementPayoutResult>;
  /** Check if the rail is configured (API keys present) */
  isConfigured(): boolean;
}

/* ---------- Fatal Error ---------- */

/**
 * Fatal settlement rail error. Thrown when Modern Treasury fails.
 * There is NO fallback — this halts the settlement for manual intervention.
 */
export class SettlementRailError extends Error {
  public readonly settlementId: string;
  public readonly idempotencyKey: string;
  public readonly railError: string;

  constructor(opts: {
    settlementId: string;
    idempotencyKey: string;
    railError: string;
  }) {
    super(
      `SETTLEMENT_RAIL_FATAL: Modern Treasury payout failed for settlement ${opts.settlementId}. ` +
      `No fallback rail available. Manual intervention required. ` +
      `Error: ${opts.railError}`,
    );
    this.name = "SettlementRailError";
    this.settlementId = opts.settlementId;
    this.idempotencyKey = opts.idempotencyKey;
    this.railError = opts.railError;
  }
}

/* ---------- Idempotency Key Generation ---------- */

/**
 * Generate a deterministic idempotency key from settlement parameters.
 * Key = SHA-256(settlement_id | payee_id | amount_cents | action_type)
 *
 * Passed to Modern Treasury (idempotency_key param) and persisted
 * in the `payouts` table for dedup on webhooks.
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
  rail: "modern_treasury";
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
  rail: "modern_treasury";
  externalTransferId: string;
  idempotencyKey: string;
  finalityStatus: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED" | "REQUIRES_REVIEW";
  amountCents: number;
  leg: "seller_payout" | "fee_sweep";
  isFallback: false;
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
 * Check if a prior payout attempt already exists for this idempotency key
 * with a non-retriable status. Returns the conflict status or null if safe.
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
    return null;
  }
}

/**
 * Check if a prior transfer finality exists for a settlement.
 */
export async function checkPriorFinality(
  settlementId: string,
): Promise<{ finalityStatus: string; externalTransferId: string | null } | null> {
  try {
    const { getDbClient } = await import("@/lib/db");
    const db = await getDbClient();
    try {
      const result = await db.query(
        `SELECT finality_status, external_transfer_id
         FROM settlement_finality
         WHERE settlement_id = $1 AND rail = 'modern_treasury' AND leg = 'seller_payout'
         ORDER BY created_at DESC LIMIT 1`,
        [settlementId],
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
    return null;
  }
}

/* ---------- Registry ---------- */

let _modernTreasuryRail: ISettlementRail | null = null;

/**
 * Register the Modern Treasury rail implementation.
 */
export function registerSettlementRail(
  railName: "modern_treasury",
  rail: ISettlementRail,
): void {
  _modernTreasuryRail = rail;
  console.log(`[SETTLEMENT-RAIL] Registered rail: ${railName} (${rail.name})`);
}

/* ---------- Router ---------- */

/**
 * Route a settlement payout through Modern Treasury.
 *
 * This is the ONLY settlement rail. If Modern Treasury fails,
 * a fatal SettlementRailError is thrown. There is NO fallback.
 */
export async function routeSettlement(
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
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

  /* ── RSK-003: Pre-execution idempotency guard ── */
  const priorPayout = await checkPayoutIdempotency(request.idempotencyKey!);
  if (priorPayout) {
    console.error(
      `[AurumShield P1 ALERT] idempotency_conflict | ` +
      `settlementId=${request.settlementId} ` +
      `idempotencyKey=${request.idempotencyKey} ` +
      `priorStatus=${priorPayout.status} ` +
      `priorExternalId=${priorPayout.externalId ?? "N/A"} | ` +
      `Replay attempt rejected.`,
    );
    return {
      success: false,
      railUsed: "modern_treasury",
      externalIds: priorPayout.externalId ? [priorPayout.externalId] : [],
      sellerPayoutCents: 0,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      error: `IDEMPOTENCY_CONFLICT: A payout for this settlement is already ${priorPayout.status}. ` +
        `External ID: ${priorPayout.externalId ?? "pending"}.`,
      idempotencyKey: request.idempotencyKey,
    };
  }

  /* ── Check prior finality ── */
  const priorFinality = await checkPriorFinality(request.settlementId);
  if (priorFinality && (priorFinality.finalityStatus === "COMPLETED" || priorFinality.finalityStatus === "PENDING")) {
    return {
      success: false,
      railUsed: "modern_treasury",
      externalIds: priorFinality.externalTransferId ? [priorFinality.externalTransferId] : [],
      sellerPayoutCents: 0,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      error: `Settlement ${request.settlementId} already has ${priorFinality.finalityStatus} finality.`,
      idempotencyKey: request.idempotencyKey,
    };
  }

  /* ── Record payout attempt ── */
  await recordPayoutAttempt({
    settlementId: request.settlementId,
    payeeId: request.sellerAccountId,
    idempotencyKey: request.idempotencyKey!,
    rail: "modern_treasury",
    actionType: "settlement_payout",
    amountCents: request.totalAmountCents,
  });

  /* ── State Machine — PENDING_RAIL → RAIL_SUBMITTED ── */
  transitionSettlementState(
    request.settlementId,
    "PENDING_RAIL",
    "RAIL_SUBMITTED",
    "system",
    "system",
  );

  /* ── Execute on Modern Treasury ── */
  if (!_modernTreasuryRail || !_modernTreasuryRail.isConfigured()) {
    throw new SettlementRailError({
      settlementId: request.settlementId,
      idempotencyKey: request.idempotencyKey!,
      railError: "Modern Treasury rail is not registered or not configured. Settlement halted.",
    });
  }

  try {
    const result = await _modernTreasuryRail.executePayout(request);

    await updatePayoutStatus({
      idempotencyKey: request.idempotencyKey!,
      status: result.success ? "SUBMITTED" : "FAILED",
      externalId: result.externalIds[0],
      errorMessage: result.error,
    });

    if (result.success) {
      emitSettlementPayoutConfirmedEvent({
        settlementId: request.settlementId,
        idempotencyKey: request.idempotencyKey ?? "N/A",
        railUsed: "modern_treasury",
        externalIds: result.externalIds,
        sellerPayoutCents: result.sellerPayoutCents,
        platformFeeCents: result.platformFeeCents,
        totalAmountCents: request.totalAmountCents,
        isFallback: false,
      });
    }

    if (!result.success) {
      throw new SettlementRailError({
        settlementId: request.settlementId,
        idempotencyKey: request.idempotencyKey!,
        railError: result.error ?? "Modern Treasury payout rejected",
      });
    }

    return { ...result, idempotencyKey: request.idempotencyKey };
  } catch (err) {
    if (err instanceof SettlementRailError) throw err;

    const message = err instanceof Error ? err.message : String(err);
    await updatePayoutStatus({
      idempotencyKey: request.idempotencyKey!,
      status: "FAILED",
      errorMessage: message,
    });

    throw new SettlementRailError({
      settlementId: request.settlementId,
      idempotencyKey: request.idempotencyKey!,
      railError: message,
    });
  }
}

/* ---------- Logistics Routing (retained for backward compat) ---------- */

/** Route logistics based on notional value — always Brink's or Malca-Amit. */
export function routeLogistics(
  _notionalCents: number,
): "brinks" | "malca_amit" {
  // All institutional shipments use sovereign carriers
  // Brink's for standard, Malca-Amit for high-value or international
  return _notionalCents > 50_000_000 ? "malca_amit" : "brinks";
}
