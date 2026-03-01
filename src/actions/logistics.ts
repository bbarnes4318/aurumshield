"use server";

/* ================================================================
   LOGISTICS ROUTING — Server Action (Sovereign Carriers Only)
   ================================================================
   Routes post-settlement shipment creation through sovereign
   logistics carriers based on notional value:

     - notionalCents ≤ $500,000 → Brink's Global Services
     - notionalCents > $500,000  → Malca-Amit Global Ltd

   USPS/EasyPost have been removed. All shipments route through
   sovereign-grade armored carriers only.

   Broker-Dealer entities require commercial sub-custodian destination
   validation — residential addresses are rejected.

   This file runs ENTIRELY on the server — no API keys are ever
   exposed to the client.
   ================================================================ */

import {
  fetchDeliveryRate as brinksQuote,
  createShipment as brinksCreate,
} from "@/lib/delivery/brinks-service";
import {
  fetchDeliveryRate as malcaAmitQuote,
  createShipment as malcaAmitCreate,
} from "@/lib/delivery/malca-amit-service";
import type { DeliveryAddress, DeliveryRateQuote } from "@/lib/delivery/delivery-types";

/* ---------- Types ---------- */

export type SovereignCarrier = "brinks" | "malca_amit";

export interface LogisticsRoutingResult {
  /** Which carrier was selected */
  carrier: SovereignCarrier;
  /** Whether the shipment was successfully created */
  success: boolean;
  /** Tracking number (if available) */
  trackingNumber: string | null;
  /** External shipment/rate ID */
  externalId: string | null;
  /** Estimated delivery days */
  estimatedDays: number | null;
  /** Total shipping fee in USD */
  totalFeeUsd: number | null;
  /** Error message if shipment creation failed */
  error?: string;
}

/* ---------- Carrier Selection ---------- */

const MALCA_AMIT_THRESHOLD_CENTS = 50_000_000; // $500,000

function selectCarrier(notionalCents: number): SovereignCarrier {
  return notionalCents > MALCA_AMIT_THRESHOLD_CENTS ? "malca_amit" : "brinks";
}

/* ---------- Broker-Dealer Address Validation ---------- */

/**
 * Validate that a Broker-Dealer's shipping destination is a
 * commercial sub-custodian, not a residential address.
 *
 * Enforced rule: if entity_type === 'BROKER_DEALER', the
 * destination must be flagged as a commercial/institutional facility.
 */
function validateBrokerDealerDestination(
  address: DeliveryAddress,
  entityType?: string,
): void {
  if (entityType !== "BROKER_DEALER") return;

  // Broker-Dealers MUST ship to commercial sub-custodian facilities
  // Flag: residential addresses are rejected
  const isResidential = !address.company || address.company.trim() === "";

  if (isResidential) {
    throw new Error(
      `BROKER_DEALER_ADDRESS_VIOLATION: Broker-Dealer entities must ship to a ` +
      `commercial sub-custodian facility, not a residential address. ` +
      `Destination must include a company/facility name. ` +
      `Address: ${address.streetAddress}, ${address.city}, ${address.stateProvince}`,
    );
  }
}

/* ---------- Public Action ---------- */

/**
 * Route a shipment to the appropriate sovereign logistics carrier.
 *
 * @param settlementId    AurumShield settlement ID
 * @param orderId         Associated order ID
 * @param notionalCents   Total notional USD value in cents
 * @param weightOz        Weight of gold in troy ounces
 * @param address         Delivery address
 * @param entityType      Entity type for address validation
 */
export async function routeAndCreateShipment(
  settlementId: string,
  orderId: string,
  notionalCents: number,
  weightOz: number,
  address: DeliveryAddress,
  entityType?: string,
): Promise<LogisticsRoutingResult> {
  // Enforce Broker-Dealer address rules
  validateBrokerDealerDestination(address, entityType);

  const carrier = selectCarrier(notionalCents);

  console.log(
    `[AurumShield] Sovereign logistics routing for ${settlementId}: ` +
    `notional=$${(notionalCents / 100).toFixed(2)} → ${carrier}`,
  );

  if (carrier === "malca_amit") {
    return handleMalcaAmit(settlementId, orderId, notionalCents, weightOz, address);
  }

  return handleBrinks(settlementId, orderId, notionalCents, weightOz, address);
}

/* ---------- Brink's Handler ---------- */

async function handleBrinks(
  settlementId: string,
  orderId: string,
  notionalCents: number,
  weightOz: number,
  address: DeliveryAddress,
): Promise<LogisticsRoutingResult> {
  try {
    const notionalUsd = notionalCents / 100;
    const rateQuote: DeliveryRateQuote = await brinksQuote(address, weightOz, notionalUsd);
    const shipment = await brinksCreate(settlementId, orderId, address, rateQuote);

    console.log(
      `[AurumShield] Brink's shipment created for ${settlementId}:`,
      `tracking=${shipment.trackingNumber} fee=$${rateQuote.totalFee.toFixed(2)}`,
    );

    return {
      carrier: "brinks",
      success: true,
      trackingNumber: shipment.trackingNumber,
      externalId: shipment.id,
      estimatedDays: rateQuote.estimatedDays,
      totalFeeUsd: rateQuote.totalFee,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[AurumShield] Brink's logistics failed for ${settlementId}:`, message);
    return {
      carrier: "brinks",
      success: false,
      trackingNumber: null,
      externalId: null,
      estimatedDays: null,
      totalFeeUsd: null,
      error: message,
    };
  }
}

/* ---------- Malca-Amit Handler ---------- */

async function handleMalcaAmit(
  settlementId: string,
  orderId: string,
  notionalCents: number,
  weightOz: number,
  address: DeliveryAddress,
): Promise<LogisticsRoutingResult> {
  try {
    const notionalUsd = notionalCents / 100;
    const rateQuote: DeliveryRateQuote = await malcaAmitQuote(address, weightOz, notionalUsd);
    const shipment = await malcaAmitCreate(settlementId, orderId, address, rateQuote);

    console.log(
      `[AurumShield] Malca-Amit shipment created for ${settlementId}:`,
      `tracking=${shipment.trackingNumber} fee=$${rateQuote.totalFee.toFixed(2)}`,
    );

    return {
      carrier: "malca_amit",
      success: true,
      trackingNumber: shipment.trackingNumber,
      externalId: shipment.id,
      estimatedDays: rateQuote.estimatedDays,
      totalFeeUsd: rateQuote.totalFee,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[AurumShield] Malca-Amit logistics failed for ${settlementId}:`, message);
    return {
      carrier: "malca_amit",
      success: false,
      trackingNumber: null,
      externalId: null,
      estimatedDays: null,
      totalFeeUsd: null,
      error: message,
    };
  }
}
