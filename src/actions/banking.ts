"use server";

/* ================================================================
   SETTLEMENT BANKING — Server Action (Modern Treasury Only)
   ================================================================
   Bridges the client-side TanStack Query hooks to the server-side
   settlement rail. This file runs ENTIRELY on the server — no API
   keys are ever exposed to the client.

   All settlements route through Modern Treasury (Fedwire/RTGS).
   There is NO dual-rail routing, NO Moov, NO fallback.
   ================================================================ */

import {
  routeSettlement,
  registerSettlementRail,
  type SettlementPayoutResult,
} from "@/lib/settlement-rail";
import { modernTreasuryRail } from "@/lib/banking-adapter";

/* Also preserve legacy types for backward compatibility */
export type { PayoutResult } from "@/lib/banking-adapter";

/* ── Register Modern Treasury at import time ── */
registerSettlementRail("modern_treasury", modernTreasuryRail);

/**
 * Route a settlement payout through Modern Treasury.
 *
 * All settlements use Fedwire/RTGS via Modern Treasury.
 * If MT fails, a SettlementRailError is thrown — no fallback.
 *
 * @param settlementId    AurumShield settlement ID
 * @param sellerAccountId External account ID (MT counterparty)
 * @param amount          Total settlement value in cents
 * @param fee             Platform fee in cents
 */
export async function triggerSettlementPayouts(
  settlementId: string,
  sellerAccountId: string,
  amount: number,
  fee: number,
): Promise<SettlementPayoutResult> {
  const result = await routeSettlement({
    settlementId,
    sellerAccountId,
    totalAmountCents: amount,
    platformFeeCents: fee,
  });

  /* ── Audit log — always visible in server stdout / CloudWatch ── */
  if (result.success) {
    console.log(
      `[AurumShield] Settlement payout via Modern Treasury for ${settlementId}:`,
      `externalIds=${JSON.stringify(result.externalIds)}`,
      `sellerPayout=$${(result.sellerPayoutCents / 100).toFixed(2)}`,
      `platformFee=$${(result.platformFeeCents / 100).toFixed(2)}`,
    );
  } else {
    console.error(
      `[AurumShield] Settlement payout FAILED for ${settlementId}:`,
      result.error,
    );
  }

  return result;
}
