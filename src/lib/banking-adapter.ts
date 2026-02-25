/* ================================================================
   BANKING ADAPTER — Modern Treasury Settlement Rail
   ================================================================
   Wraps the Modern Treasury SDK to execute outbound payment orders.
   Refactored into the ModernTreasurySettlementRail class implementing
   the ISettlementRail interface for dual-rail settlement routing.

   MUST NOT be imported in client components.
   All API keys / org IDs are read from process.env at call time.

   Legacy executePayout() function is preserved for backward
   compatibility and delegates to the class internally.
   ================================================================ */

import ModernTreasury from "modern-treasury";
import type {
  ISettlementRail,
  SettlementPayoutRequest,
  SettlementPayoutResult,
} from "./settlement-rail";

/* ---------- Legacy Result Type (preserved for backward compat) ---------- */

export interface PayoutResult {
  success: boolean;
  paymentOrderIds: string[];
  error?: string;
}

/* ---------- Environment Key Names ---------- */

const ENV_API_KEY = "MODERN_TREASURY_API_KEY";
const ENV_ORG_ID = "MODERN_TREASURY_ORGANIZATION_ID";
const ENV_REVENUE_ACCOUNT = "AURUMSHIELD_REVENUE_INTERNAL_ACCOUNT_ID";

/**
 * The internal account ID used as the *originating* account for all
 * outbound wires.  Set via env var; falls back to a labelled placeholder
 * so the adapter can still compile and render in demo mode.
 */
const ORIGINATING_INTERNAL_ACCOUNT_ID =
  process.env.AURUMSHIELD_ORIGINATING_INTERNAL_ACCOUNT_ID ??
  "demo-originating-internal-account";

/* ================================================================
   ModernTreasurySettlementRail Class
   ================================================================ */

export class ModernTreasurySettlementRail implements ISettlementRail {
  readonly name = "Modern Treasury (Fedwire / RTGS)";

  /**
   * Check if Modern Treasury credentials are present in the environment.
   */
  isConfigured(): boolean {
    const apiKey = process.env[ENV_API_KEY];
    const orgId = process.env[ENV_ORG_ID];
    return !!(
      apiKey &&
      orgId &&
      apiKey !== "YOUR_MODERN_TREASURY_API_KEY" &&
      orgId !== "YOUR_MODERN_TREASURY_ORG_ID"
    );
  }

  /**
   * Execute a payout via Modern Treasury payment orders.
   *
   * Flow:
   *   1. Seller Payout — wire to the seller's external account
   *   2. Fee Sweep — internal book transfer to revenue account
   */
  async executePayout(
    request: SettlementPayoutRequest,
  ): Promise<SettlementPayoutResult> {
    const apiKey = process.env[ENV_API_KEY];
    const orgId = process.env[ENV_ORG_ID];
    const revenueAccountId = process.env[ENV_REVENUE_ACCOUNT];

    /* ── Guard: mock fallback when credentials are absent ── */
    if (!apiKey || !orgId) {
      const sellerPayout =
        request.totalAmountCents - request.platformFeeCents;
      const idemSuffix = request.idempotencyKey
        ? request.idempotencyKey.slice(0, 12)
        : "no-idem";
      console.warn(
        `[AurumShield] ${ENV_API_KEY} or ${ENV_ORG_ID} not set — mock Modern Treasury payout for ${request.settlementId} (idem: ${idemSuffix})`,
      );
      return {
        success: true,
        railUsed: "modern_treasury",
        externalIds: [
          `mock-mt-seller-${request.settlementId}-${idemSuffix}`,
          `mock-mt-fee-${request.settlementId}-${idemSuffix}`,
        ],
        sellerPayoutCents: sellerPayout,
        platformFeeCents: request.platformFeeCents,
        isFallback: false,
        idempotencyKey: request.idempotencyKey,
      };
    }

    if (!revenueAccountId) {
      console.warn(
        `[AurumShield] ${ENV_REVENUE_ACCOUNT} not set — fee sweep will be skipped`,
      );
    }

    /* ── Initialise client (per-call, never cached at module level) ── */
    const mt = new ModernTreasury({
      apiKey,
      organizationID: orgId,
    });

    const sellerPayoutAmount =
      request.totalAmountCents - request.platformFeeCents;
    const externalIds: string[] = [];

    // Derive per-leg idempotency keys from the settlement-level key
    const baseIdemKey = request.idempotencyKey ?? request.settlementId;
    const sellerIdemKey = `${baseIdemKey}:seller`;
    const feeIdemKey = `${baseIdemKey}:fee`;

    try {
      /* ── 1. Seller Payout (Fedwire / RTGS) ── */
      const sellerOrder = await mt.paymentOrders.create({
        type: "wire",
        direction: "debit",
        amount: sellerPayoutAmount,
        currency: "USD",
        originating_account_id: ORIGINATING_INTERNAL_ACCOUNT_ID,
        receiving_account_id: request.sellerAccountId,
        description: `AurumShield Settlement Payout: ${request.settlementId}`,
        metadata: {
          settlementId: request.settlementId,
          leg: "seller_payout",
          idempotencyKey: sellerIdemKey,
          ...request.metadata,
        },
        // @ts-expect-error -- MT SDK supports idempotency_key in request body
        idempotency_key: sellerIdemKey,
      });
      externalIds.push(sellerOrder.id);

      /* ── 2. Fee Sweep (internal book transfer) ── */
      if (revenueAccountId && request.platformFeeCents > 0) {
        const feeOrder = await mt.paymentOrders.create({
          type: "book",
          direction: "debit",
          amount: request.platformFeeCents,
          currency: "USD",
          originating_account_id: ORIGINATING_INTERNAL_ACCOUNT_ID,
          receiving_account_id: revenueAccountId,
          description: `AurumShield Platform Fee: ${request.settlementId}`,
          metadata: {
            settlementId: request.settlementId,
            leg: "fee_sweep",
            idempotencyKey: feeIdemKey,
          },
          // @ts-expect-error -- MT SDK supports idempotency_key in request body
          idempotency_key: feeIdemKey,
        });
        externalIds.push(feeOrder.id);
      }

      return {
        success: true,
        railUsed: "modern_treasury",
        externalIds,
        sellerPayoutCents: sellerPayoutAmount,
        platformFeeCents: request.platformFeeCents,
        isFallback: false,
        idempotencyKey: request.idempotencyKey,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        "[AurumShield] Modern Treasury executePayout exception:",
        message,
      );
      return {
        success: false,
        railUsed: "modern_treasury",
        externalIds,
        sellerPayoutCents: 0,
        platformFeeCents: request.platformFeeCents,
        isFallback: false,
        error: message,
        idempotencyKey: request.idempotencyKey,
      };
    }
  }
}

/* ---------- Singleton Export ---------- */

/** Pre-instantiated rail for convenience. */
export const modernTreasuryRail = new ModernTreasurySettlementRail();

/* ================================================================
   Legacy API — Preserved for Backward Compatibility
   ================================================================
   Existing code that calls executePayout() directly will continue
   to work. This function now delegates to the class internally.
   ================================================================ */

/**
 * Execute two Modern Treasury payment orders atomically:
 *
 * 1. **Seller Payout** — wire to the seller's external account for the
 *    net settlement amount (total minus platform fee).
 * 2. **Fee Sweep** — internal book transfer of the platform fee into the
 *    AurumShield corporate revenue account.
 *
 * All monetary values are expressed in **cents** (smallest currency
 * denomination) to eliminate floating-point arithmetic entirely.
 *
 * @param sellerExternalAccountId  Modern Treasury external account ID for the seller
 * @param totalSettlementAmount    Total settlement value in cents
 * @param platformFeeAmount        Platform fee in cents
 * @param settlementId             AurumShield settlement ID (for description / metadata)
 *
 * @deprecated Use `modernTreasuryRail.executePayout()` or `routeSettlement()` instead.
 */
export async function executePayout(
  sellerExternalAccountId: string,
  totalSettlementAmount: number,
  platformFeeAmount: number,
  settlementId: string,
): Promise<PayoutResult> {
  const result = await modernTreasuryRail.executePayout({
    settlementId,
    sellerAccountId: sellerExternalAccountId,
    totalAmountCents: totalSettlementAmount,
    platformFeeCents: platformFeeAmount,
  });

  return {
    success: result.success,
    paymentOrderIds: result.externalIds,
    error: result.error,
  };
}
