/* ================================================================
   BRINK'S GLOBAL SERVICES — Mock API Client
   Simulates the BGS Web Services API for rate fetching and
   shipment lifecycle management.
   
   TODO: Replace mock implementations with real BGS API calls
   when production credentials are available.
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
  return `shp-${Date.now().toString(36)}-${_counter.toString().padStart(4, "0")}`;
}

function nextEventId(index: number): string {
  return `evt-${index.toString().padStart(4, "0")}`;
}

/* ---------- Tracking Number Generator ---------- */

function generateTrackingNumber(settlementId: string): string {
  // Deterministic: derive from settlementId
  const hash = settlementId
    .split("")
    .reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);
  const num = Math.abs(hash).toString().padStart(10, "0").slice(0, 10);
  return `BGS-${num}`;
}

/* ---------- Mock Delay ---------- */

function mockDelay(ms: number = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ================================================================
   fetchDeliveryRate
   Simulates BGS rate quote API.
   Base fee scales with weight; insurance = 0.15% of notional.
   ================================================================ */

export async function fetchDeliveryRate(
  _address: DeliveryAddress,
  weightOz: number,
  notionalUsd: number,
): Promise<DeliveryRateQuote> {
  // TODO: Replace with real BGS API call
  await mockDelay(800);

  const baseFee = Math.round(150 + weightOz * 12); // $12/oz transport
  const insuranceFee = Math.round(notionalUsd * 0.0015 * 100) / 100; // 0.15%
  const handlingFee = 75; // flat handling

  return {
    baseFee,
    insuranceFee,
    handlingFee,
    totalFee: Math.round((baseFee + insuranceFee + handlingFee) * 100) / 100,
    estimatedDays: weightOz > 50 ? 5 : 3,
    carrier: "Brink's Global Services",
    validForMinutes: 30,
    quotedAt: new Date().toISOString(),
  };
}

/* ================================================================
   createShipment
   Simulates BGS shipment creation. Returns a new Shipment
   with initial "pending" status and a single creation event.
   ================================================================ */

export async function createShipment(
  settlementId: string,
  orderId: string,
  address: DeliveryAddress,
  rateQuote: DeliveryRateQuote,
): Promise<Shipment> {
  // TODO: Replace with real BGS shipment creation API
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
    description: "Settlement finalized. Shipment order created with Brink's Global Services.",
  };

  return {
    id: nextShipmentId(),
    settlementId,
    orderId,
    status: "pending",
    trackingNumber: generateTrackingNumber(settlementId),
    carrier: "Brink's Global Services",
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
   Demo helper: advances a shipment to the next status in the
   deterministic pipeline and appends a new event.
   ================================================================ */

const STATUS_EVENT_MAP: Record<ShipmentStatus, { location: string; description: string }> = {
  pending: {
    location: "AurumShield Clearing",
    description: "Settlement finalized. Shipment order created with Brink's Global Services.",
  },
  packaging: {
    location: "Brink's Secure Facility",
    description: "Gold asset received at secure packaging facility. Tamper-evident sealing in progress.",
  },
  dispatched: {
    location: "Brink's Logistics Hub",
    description: "Secure armored transport dispatched. Armed escort assigned.",
  },
  in_transit: {
    location: "En Route",
    description: "Shipment in transit via armored carrier. GPS tracking active.",
  },
  out_for_delivery: {
    location: "Local Distribution Center",
    description: "Shipment arrived at local secure branch. Out for final delivery with signature required.",
  },
  delivered: {
    location: "Destination",
    description: "Delivery confirmed. Recipient signature captured. Chain of custody complete.",
  },
};

export function computeNextStatus(current: ShipmentStatus): ShipmentStatus | null {
  const idx = SHIPMENT_STATUS_ORDER.indexOf(current);
  if (idx < 0 || idx >= SHIPMENT_STATUS_ORDER.length - 1) return null;
  return SHIPMENT_STATUS_ORDER[idx + 1];
}

export function advanceShipment(shipment: Shipment): Shipment {
  const nextStatus = computeNextStatus(shipment.status);
  if (!nextStatus) return shipment; // already delivered

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
