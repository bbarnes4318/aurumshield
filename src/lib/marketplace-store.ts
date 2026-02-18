/* ================================================================
   MARKETPLACE STORE — localStorage-backed persistence
   Reads/writes MarketplaceState under a single key.
   SSR-safe: falls back to fixtures when window is unavailable.
   ================================================================ */

import type { MarketplaceState } from "./marketplace-engine";
import {
  mockListings,
  mockInventoryPositions,
  mockReservations,
  mockOrders,
} from "./mock-data";

const STORAGE_KEY = "aurumshield:marketplace";

/** Build a fresh state from fixture arrays (deep-cloned). */
function fixtureState(): MarketplaceState {
  return {
    listings: structuredClone(mockListings),
    inventory: structuredClone(mockInventoryPositions),
    reservations: structuredClone(mockReservations),
    orders: structuredClone(mockOrders),
    listingEvidence: [],
  };
}

/**
 * Load the current marketplace state from localStorage.
 * Returns fixture-based defaults when localStorage is empty or corrupt,
 * or when running server-side (SSR).
 *
 * Migration: if persisted state lacks `listingEvidence`, inject empty array.
 */
export function loadMarketplaceState(): MarketplaceState {
  if (typeof window === "undefined") return fixtureState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MarketplaceState;
      if (
        Array.isArray(parsed.listings) &&
        Array.isArray(parsed.inventory) &&
        Array.isArray(parsed.reservations) &&
        Array.isArray(parsed.orders)
      ) {
        // Migration: ensure listingEvidence exists
        if (!Array.isArray(parsed.listingEvidence)) {
          parsed.listingEvidence = [];
        }
        return parsed;
      }
    }
  } catch {
    // Corrupt data — fall through to fixture default
  }
  return fixtureState();
}

/** Persist marketplace state to localStorage. No-op during SSR. */
export function saveMarketplaceState(state: MarketplaceState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Reset state to fixture defaults and persist. Returns the fresh state. */
export function resetMarketplaceStateToFixtures(): MarketplaceState {
  const state = fixtureState();
  saveMarketplaceState(state);
  return state;
}
