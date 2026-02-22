/* ================================================================
   DELIVERY STORE — localStorage-backed persistence
   Reads/writes delivery preferences and shipments.
   SSR-safe: returns empty defaults when window is unavailable.
   ================================================================ */

import type {
  DeliveryPreference,
  DeliveryMethod,
  DeliveryAddress,
  DeliveryRateQuote,
  Shipment,
} from "./delivery-types";
import { advanceShipment as advanceShipmentStatus } from "./brinks-service";

const PREFS_KEY = "aurumshield:delivery-prefs";
const SHIPMENTS_KEY = "aurumshield:shipments";

/* ---------- Helpers ---------- */

function isSSR(): boolean {
  return typeof window === "undefined";
}

function loadJSON<T>(key: string, fallback: T): T {
  if (isSSR()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // corrupt data — fall through
  }
  return fallback;
}

function saveJSON<T>(key: string, data: T): void {
  if (isSSR()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

/* ================================================================
   Delivery Preferences
   ================================================================ */

export function getAllPreferences(): DeliveryPreference[] {
  return loadJSON<DeliveryPreference[]>(PREFS_KEY, []);
}

export function getDeliveryPreference(
  settlementId: string,
): DeliveryPreference | undefined {
  return getAllPreferences().find((p) => p.settlementId === settlementId);
}

export function saveDeliveryPreference(
  settlementId: string,
  method: DeliveryMethod,
  address?: DeliveryAddress,
  rateQuote?: DeliveryRateQuote,
): DeliveryPreference {
  const prefs = getAllPreferences();
  const existing = prefs.findIndex((p) => p.settlementId === settlementId);

  const pref: DeliveryPreference = {
    settlementId,
    method,
    address,
    rateQuote,
    savedAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    prefs[existing] = pref;
  } else {
    prefs.push(pref);
  }

  saveJSON(PREFS_KEY, prefs);
  return pref;
}

/* ================================================================
   Shipments
   ================================================================ */

export function getAllShipments(): Shipment[] {
  return loadJSON<Shipment[]>(SHIPMENTS_KEY, []);
}

export function getShipment(shipmentId: string): Shipment | undefined {
  return getAllShipments().find((s) => s.id === shipmentId);
}

export function getShipmentBySettlement(
  settlementId: string,
): Shipment | undefined {
  return getAllShipments().find((s) => s.settlementId === settlementId);
}

export function saveShipment(shipment: Shipment): Shipment {
  const all = getAllShipments();
  const idx = all.findIndex((s) => s.id === shipment.id);
  if (idx >= 0) {
    all[idx] = shipment;
  } else {
    all.push(shipment);
  }
  saveJSON(SHIPMENTS_KEY, all);
  return shipment;
}

export function advanceShipment(shipmentId: string): Shipment | undefined {
  const shipment = getShipment(shipmentId);
  if (!shipment) return undefined;
  const advanced = advanceShipmentStatus(shipment);
  return saveShipment(advanced);
}
