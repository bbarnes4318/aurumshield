"use server";

/* ================================================================
   BROKER DEAL STRUCTURING ENGINE — Server Action
   ================================================================
   Allows brokers to initiate a DvP (Delivery vs Payment) trade
   between a buyer and seller, injecting a custom commission fee
   (basis points) into the settlement waterfall.

   Flow:
     1. Validate payload via Zod
     2. Resolve broker entity from session
     3. Query live spot price via Oracle / B-PIPE adapter
     4. Calculate gross notional from asset weights × spot
     5. Calculate broker commission from brokerFeeBps
     6. INSERT pending order + settlement_case inside a
        Postgres transaction (BEGIN / COMMIT)

   Server-side only — "use server" directive.
   ================================================================ */

import { z } from "zod";
import { requireRole } from "@/lib/authz";

/* ── Zod Schema ── */

const DealPayloadSchema = z.object({
  /** UUID of the buyer user */
  buyerId: z.string().uuid({ message: "buyerId must be a valid UUID" }),
  /** UUID of the seller user */
  sellerId: z.string().uuid({ message: "sellerId must be a valid UUID" }),
  /** Array of LBMA Good Delivery bar serials to include in this deal */
  assetIds: z
    .array(z.string().min(1, "Asset serial cannot be empty"))
    .min(1, "At least one asset is required")
    .max(100, "Maximum 100 assets per deal"),
  /** Broker commission fee in basis points (e.g., 50 = 0.50%) */
  brokerFeeBps: z
    .number()
    .int("brokerFeeBps must be an integer")
    .min(0, "brokerFeeBps cannot be negative")
    .max(500, "brokerFeeBps cannot exceed 500 bps (5%)"),
  /** Optional listing ID to associate with a marketplace listing */
  listingId: z.string().optional(),
  /** Settlement rail preference */
  rail: z.enum(["WIRE", "RTGS"]).default("WIRE"),
});

export type DealPayload = z.infer<typeof DealPayloadSchema>;

/* ── Result Types ── */

export interface StructuredDealResult {
  success: true;
  dealId: string;
  orderId: string;
  settlementCaseId: string;
  grossNotionalUsd: number;
  brokerCommissionUsd: number;
  netSellerProceedsUsd: number;
  spotPriceUsed: number;
  totalWeightOz: number;
  assetCount: number;
}

export interface StructuredDealError {
  success: false;
  error: string;
  code: string;
}

/* ── Constants ── */

/** Standard LBMA Good Delivery bar weight in troy ounces */
const LBMA_BAR_WEIGHT_OZ = 400;

/* ================================================================
   PUBLIC ACTION
   ================================================================ */

/**
 * Structure a brokered DvP deal between a buyer and seller.
 *
 * Auth: Requires BROKER role.
 * Validation: Strict Zod schema on all inputs.
 * Execution: Wrapped in a Postgres BEGIN/COMMIT transaction.
 */
export async function structureBrokerDeal(
  rawPayload: unknown,
): Promise<StructuredDealResult | StructuredDealError> {
  // ── 1. Auth: Require BROKER role ──
  let session;
  try {
    session = await requireRole("BROKER");
  } catch {
    return {
      success: false,
      error: "Authentication failed: BROKER role required",
      code: "AUTH_DENIED",
    };
  }

  // ── 2. Validate payload ──
  const parsed = DealPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      code: "VALIDATION_ERROR",
    };
  }

  const payload = parsed.data;

  // ── 3. Guard: buyer !== seller ──
  if (payload.buyerId === payload.sellerId) {
    return {
      success: false,
      error: "Buyer and seller cannot be the same entity",
      code: "SELF_DEALING",
    };
  }

  // ── 4. Get DB client and run inside transaction ──
  const { getDbClient } = await import("@/lib/db");
  const db = await getDbClient();

  try {
    await db.query("BEGIN");

    // ── 5. Resolve broker entity from the authenticated user ──
    const { rows: brokerRows } = await db.query<{
      id: string;
      kyb_status: string;
      commission_default_bps: number;
    }>(
      `SELECT id, kyb_status, commission_default_bps
       FROM brokers
       WHERE user_id = $1`,
      [session.userId],
    );

    if (brokerRows.length === 0) {
      await db.query("ROLLBACK");
      return {
        success: false,
        error: "No broker profile found for authenticated user. Complete KYB onboarding first.",
        code: "BROKER_NOT_FOUND",
      };
    }

    const broker = brokerRows[0];

    if (broker.kyb_status !== "APPROVED") {
      await db.query("ROLLBACK");
      return {
        success: false,
        error: `Broker KYB status is ${broker.kyb_status} — must be APPROVED to structure deals`,
        code: "KYB_NOT_APPROVED",
      };
    }

    // ── 6. Verify both buyer & seller exist ──
    const { rows: counterpartyRows } = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE id = ANY($1::uuid[])`,
      [[payload.buyerId, payload.sellerId]],
    );

    if (counterpartyRows.length < 2) {
      await db.query("ROLLBACK");
      return {
        success: false,
        error: "One or both counterparties not found in the system",
        code: "COUNTERPARTY_NOT_FOUND",
      };
    }

    // ── 7. Get live spot price from Oracle ──
    const { getSpotPrice } = await import("@/lib/pricing/bpipe-adapter");
    const spot = await getSpotPrice();
    const spotPricePerOz = spot.pricePerOz;

    // ── 8. Calculate notional ──
    const totalWeightOz = payload.assetIds.length * LBMA_BAR_WEIGHT_OZ;
    const grossNotionalUsd = Number(
      (totalWeightOz * spotPricePerOz).toFixed(2),
    );
    const grossNotionalCents = Math.round(grossNotionalUsd * 100);

    // ── 9. Calculate broker commission ──
    const brokerCommissionUsd = Number(
      ((grossNotionalUsd * payload.brokerFeeBps) / 10_000).toFixed(2),
    );
    const netSellerProceedsUsd = Number(
      (grossNotionalUsd - brokerCommissionUsd).toFixed(2),
    );

    // ── 10. Generate IDs ──
    const dealId = `BRK-${Date.now().toString(36).toUpperCase()}`;

    // ── 11. INSERT settlement case with broker columns ──
    const { rows: settlementRows } = await db.query<{ id: string }>(
      `INSERT INTO settlement_cases (
         id, buyer_id, listing_id, order_id,
         locked_price_per_oz, weight_oz, total_notional,
         settlement_rail, delivery_method, status,
         broker_id, broker_fee_bps
       ) VALUES (
         gen_random_uuid(), $1, $2, $3,
         $4, $5, $6,
         $7, 'VAULT_CUSTODY', 'ESCROW_OPEN',
         $8, $9
       ) RETURNING id`,
      [
        payload.buyerId,
        payload.listingId ?? `broker-${dealId}`,
        dealId,
        spotPricePerOz,
        totalWeightOz,
        grossNotionalUsd,
        payload.rail,
        broker.id,
        payload.brokerFeeBps,
      ],
    );

    const settlementCaseId = settlementRows[0].id;

    // ── 12. INSERT DvP escrow record ──
    await db.query(
      `INSERT INTO dvp_escrow (
         id, settlement_case_id, buyer_id, seller_id,
         gold_weight_oz, locked_price_usd, gross_notional_cents,
         broker_fee_bps, broker_commission_cents,
         net_seller_proceeds_cents, status
       ) VALUES (
         gen_random_uuid(), $1, $2, $3,
         $4, $5, $6,
         $7, $8,
         $9, 'PENDING'
       )`,
      [
        settlementCaseId,
        payload.buyerId,
        payload.sellerId,
        totalWeightOz,
        spotPricePerOz,
        grossNotionalCents,
        payload.brokerFeeBps,
        Math.round(brokerCommissionUsd * 100),
        Math.round(netSellerProceedsUsd * 100),
      ],
    );

    // ── 13. COMMIT ──
    await db.query("COMMIT");

    console.log(
      `[BrokerEngine] Deal structured: ${dealId} — ` +
        `${payload.assetIds.length} bars, ${totalWeightOz} oz, ` +
        `$${grossNotionalUsd.toLocaleString()} gross, ` +
        `${payload.brokerFeeBps} bps ($${brokerCommissionUsd.toLocaleString()}) commission ` +
        `by broker ${session.userId}`,
    );

    return {
      success: true,
      dealId,
      orderId: dealId,
      settlementCaseId,
      grossNotionalUsd,
      brokerCommissionUsd,
      netSellerProceedsUsd,
      spotPriceUsed: spotPricePerOz,
      totalWeightOz,
      assetCount: payload.assetIds.length,
    };
  } catch (err) {
    // ── ROLLBACK on any error ──
    try {
      await db.query("ROLLBACK");
    } catch {
      /* ignore rollback errors */
    }

    console.error("[BrokerEngine] Deal structuring failed:", err);

    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unknown error during deal structuring",
      code: "INTERNAL_ERROR",
    };
  } finally {
    try {
      await db.end();
    } catch {
      /* ignore cleanup */
    }
  }
}
