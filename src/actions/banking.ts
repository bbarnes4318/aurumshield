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

/* ================================================================
   COLUMN BANK — Dynamic Virtual Account Generation
   ================================================================
   Called from the Settlement Wizard (Step 4 — Review) when the buyer
   selects the Fedwire funding route. Returns a unique FBO virtual
   account that the buyer wires settlement funds into.

   Falls back to mock data when COLUMN_API_KEY is not configured,
   allowing development / demo mode to function without live keys.
   ================================================================ */

import { ColumnBankService } from "@/lib/banking/column-adapter";

/** Structured result for the deposit instructions panel. */
export interface FiatDepositInstructions {
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  virtualAccountId: string;
  currency: "USD";
  /** True if data came from the live Column API, false if mock */
  isLive: boolean;
}

/**
 * Generate dynamic Fedwire deposit instructions for a settlement.
 *
 * Instantiates the ColumnBankService, calls createVirtualAccount(),
 * and returns the generated routing/account pair. If Column is not
 * configured, returns deterministic mock data so the UI always renders.
 *
 * @param counterpartyId — Column counterparty ID for the buyer entity
 * @param settlementDescription — Human-readable description embedded in the virtual account
 */
export async function generateFiatDepositInstructions(
  counterpartyId: string,
  settlementDescription?: string,
): Promise<FiatDepositInstructions> {
  const column = new ColumnBankService();

  /* ── Live mode: Column API is configured ── */
  if (column.isConfigured()) {
    try {
      const virtualAccount = await column.createVirtualAccount(
        counterpartyId,
        settlementDescription,
      );

      console.log(
        `[AurumShield] Generated live deposit instructions: ` +
          `virtualAccountId=${virtualAccount.id} ` +
          `routing=${virtualAccount.routingNumber} ` +
          `account=${virtualAccount.accountNumber}`,
      );

      return {
        bankName: "Column N.A.",
        routingNumber: virtualAccount.routingNumber,
        accountNumber: virtualAccount.accountNumber,
        virtualAccountId: virtualAccount.id,
        currency: "USD",
        isLive: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[AurumShield] Column virtual account creation failed — falling back to mock:`,
        message,
      );
      // Fall through to mock data below
    }
  }

  /* ── Demo / development mode: return deterministic mock data ── */
  console.log(
    `[AurumShield] Column not configured — returning mock deposit instructions for counterparty=${counterpartyId}`,
  );

  return {
    bankName: "Column N.A.",
    routingNumber: "021000089",
    accountNumber: "7441920038561",
    virtualAccountId: `mock-va-${counterpartyId.slice(0, 8)}`,
    currency: "USD",
    isLive: false,
  };
}
