"use server";

/* ================================================================
   SETTLEMENT BANKING — Server Action (Dual-Rail)
   ================================================================
   Bridges the client-side TanStack Query hooks to the server-side
   settlement rail router.  This file runs ENTIRELY on the server —
   no API keys are ever exposed to the client.

   Routing:
     - Auto mode: ≤$250k → Moov, >$250k → Modern Treasury
     - Moov failures auto-retry on Modern Treasury
     - Mode override via SETTLEMENT_RAIL env var
   ================================================================ */

import {
  routeSettlement,
  registerSettlementRail,
  type SettlementPayoutResult,
} from "@/lib/settlement-rail";
import { modernTreasuryRail } from "@/lib/banking-adapter";
import { moovRail } from "@/lib/moov-adapter";

/* Also preserve legacy types for backward compatibility */
export type { PayoutResult } from "@/lib/banking-adapter";

/* ── Register both rails at import time ── */
registerSettlementRail("modern_treasury", modernTreasuryRail);
registerSettlementRail("moov", moovRail);

/**
 * Route a settlement payout through the dual-rail system.
 *
 * Routing logic (SETTLEMENT_RAIL env var):
 *   - "auto"             → ≤$250k Moov, >$250k Modern Treasury, with fallback
 *   - "moov"             → Force Moov for all amounts
 *   - "modern_treasury"  → Force Modern Treasury for all amounts
 *
 * @param settlementId    AurumShield settlement ID
 * @param sellerAccountId External account ID (interpretation varies by rail)
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
      `[AurumShield] Settlement payout routed via ${result.railUsed} for ${settlementId}:`,
      `externalIds=${JSON.stringify(result.externalIds)}`,
      `sellerPayout=$${(result.sellerPayoutCents / 100).toFixed(2)}`,
      `platformFee=$${(result.platformFeeCents / 100).toFixed(2)}`,
      result.isFallback ? "(FALLBACK from Moov)" : "",
    );
  } else {
    console.error(
      `[AurumShield] Settlement payout FAILED via ${result.railUsed} for ${settlementId}:`,
      result.error,
    );
  }

  return result;
}
