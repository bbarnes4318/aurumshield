/* ================================================================
   SETTLEMENT STORE — localStorage-backed persistence
   Reads/writes SettlementState under a single key.
   SSR-safe: falls back to fixtures when window is unavailable.
   ================================================================ */

import type { SettlementState } from "./settlement-engine";
import { mockSettlements, mockLedger } from "./mock-data";

const STORAGE_KEY = "aurumshield:settlement";

/** Build a fresh state from fixture arrays (deep-cloned). */
function fixtureState(): SettlementState {
  return {
    settlements: structuredClone(mockSettlements),
    ledger: structuredClone(mockLedger),
    clearingJournals: [],
  };
}

/**
 * Load the current settlement state from localStorage.
 * Returns fixture-based defaults when localStorage is empty or corrupt,
 * or when running server-side (SSR).
 */
export function loadSettlementState(): SettlementState {
  if (typeof window === "undefined") return fixtureState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SettlementState;
      if (
        Array.isArray(parsed.settlements) &&
        Array.isArray(parsed.ledger)
      ) {
        return parsed;
      }
    }
  } catch {
    // Corrupt data — fall through to fixture default
  }
  return fixtureState();
}

/** Persist settlement state to localStorage. No-op during SSR. */
export function saveSettlementState(state: SettlementState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Reset state to fixture defaults and persist. Returns the fresh state. */
export function resetSettlementState(): SettlementState {
  const state = fixtureState();
  saveSettlementState(state);
  return state;
}
