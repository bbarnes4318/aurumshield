"use server";

/* ================================================================
   ADMIN CLEARING — Straight-Through Processing (STP) + Fee Sweep
   ================================================================
   Server action for manual fund verification in the Concierge
   Settlement model. When an admin verifies receipt of inbound
   wire/crypto funds, the system:

     1. Calculates 1% platform fee sweep
     2. Advances settlement to SETTLED with fee columns persisted
     3. If physical delivery is configured (freightCostUsd > 0),
        automatically dispatches Brink's armored carrier via STP

   One button. One transaction. Zero manual logistics dispatch.

   This file runs ENTIRELY on the server — no secrets are exposed
   to the client.
   ================================================================ */

/* ---------- Brink's API Simulation ---------- */

/**
 * Simulate a Brink's Global Services API call to generate a waybill
 * and dispatch an armored carrier.
 *
 * Returns a deterministic tracking number:
 *   BRK-US-{ZipCode}-{Random4Digits}
 *
 * TODO: Replace with live Brink's API integration when contracts
 * are finalized with Brink's / Malca-Amit.
 */
function simulateBrinksAPI(destinationZip: string): {
  trackingNumber: string;
  carrier: string;
  waybillId: string;
  estimatedTransitDays: number;
} {
  const rand4 = String(Math.floor(1000 + Math.random() * 9000));
  const zip = destinationZip || "00000";
  const trackingNumber = `BRK-US-${zip}-${rand4}`;
  const waybillId = `WB-${Date.now().toString(36).toUpperCase()}-${rand4}`;

  return {
    trackingNumber,
    carrier: "Brink's Global Services",
    waybillId,
    estimatedTransitDays: 3,
  };
}

/* ---------- Fee Sweep Constants ---------- */

/** Platform fee rate: 1% of notional. */
const PLATFORM_FEE_RATE = 0.01;

/* ---------- Types ---------- */

export interface FeeSweepResult {
  /** The gross notional amount (inbound wire). */
  notionalUsd: number;
  /** Platform fee extracted (1% of notional). */
  platformFeeUsd: number;
  /** Net clearing liability after fee extraction. */
  clearingAmountUsd: number;
}

export interface DispatchResult {
  /** Carrier name (e.g., "Brink's Global Services") */
  carrier: string;
  /** Tracking number (e.g., BRK-US-10005-4821) */
  trackingNumber: string;
  /** Waybill ID for the generated shipment */
  waybillId: string;
  /** ISO 8601 timestamp of the automated dispatch */
  dispatchedAt: string;
  /** Current logistics status */
  logisticsStatus: "IN_TRANSIT";
  /** Estimated transit window in business days */
  estimatedTransitDays: number;
}

/** Structured result returned after a manual clearing operation. */
export interface ClearFundsResult {
  /** Whether the clearing operation succeeded. */
  success: boolean;
  /** The settlement that was cleared. */
  settlementId: string;
  /** The new status after clearing. */
  newStatus: "SETTLED";
  /** ISO 8601 timestamp of the clearing event. */
  clearedAt: string;
  /** Admin audit notes attached to the clearing event. */
  adminNotes: string;
  /** Error message if the operation failed. */
  error?: string;
  /** Fee sweep breakdown — always populated on success */
  feeSweep?: FeeSweepResult;
  /** STP dispatch result — populated when physical delivery is configured */
  dispatchResult?: DispatchResult;
}

/**
 * Manually clear funds for a settlement in AWAITING_FUNDS status.
 *
 * Called from the Operations Control Panel on the settlement detail
 * page. Executes the following in a single transaction:
 *
 *   1. Calculate 1% platform fee on notionalUsd
 *   2. Persist platformFeeUsd + clearingAmountUsd to settlement_cases
 *   3. Update status → SETTLED
 *   4. If physical delivery: auto-dispatch + update logistics status
 *   5. Record admin audit trail
 *
 * @param settlementId   — AurumShield settlement ID to clear
 * @param adminNotes     — Audit notes (e.g., "Wire received via Chase")
 * @param notionalUsd    — Gross notional amount for fee calculation
 * @param freightCostUsd — Total logistics fee (> 0 triggers STP dispatch)
 * @param destinationZip — Delivery zip code for Brink's routing
 */
export async function manuallyClearFunds(
  settlementId: string,
  adminNotes: string,
  notionalUsd?: number,
  freightCostUsd?: number,
  destinationZip?: string,
): Promise<ClearFundsResult> {
  /* ── Validate inputs ── */
  if (!settlementId?.trim()) {
    return {
      success: false,
      settlementId: "",
      newStatus: "SETTLED",
      clearedAt: new Date().toISOString(),
      adminNotes,
      error: "Settlement ID is required.",
    };
  }

  if (!adminNotes?.trim()) {
    return {
      success: false,
      settlementId,
      newStatus: "SETTLED",
      clearedAt: new Date().toISOString(),
      adminNotes: "",
      error: "Admin audit notes are required for compliance.",
    };
  }

  /* ── Fee Sweep Calculation ── */
  const grossNotional = notionalUsd ?? 0;
  const platformFeeUsd = Math.round(grossNotional * PLATFORM_FEE_RATE * 100) / 100;
  const clearingAmountUsd = Math.round((grossNotional - platformFeeUsd) * 100) / 100;

  const feeSweep: FeeSweepResult = {
    notionalUsd: grossNotional,
    platformFeeUsd,
    clearingAmountUsd,
  };

  /* ── Database Execution ── */
  console.log(
    `[AurumShield] Admin clearing funds for settlement=${settlementId} ` +
      `notes="${adminNotes.trim()}"`,
  );
  console.log(
    `[AurumShield] Fee Sweep: notional=$${grossNotional.toFixed(2)} ` +
      `platformFee=$${platformFeeUsd.toFixed(2)} (${PLATFORM_FEE_RATE * 100}%) ` +
      `clearingAmount=$${clearingAmountUsd.toFixed(2)}`,
  );

  /**
   * TODO: Replace simulated delay with actual SQL execution:
   *
   *   UPDATE settlement_cases
   *   SET status = 'SETTLED',
   *       platform_fee_usd = $1,
   *       clearing_amount_usd = $2,
   *       updated_at = NOW()
   *   WHERE id = $3
   *     AND status = 'AWAITING_FUNDS';
   *
   * Parameters: [platformFeeUsd, clearingAmountUsd, settlementId]
   */
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const clearedAt = new Date().toISOString();

  console.log(
    `[AurumShield] Settlement ${settlementId} cleared → SETTLED ` +
      `at ${clearedAt} by admin | platformFee=$${platformFeeUsd.toFixed(2)} ` +
      `clearingAmount=$${clearingAmountUsd.toFixed(2)}`,
  );

  /* ── STP: Automated Brink's Dispatch (same transaction) ── */
  let dispatchResult: DispatchResult | undefined;

  if (freightCostUsd && freightCostUsd > 0 && destinationZip) {
    console.log(
      `[AurumShield] STP: Physical delivery detected (freight=$${freightCostUsd.toFixed(2)}). ` +
        `Auto-dispatching Brink's to ZIP ${destinationZip}...`,
    );

    const brinksResponse = simulateBrinksAPI(destinationZip);

    dispatchResult = {
      carrier: brinksResponse.carrier,
      trackingNumber: brinksResponse.trackingNumber,
      waybillId: brinksResponse.waybillId,
      dispatchedAt: new Date().toISOString(),
      logisticsStatus: "IN_TRANSIT",
      estimatedTransitDays: brinksResponse.estimatedTransitDays,
    };

    console.log(
      `[AurumShield] STP: Brink's API pinged → tracking=${dispatchResult.trackingNumber} ` +
        `waybill=${dispatchResult.waybillId} status=IN_TRANSIT`,
    );
  }

  return {
    success: true,
    settlementId,
    newStatus: "SETTLED",
    clearedAt,
    adminNotes: adminNotes.trim(),
    feeSweep,
    dispatchResult,
  };
}
