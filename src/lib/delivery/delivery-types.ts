/* ================================================================
   DELIVERY TYPES — Brink's Global Services Integration
   Types for delivery method selection, address capture,
   rate quoting, and shipment tracking.
   ================================================================ */

import { z } from "zod";

/* ---------- Delivery Method ---------- */

export type DeliveryMethod = "vault_custody" | "secure_delivery";

/* ---------- Address Schema ---------- */

export const deliveryAddressSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name is required")
    .max(120, "Name must be 120 characters or fewer"),
  streetAddress: z
    .string()
    .min(3, "Street address is required")
    .max(200, "Address must be 200 characters or fewer"),
  streetAddress2: z.string().max(100).optional(),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be 100 characters or fewer"),
  stateProvince: z
    .string()
    .min(1, "State / Province is required")
    .max(100),
  postalCode: z
    .string()
    .min(2, "Postal code is required")
    .max(20, "Postal code must be 20 characters or fewer"),
  country: z
    .string()
    .min(2, "Country is required")
    .max(80),
  phone: z
    .string()
    .min(7, "Phone number is required")
    .max(20, "Phone must be 20 characters or fewer"),
});

export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;

/* ---------- Rate Quote ---------- */

export interface DeliveryRateQuote {
  /** Base transport fee in USD */
  baseFee: number;
  /** Insurance premium — 0.15% of notional */
  insuranceFee: number;
  /** Handling & packaging fee */
  handlingFee: number;
  /** Total delivery cost in USD */
  totalFee: number;
  /** Estimated transit time in business days */
  estimatedDays: number;
  /** Carrier label */
  carrier: "Brink's Global Services";
  /** Quote valid for N minutes */
  validForMinutes: number;
  /** ISO timestamp when quote was generated */
  quotedAt: string;
}

/* ---------- Shipment Status ---------- */

export type ShipmentStatus =
  | "pending"
  | "packaging"
  | "dispatched"
  | "in_transit"
  | "out_for_delivery"
  | "delivered";

/** Ordered list for progress derivation */
export const SHIPMENT_STATUS_ORDER: ShipmentStatus[] = [
  "pending",
  "packaging",
  "dispatched",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "Settlement Complete",
  packaging: "Secure Packaging",
  dispatched: "Transport Dispatched",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

/* ---------- Shipment Event ---------- */

export interface ShipmentEvent {
  id: string;
  timestamp: string;
  status: ShipmentStatus;
  location: string;
  description: string;
}

/* ---------- Shipment ---------- */

export interface Shipment {
  id: string;
  settlementId: string;
  orderId: string;
  status: ShipmentStatus;
  trackingNumber: string;
  carrier: "Brink's Global Services";
  events: ShipmentEvent[];
  address: DeliveryAddress;
  rateQuote: DeliveryRateQuote;
  /** Estimated delivery date (ISO string) */
  estimatedDelivery: string;
  /** Actual delivery date (ISO string), null until delivered */
  deliveredAt: string | null;
  createdAt: string;
}

/* ---------- Delivery Preference ---------- */

export interface DeliveryPreference {
  settlementId: string;
  method: DeliveryMethod;
  address?: DeliveryAddress;
  rateQuote?: DeliveryRateQuote;
  savedAt: string;
}
