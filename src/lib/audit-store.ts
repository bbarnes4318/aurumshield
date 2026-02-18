/* ================================================================
   AUDIT STORE — localStorage-backed governance audit event store
   ================================================================ */

import type { GovernanceAuditEvent } from "./mock-data";
import { mockGovernanceAuditEvents } from "./mock-data";

const STORAGE_KEY = "aurumshield:audit";

export interface AuditState {
  events: GovernanceAuditEvent[];
}

/** SSR-safe: returns localStorage state or falls back to fixture data. */
export function loadAuditState(): AuditState {
  if (typeof window === "undefined") {
    return { events: structuredClone(mockGovernanceAuditEvents) };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuditState;
      if (Array.isArray(parsed.events) && parsed.events.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Corrupted storage — fall back to fixtures
  }
  const initial: AuditState = { events: structuredClone(mockGovernanceAuditEvents) };
  saveAuditState(initial);
  return initial;
}

/** Persist audit state to localStorage. */
export function saveAuditState(state: AuditState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

/** Generate a deterministic audit event ID. */
function nextEventId(events: GovernanceAuditEvent[]): string {
  const maxNum = events.reduce((max, e) => {
    const match = e.id.match(/^ga-(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `ga-${String(maxNum + 1).padStart(3, "0")}`;
}

/** Append a new audit event to the store and persist.
 *  If `explicitId` is provided, the event will use that ID and be deduped
 *  (idempotent — returns existing event if ID already exists).
 */
export function appendAuditEvent(
  event: Omit<GovernanceAuditEvent, "id">,
  explicitId?: string,
): GovernanceAuditEvent {
  const state = loadAuditState();

  // Dedup: if an explicit ID is provided and already exists, return the existing event
  if (explicitId) {
    const existing = state.events.find((e) => e.id === explicitId);
    if (existing) return existing;
  }

  const full: GovernanceAuditEvent = {
    ...event,
    id: explicitId ?? nextEventId(state.events),
  };
  state.events.push(full);
  saveAuditState(state);
  return full;
}
