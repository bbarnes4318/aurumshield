"use server";

/* ================================================================
   SETTLEMENT BANKING — Server Action

   Bridges the client-side TanStack Query hooks to the server-side
   banking adapter (Modern Treasury SDK).  This file runs ENTIRELY
   on the server — no API keys are ever exposed to the client.
   ================================================================ */

import { executePayout, type PayoutResult } from "@/lib/banking-adapter";

/**
 * Trigger outbound payment orders for a settled DvP transaction.
 *
 * Creates two Modern Treasury payment orders:
 *   1. Seller payout (total minus fee) via Fedwire / RTGS
 *   2. Fee sweep to AurumShield corporate revenue account
 *
 * All monetary values are in **cents** (smallest denomination).
 *
 * @param settlementId          AurumShield settlement ID
 * @param sellerAccountId       Modern Treasury external account ID for the seller
 * @param amount                Total settlement value in cents
 * @param fee                   Platform fee in cents
 */
export async function triggerSettlementPayouts(
  settlementId: string,
  sellerAccountId: string,
  amount: number,
  fee: number,
): Promise<PayoutResult> {
  const result = await executePayout(
    sellerAccountId,
    amount,
    fee,
    settlementId,
  );

  /* ── Audit log — always visible in server stdout / CloudWatch ── */
  if (result.success) {
    console.log(
      `[AurumShield] Banking payouts created for settlement ${settlementId}:`,
      `paymentOrderIds=${JSON.stringify(result.paymentOrderIds)}`,
    );
  } else {
    console.error(
      `[AurumShield] Banking payout FAILED for settlement ${settlementId}:`,
      result.error,
    );
  }

  return result;
}
