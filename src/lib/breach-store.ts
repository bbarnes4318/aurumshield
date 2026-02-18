/* ================================================================
   BREACH STORE — localStorage-backed breach event persistence
   SSR-safe: returns empty array when window is unavailable.
   ================================================================ */

import type { IntradayCapitalSnapshot } from "./capital-engine";

const STORAGE_KEY = "aurumshield:capital-breaches";

/* ---------- Types (defined here to avoid circular imports) ---------- */

export type BreachEventType =
  | "ECR_CAUTION"
  | "ECR_BREACH"
  | "HARDSTOP_CAUTION"
  | "HARDSTOP_BREACH"
  | "BUFFER_NEGATIVE";

export interface BreachEvent {
  id: string;
  occurredAt: string;
  type: BreachEventType;
  level: "INFO" | "WARN" | "CRITICAL";
  message: string;
  snapshot: IntradayCapitalSnapshot;
}

/* ---------- State ---------- */

export interface BreachState {
  events: BreachEvent[];
}

/** Load breach events from localStorage. SSR returns empty. */
export function loadBreachState(): BreachState {
  if (typeof window === "undefined") {
    return { events: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BreachState;
      if (Array.isArray(parsed.events)) {
        return parsed;
      }
    }
  } catch {
    // Corrupted storage — return empty
  }
  return { events: [] };
}

/** Persist breach state to localStorage. No-op during SSR. */
export function saveBreachState(state: BreachState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

/**
 * Append a breach event to the store. Deduplicates by ID.
 * Returns true if the event was actually appended (not a duplicate).
 */
export function appendBreachEvent(event: BreachEvent): boolean {
  const state = loadBreachState();
  // Dedupe by ID — if already exists, skip
  if (state.events.some((e) => e.id === event.id)) {
    return false;
  }
  state.events.push(event);
  saveBreachState(state);
  return true;
}
