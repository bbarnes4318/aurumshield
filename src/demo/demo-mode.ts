/* ================================================================
   DEMO MODE — Utility functions for demo state management
   
   Manages demo mode toggle, query param sync, and persistence.
   Does NOT introduce a separate role system — uses real UserRole.
   ================================================================ */

const DEMO_ROLE_KEY = "aurumshield:demo-role";
const DEMO_SEEDED_KEY = "aurumshield:demo-seeded";
const DEMO_ANCHOR_KEY = "aurumshield:demo-anchor";
const TOUR_STATE_KEY = "aurumshield:tour-state";

/** Check if we're in a browser environment */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Get the current demo role from localStorage */
export function getDemoRole(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(DEMO_ROLE_KEY);
}

/** Set the current demo role in localStorage */
export function setDemoRole(role: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(DEMO_ROLE_KEY, role);
}

/** Clear the demo role */
export function clearDemoRole(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(DEMO_ROLE_KEY);
}

/**
 * Reset all demo state — clears:
 * - Demo seeded flag
 * - Demo role
 * - Tour state
 * - Demo anchor artifact
 * 
 * Does NOT clear actual seeded data from stores (that requires
 * a full page reload or manual store clearing).
 */
export function resetDemoState(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(DEMO_SEEDED_KEY);
  localStorage.removeItem(DEMO_ROLE_KEY);
  localStorage.removeItem(TOUR_STATE_KEY);
  localStorage.removeItem(DEMO_ANCHOR_KEY);
}

/**
 * Set the demo anchor artifact ID.
 * This is the primary idempotency marker.
 */
export function setDemoAnchor(anchorId: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(DEMO_ANCHOR_KEY, anchorId);
}

/**
 * Check if the demo anchor artifact exists.
 */
export function hasDemoAnchor(): boolean {
  if (!isBrowser()) return false;
  return !!localStorage.getItem(DEMO_ANCHOR_KEY);
}

/**
 * Get the demo anchor artifact ID.
 */
export function getDemoAnchor(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(DEMO_ANCHOR_KEY);
}
