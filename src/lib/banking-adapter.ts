/* ================================================================
   BANKING ADAPTER — Server-Side Only

   Wraps the Modern Treasury SDK to execute outbound payment orders.
   MUST NOT be imported in client components.
   All API keys / org IDs are read from process.env at call time.
   ================================================================ */

import ModernTreasury from "modern-treasury";

/* ---------- Result Type ---------- */

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
 */
export async function executePayout(
  sellerExternalAccountId: string,
  totalSettlementAmount: number,
  platformFeeAmount: number,
  settlementId: string,
): Promise<PayoutResult> {
  /* ── Guard: env vars must be present ── */
  const apiKey = process.env[ENV_API_KEY];
  const orgId = process.env[ENV_ORG_ID];
  const revenueAccountId = process.env[ENV_REVENUE_ACCOUNT];

  if (!apiKey || !orgId) {
    console.warn(
      `[AurumShield] ${ENV_API_KEY} or ${ENV_ORG_ID} not set — banking payout skipped`,
    );
    return {
      success: false,
      paymentOrderIds: [],
      error: "Modern Treasury credentials not configured",
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

  const sellerPayoutAmount = totalSettlementAmount - platformFeeAmount;
  const paymentOrderIds: string[] = [];

  try {
    /* ── 1. Seller Payout (Fedwire / RTGS) ── */
    const sellerOrder = await mt.paymentOrders.create({
      type: "wire",
      direction: "debit",
      amount: sellerPayoutAmount,
      currency: "USD",
      originating_account_id: ORIGINATING_INTERNAL_ACCOUNT_ID,
      receiving_account_id: sellerExternalAccountId,
      description: `AurumShield Settlement Payout: ${settlementId}`,
      metadata: { settlementId, leg: "seller_payout" },
    });
    paymentOrderIds.push(sellerOrder.id);

    /* ── 2. Fee Sweep (internal book transfer) ── */
    if (revenueAccountId && platformFeeAmount > 0) {
      const feeOrder = await mt.paymentOrders.create({
        type: "book",
        direction: "debit",
        amount: platformFeeAmount,
        currency: "USD",
        originating_account_id: ORIGINATING_INTERNAL_ACCOUNT_ID,
        receiving_account_id: revenueAccountId,
        description: `AurumShield Platform Fee: ${settlementId}`,
        metadata: { settlementId, leg: "fee_sweep" },
      });
      paymentOrderIds.push(feeOrder.id);
    }

    return { success: true, paymentOrderIds };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AurumShield] executePayout exception:", message);
    return { success: false, paymentOrderIds, error: message };
  }
}
