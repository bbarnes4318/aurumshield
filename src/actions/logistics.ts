"use server";

/* ================================================================
   LOGISTICS ROUTING — Server Action
   ================================================================
   Routes post-settlement shipment creation through the appropriate
   logistics carrier based on the $50,000 notional threshold:

     - notionalCents ≤ $50,000 → EasyPost (USPS Registered Mail)
     - notionalCents > $50,000  → Brink's Global Services

   This file runs ENTIRELY on the server — no API keys are ever
   exposed to the client.
   ================================================================ */

import { routeLogistics } from "@/lib/settlement-rail";
import {
  createShipmentQuote,
  purchaseRate,
  VAULT_ORIGIN_ADDRESS,
  type EasyPostAddress,
} from "@/lib/easypost-adapter";
import {
  fetchDeliveryRate as brinksQuote,
  createShipment as brinksCreate,
} from "@/lib/delivery/brinks-service";
import type { DeliveryAddress, DeliveryRateQuote } from "@/lib/delivery/delivery-types";

/* ---------- Types ---------- */

export interface LogisticsRoutingResult {
  /** Which carrier was selected */
  carrier: "easypost" | "brinks";
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

/* ---------- Address Conversion ---------- */

/** Convert our internal DeliveryAddress to EasyPost address format */
function toEasyPostAddress(addr: DeliveryAddress): EasyPostAddress {
  return {
    name: addr.fullName,
    street1: addr.streetAddress,
    street2: addr.streetAddress2,
    city: addr.city,
    state: addr.stateProvince,
    zip: addr.postalCode,
    country: addr.country ?? "US",
    phone: addr.phone ?? "",
    email: "",
  };
}

/* ---------- Public Action ---------- */

/**
 * Route a shipment to the appropriate logistics carrier based on
 * notional value, get a rate quote, and create the shipment.
 *
 * @param settlementId    AurumShield settlement ID
 * @param orderId         Associated order ID
 * @param notionalCents   Total notional USD value in cents
 * @param weightOz        Weight of gold in troy ounces
 * @param address         Delivery address
 */
export async function routeAndCreateShipment(
  settlementId: string,
  orderId: string,
  notionalCents: number,
  weightOz: number,
  address: DeliveryAddress,
): Promise<LogisticsRoutingResult> {
  const carrier = routeLogistics(notionalCents);

  console.log(
    `[AurumShield] Logistics routing for ${settlementId}: notional=$${(notionalCents / 100).toFixed(2)} → ${carrier}`,
  );

  if (carrier === "easypost") {
    return handleEasyPost(weightOz, address);
  }

  return handleBrinks(settlementId, orderId, notionalCents, weightOz, address);
}

/* ---------- EasyPost Handler ---------- */

async function handleEasyPost(
  weightOz: number,
  address: DeliveryAddress,
): Promise<LogisticsRoutingResult> {
  try {
    const toAddress = toEasyPostAddress(address);

    // 1. Create shipment & get USPS Registered Mail rate
    const shipment = await createShipmentQuote(
      toAddress,
      weightOz,
      VAULT_ORIGIN_ADDRESS,
    );

    const rate = shipment.registeredMailRate;
    if (!rate) {
      return {
        carrier: "easypost",
        success: false,
        trackingNumber: null,
        externalId: shipment.id,
        estimatedDays: null,
        totalFeeUsd: null,
        error: "No USPS Registered Mail rate available for this shipment",
      };
    }

    // 2. Purchase the selected rate
    const purchase = await purchaseRate(shipment.id, rate.id);

    console.log(
      `[AurumShield] EasyPost shipment purchased:`,
      `tracking=${purchase.trackingCode} fee=$${rate.rate}`,
    );

    return {
      carrier: "easypost",
      success: true,
      trackingNumber: purchase.trackingCode,
      externalId: purchase.shipmentId,
      estimatedDays: rate.estDeliveryDays,
      totalFeeUsd: parseFloat(rate.rate),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[AurumShield] EasyPost logistics failed:`, message);
    return {
      carrier: "easypost",
      success: false,
      trackingNumber: null,
      externalId: null,
      estimatedDays: null,
      totalFeeUsd: null,
      error: message,
    };
  }
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

    // 1. Get rate quote
    const rateQuote: DeliveryRateQuote = await brinksQuote(
      address,
      weightOz,
      notionalUsd,
    );

    // 2. Create shipment
    const shipment = await brinksCreate(
      settlementId,
      orderId,
      address,
      rateQuote,
    );

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
    console.error(
      `[AurumShield] Brink's logistics failed for ${settlementId}:`,
      message,
    );
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
