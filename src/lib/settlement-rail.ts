/* ================================================================
   SETTLEMENT RAIL — Dual-Rail Settlement (Column + Turnkey)
   ================================================================
   Dual-rail settlement engine routing payouts through either:
     1. Column Bank (Fedwire / RTGS) — for USD fiat payouts
     2. Turnkey (MPC ERC-20) — for USDT stablecoin payouts

   If a rail fails, a fatal SettlementRailError is thrown
   and the settlement halts for manual intervention.

   Idempotency:
     Every payout request carries a deterministic key derived from
     SHA-256(settlement_id | payee_id | amount_cents | action_type).
     This key is passed to the rail provider and persisted in the
     `payouts` table to prevent duplicate transfers.

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
  /** Seller virtual account identifier (Column virtual account ID for USD payouts) */
  sellerVirtualAccountId: string;
  /** Total settlement value in cents (smallest USD denomination) */
  totalAmountCents: number;
  /** Platform fee in cents */
  platformFeeCents: number;
  /** Payout currency — determines which rail is used */
  payoutCurrency: "USD" | "USDT";
  /** Producer wallet address for USDT payouts (required when payoutCurrency === "USDT") */
  producerWalletAddress?: string;
  /** Optional metadata to attach to the payment order */
  metadata?: Record<string, string>;
  /**
   * Platform-generated idempotency key. Derived from:
   *   SHA-256(settlement_id | payee_id | amount_cents | action_type)
   * Passed to the rail provider.
   */
  idempotencyKey?: string;
}

/** Result returned by the settlement rail after executing a payout. */
export interface SettlementPayoutResult {
  /** Whether the payout was executed successfully */
  success: boolean;
  /** Rail that was used for this payout */
  railUsed: "column" | "turnkey";
  /** External IDs from the rail provider */
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
 * Implemented by ColumnBankService (USD) and TurnkeyService (USDT).
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
 * Fatal settlement rail error. Thrown when a payout rail fails.
 * There is NO automatic fallback — this halts the settlement for manual intervention.
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
      `SETTLEMENT_RAIL_FATAL: Payout failed for settlement ${opts.settlementId}. ` +
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
 * Passed to the rail provider and persisted in the `payouts` table
 * for dedup on webhooks.
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
  rail: "column" | "turnkey";
  actionType: string;
  amountCents: number;
}): Promise<void> {
  // FATAL: If this write fails, a duplicate payout could slip through
  // the idempotency guard. We MUST throw to halt the settlement.
  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();
  try {
    await client.query(
      `INSERT INTO payouts
         (settlement_id, payee_id, idempotency_key, rail, action_type, amount_cents, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
       ON CONFLICT (idempotency_key) DO UPDATE SET
         attempt_count = payouts.attempt_count + 1,
         updated_at = NOW()`,
      [params.settlementId, params.payeeId, params.idempotencyKey, params.rail, params.actionType, params.amountCents],
    );
  } catch (err) {
    console.error("[SETTLEMENT-RAIL] FATAL: Failed to record payout attempt — halting settlement to prevent duplicate payouts:", err);
    throw err; // Re-throw: caller MUST handle this as a settlement-halting error
  } finally {
    client.release();
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
    const { getPoolClient } = await import("@/lib/db");
    const client = await getPoolClient();
    try {
      await client.query(
        `UPDATE payouts SET status = $1, external_id = COALESCE($2, external_id),
         error_message = $3, updated_at = NOW()
         WHERE idempotency_key = $4`,
        [params.status, params.externalId ?? null, params.errorMessage ?? null, params.idempotencyKey],
      );
    } finally {
      client.release();
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
  rail: "column" | "turnkey";
  externalTransferId: string;
  idempotencyKey: string;
  finalityStatus: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED" | "REQUIRES_REVIEW";
  amountCents: number;
  leg: "seller_payout" | "fee_sweep";
  isFallback: false;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { getPoolClient } = await import("@/lib/db");
    const client = await getPoolClient();
    try {
      await client.query(
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
      client.release();
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
    const { getPoolClient } = await import("@/lib/db");
    const client = await getPoolClient();
    try {
      const result = await client.query(
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
      client.release();
    }
  } catch (err) {
    console.error("[SETTLEMENT-RAIL] Failed to check payout idempotency:", err);
    return null;
  }
}

/**
 * Check if a prior transfer finality exists for a settlement.
 * Checks both Column and Turnkey rails.
 */
export async function checkPriorFinality(
  settlementId: string,
): Promise<{ finalityStatus: string; externalTransferId: string | null } | null> {
  try {
    const { getPoolClient } = await import("@/lib/db");
    const client = await getPoolClient();
    try {
      const result = await client.query(
        `SELECT finality_status, external_transfer_id
         FROM settlement_finality
         WHERE settlement_id = $1 AND rail IN ('column', 'turnkey') AND leg = 'seller_payout'
         ORDER BY created_at DESC LIMIT 1`,
        [settlementId],
      );
      if (result.rows.length === 0) return null;
      return {
        finalityStatus: result.rows[0].finality_status,
        externalTransferId: result.rows[0].external_transfer_id,
      };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[SETTLEMENT-RAIL] Failed to check prior finality:", err);
    return null;
  }
}

/* ---------- Registry ---------- */

const _railRegistry = new Map<"column" | "turnkey", ISettlementRail>();

/**
 * Register a settlement rail implementation.
 */
export function registerSettlementRail(
  railName: "column" | "turnkey",
  rail: ISettlementRail,
): void {
  _railRegistry.set(railName, rail);
  console.log(`[SETTLEMENT-RAIL] Registered rail: ${railName} (${rail.name})`);
}

/* ---------- Router ---------- */

/**
 * Route a settlement payout through the appropriate rail based on
 * the payout currency:
 *   - "USD"  → Column Bank (Fedwire / RTGS)
 *   - "USDT" → Turnkey (MPC ERC-20 transfer)
 *
 * If the rail fails, a fatal SettlementRailError is thrown.
 * There is NO automatic fallback between rails.
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
        request.sellerVirtualAccountId,
        request.totalAmountCents,
        "settlement_payout",
      ),
    };
  }

  /* ── RSK-003: Pre-execution idempotency guard ── */
  const priorPayout = await checkPayoutIdempotency(request.idempotencyKey!);
  if (priorPayout) {
    const activeRail: "column" | "turnkey" = request.payoutCurrency === "USDT" ? "turnkey" : "column";
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
      railUsed: activeRail,
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
    const activeRail: "column" | "turnkey" = request.payoutCurrency === "USDT" ? "turnkey" : "column";
    return {
      success: false,
      railUsed: activeRail,
      externalIds: priorFinality.externalTransferId ? [priorFinality.externalTransferId] : [],
      sellerPayoutCents: 0,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      error: `Settlement ${request.settlementId} already has ${priorFinality.finalityStatus} finality.`,
      idempotencyKey: request.idempotencyKey,
    };
  }

  /* ── Dual-Rail Routing ── */
  if (request.payoutCurrency === "USDT") {
    return await routeUsdtPayout(request);
  } else {
    return await routeUsdPayout(request);
  }
}

/* ---------- USD Payout (Column Bank / Fedwire) ---------- */

async function routeUsdPayout(
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  /* ── Record payout attempt ── */
  await recordPayoutAttempt({
    settlementId: request.settlementId,
    payeeId: request.sellerVirtualAccountId,
    idempotencyKey: request.idempotencyKey!,
    rail: "column",
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

  /* ── Execute on Column Bank ── */
  try {
    const { columnBankService } = await import("@/lib/banking/column-adapter");

    if (!columnBankService.isConfigured()) {
      throw new SettlementRailError({
        settlementId: request.settlementId,
        idempotencyKey: request.idempotencyKey!,
        railError: "Column Bank rail is not configured. Settlement halted.",
      });
    }

    const sellerPayoutCents = request.totalAmountCents - request.platformFeeCents;

    // Execute the outbound Fedwire via Column
    const wireResult = await columnBankService.initiateOutboundWire(
      request.sellerVirtualAccountId,
      sellerPayoutCents,
      {
        routingNumber: request.metadata?.destinationRoutingNumber ?? "",
        accountNumber: request.metadata?.destinationAccountNumber ?? "",
        beneficiaryName: request.metadata?.beneficiaryName ?? "Settlement Payout",
      },
      {
        settlementId: request.settlementId,
        idempotencyKey: request.idempotencyKey ?? "",
        leg: "seller_payout",
      },
    );

    await updatePayoutStatus({
      idempotencyKey: request.idempotencyKey!,
      status: "SUBMITTED",
      externalId: wireResult.id,
    });

    emitSettlementPayoutConfirmedEvent({
      settlementId: request.settlementId,
      idempotencyKey: request.idempotencyKey ?? "N/A",
      railUsed: "column",
      externalIds: [wireResult.id],
      sellerPayoutCents,
      platformFeeCents: request.platformFeeCents,
      totalAmountCents: request.totalAmountCents,
      isFallback: false,
    });

    const result: SettlementPayoutResult = {
      success: true,
      railUsed: "column",
      externalIds: [wireResult.id],
      sellerPayoutCents,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      idempotencyKey: request.idempotencyKey,
    };

    return result;
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

/* ---------- USDT Payout (Turnkey MPC) ---------- */

async function routeUsdtPayout(
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  if (!request.producerWalletAddress) {
    throw new SettlementRailError({
      settlementId: request.settlementId,
      idempotencyKey: request.idempotencyKey!,
      railError: "producerWalletAddress is required for USDT payouts but was not provided.",
    });
  }

  /* ── Record payout attempt ── */
  await recordPayoutAttempt({
    settlementId: request.settlementId,
    payeeId: request.producerWalletAddress,
    idempotencyKey: request.idempotencyKey!,
    rail: "turnkey",
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

  /* ── Execute on Turnkey ── */
  try {
    const { turnkeyService } = await import("@/lib/banking/turnkey-adapter");

    const sellerPayoutCents = request.totalAmountCents - request.platformFeeCents;

    // Convert cents to USDT base units (6 decimals)
    // cents * 10000 = base units
    const amountBaseUnits = (BigInt(sellerPayoutCents) * BigInt(10000)).toString();

    const payoutResult = await turnkeyService.executeOutboundPayout({
      producerWalletAddress: request.producerWalletAddress,
      amountBaseUnits,
      settlementId: request.settlementId,
      idempotencyKey: request.idempotencyKey!,
    });

    if (!payoutResult.success) {
      throw new Error(payoutResult.error ?? "Turnkey outbound payout rejected");
    }

    await updatePayoutStatus({
      idempotencyKey: request.idempotencyKey!,
      status: "SUBMITTED",
      externalId: payoutResult.txHash,
    });

    emitSettlementPayoutConfirmedEvent({
      settlementId: request.settlementId,
      idempotencyKey: request.idempotencyKey ?? "N/A",
      railUsed: "turnkey",
      externalIds: [payoutResult.txHash],
      sellerPayoutCents,
      platformFeeCents: request.platformFeeCents,
      totalAmountCents: request.totalAmountCents,
      isFallback: false,
    });

    const result: SettlementPayoutResult = {
      success: true,
      railUsed: "turnkey",
      externalIds: [payoutResult.txHash],
      sellerPayoutCents,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      idempotencyKey: request.idempotencyKey,
    };

    return result;
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
