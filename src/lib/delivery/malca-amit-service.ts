/* ================================================================
   MALCA-AMIT — Sovereign Logistics Provider
   ================================================================
   Mock API client for Malca-Amit Global Ltd, specializing in
   precious metals and high-value goods transport. Alternative to
   Brink's for institutional sovereign logistics.

   Malca-Amit provides:
     - Dedicated vault-to-vault transfers
     - Armed escort for high-value shipments
     - Insurance coverage up to $500M per transit
     - Global network of secure facilities

   // TODO: API Integration — wire to live Malca-Amit API
   ================================================================ */

import type {
  DeliveryAddress,
  DeliveryRateQuote,
  Shipment,
  ShipmentEvent,
  ShipmentStatus,
} from "./delivery-types";
import { SHIPMENT_STATUS_ORDER } from "./delivery-types";

/* ---------- Deterministic ID Generation ---------- */

let _counter = 0;
function nextShipmentId(): string {
  _counter += 1;
  return `ma-shp-${Date.now().toString(36)}-${_counter.toString().padStart(4, "0")}`;
}

function nextEventId(index: number): string {
  return `ma-evt-${index.toString().padStart(4, "0")}`;
}

/* ---------- Tracking Number Generator ---------- */

function generateTrackingNumber(settlementId: string): string {
  const hash = settlementId
    .split("")
    .reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);
  const num = Math.abs(hash).toString().padStart(10, "0").slice(0, 10);
  return `MA-${num}`;
}

/* ---------- Mock Delay ---------- */

function mockDelay(ms: number = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ================================================================
   fetchDeliveryRate
   Simulates Malca-Amit rate quote API.
   Premium insured transport: base + insurance (0.12% of notional)
   ================================================================ */

export async function fetchDeliveryRate(
  _address: DeliveryAddress,
  weightOz: number,
  notionalUsd: number,
): Promise<DeliveryRateQuote> {
  // TODO: API Integration — replace with real Malca-Amit API call
  await mockDelay(800);

  const baseFee = Math.round(200 + weightOz * 15); // $15/oz transport (premium)
  const insuranceFee = Math.round(notionalUsd * 0.0012 * 100) / 100; // 0.12%
  const handlingFee = 100; // flat handling (security clearance)

  return {
    baseFee,
    insuranceFee,
    handlingFee,
    totalFee: Math.round((baseFee + insuranceFee + handlingFee) * 100) / 100,
    estimatedDays: weightOz > 100 ? 7 : 4,
    carrier: "Malca-Amit Global Ltd",
    validForMinutes: 30,
    quotedAt: new Date().toISOString(),
  };
}

/* ================================================================
   createShipment
   Simulates Malca-Amit shipment creation.
   ================================================================ */

export async function createShipment(
  settlementId: string,
  orderId: string,
  address: DeliveryAddress,
  rateQuote: DeliveryRateQuote,
): Promise<Shipment> {
  // TODO: API Integration — replace with real Malca-Amit shipment creation
  await mockDelay(500);

  const now = new Date().toISOString();
  const estimatedDelivery = new Date(
    Date.now() + rateQuote.estimatedDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const initialEvent: ShipmentEvent = {
    id: nextEventId(1),
    timestamp: now,
    status: "pending",
    location: "AurumShield Clearing",
    description: "Settlement finalized. Shipment order created with Malca-Amit Global Ltd.",
  };

  return {
    id: nextShipmentId(),
    settlementId,
    orderId,
    status: "pending",
    trackingNumber: generateTrackingNumber(settlementId),
    carrier: "Malca-Amit Global Ltd",
    events: [initialEvent],
    address,
    rateQuote,
    estimatedDelivery,
    deliveredAt: null,
    createdAt: now,
  };
}

/* ================================================================
   advanceShipmentStatus
   ================================================================ */

const STATUS_EVENT_MAP: Record<ShipmentStatus, { location: string; description: string }> = {
  pending: {
    location: "AurumShield Clearing",
    description: "Settlement finalized. Shipment order created with Malca-Amit Global Ltd.",
  },
  packaging: {
    location: "Malca-Amit Secure Vault",
    description: "Gold asset received at Malca-Amit vault. Secure packaging and tamper-evident sealing.",
  },
  dispatched: {
    location: "Malca-Amit Logistics Hub",
    description: "Secure transport dispatched. Dedicated armed courier assigned.",
  },
  in_transit: {
    location: "En Route",
    description: "Shipment in transit via secure courier. Real-time GPS tracking active.",
  },
  out_for_delivery: {
    location: "Local Malca-Amit Branch",
    description: "Shipment at local secure branch. Final delivery with dual-signature protocol.",
  },
  delivered: {
    location: "Destination",
    description: "Delivery confirmed. Dual signatures captured. Chain of custody complete.",
  },
};

export function computeNextStatus(current: ShipmentStatus): ShipmentStatus | null {
  const idx = SHIPMENT_STATUS_ORDER.indexOf(current);
  if (idx < 0 || idx >= SHIPMENT_STATUS_ORDER.length - 1) return null;
  return SHIPMENT_STATUS_ORDER[idx + 1];
}

export function advanceShipment(shipment: Shipment): Shipment {
  const nextStatus = computeNextStatus(shipment.status);
  if (!nextStatus) return shipment;

  const now = new Date().toISOString();
  const eventMeta = STATUS_EVENT_MAP[nextStatus];

  const newEvent: ShipmentEvent = {
    id: nextEventId(shipment.events.length + 1),
    timestamp: now,
    status: nextStatus,
    location: eventMeta.location,
    description: eventMeta.description,
  };

  return {
    ...shipment,
    status: nextStatus,
    events: [...shipment.events, newEvent],
    deliveredAt: nextStatus === "delivered" ? now : shipment.deliveredAt,
  };
}
