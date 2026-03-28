/* ================================================================
   DEMO MODE — Utility functions for demo state management
   
   Manages demo mode toggle, query param sync, persistence,
   and full state reset for the institutional concierge demo.
   ================================================================ */

const DEMO_ROLE_KEY = "aurumshield:demo-role";
const DEMO_SEEDED_KEY = "aurumshield:demo-seeded";
const DEMO_ANCHOR_KEY = "aurumshield:demo-anchor";
const TOUR_STATE_KEY = "aurumshield:tour-state";

/**
 * All localStorage keys the demo system writes.
 * Used by hardResetDemo() to ensure a clean slate.
 */
const ALL_DEMO_KEYS = [
  DEMO_ROLE_KEY,
  DEMO_SEEDED_KEY,
  DEMO_ANCHOR_KEY,
  TOUR_STATE_KEY,
  // Concierge voice state markers
  "aurumshield:concierge-session",
  "aurumshield:concierge-fallback",
] as const;

/**
 * SessionStorage keys written by the tour engine.
 */
const SESSION_STORAGE_KEYS = [
  "aurumshield:tour-state",
  "aurumshield:tour-step",
] as const;

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

/* ================================================================
   HARD RESET — Full demo state purge for clean restart
   
   Called when the user navigates back to the welcome page or
   explicitly restarts the demo. Guarantees a clean slate:
   
   1. localStorage — all demo keys
   2. sessionStorage — tour engine persistence
   3. TanStack Query cache — stale mock data (onboarding, compliance)
   4. Concierge voice state — internal markers
   
   After calling this, a full page reload ensures React components
   re-mount with fresh default state.
   ================================================================ */

/**
 * Purge ALL demo-related state for a fully clean restart.
 * 
 * @param opts.reload — If true, force a hard page reload after reset.
 *                      Defaults to true for maximum reliability.
 * @param opts.redirectTo — URL to navigate to after reset.
 *                          Defaults to the institutional welcome page.
 */
export function hardResetDemo(opts?: {
  reload?: boolean;
  redirectTo?: string;
}): void {
  if (!isBrowser()) return;

  const { reload = true, redirectTo = "/institutional/get-started/welcome" } = opts ?? {};

  console.info("[Demo] Hard reset initiated — purging all demo state");

  // 1. Clear ALL localStorage demo keys
  for (const key of ALL_DEMO_KEYS) {
    localStorage.removeItem(key);
  }

  // Also sweep any dynamically-created keys with the demo prefix
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("aurumshield:demo") || key.startsWith("aurumshield:tour"))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // 2. Clear sessionStorage tour state
  for (const key of SESSION_STORAGE_KEYS) {
    sessionStorage.removeItem(key);
  }

  // 3. Invalidate TanStack Query caches for mock data
  //    This clears stale KYB results, onboarding state, compliance cases,
  //    and funding readiness from the cache so they re-fetch fresh on mount.
  try {
    // TanStack Query stores cache in memory, not in storage.
    // We signal cache invalidation by dispatching a custom event
    // that the QueryClientProvider listens for.
    window.dispatchEvent(new CustomEvent("aurumshield:demo-reset"));
  } catch {
    // Non-critical — the page reload will clear in-memory caches anyway
  }

  // 4. Log completion
  console.info("[Demo] State purged — all demo data cleared");

  // 5. Navigate + reload
  if (reload) {
    // Hard reload ensures all React state, in-memory caches,
    // and singleton modules are fully re-initialized
    window.location.href = redirectTo;
  }
}

/**
 * Check if we're currently in demo mode.
 * True if the URL has `?demo=true` OR a demo role is set.
 */
export function isDemoMode(): boolean {
  if (!isBrowser()) return false;
  const urlHasDemo = new URLSearchParams(window.location.search).get("demo") === "true";
  return urlHasDemo || !!getDemoRole();
}

/**
 * Get the concierge fallback state.
 * Returns true if the voice agent has entered manual fallback mode.
 */
export function isConciergeFallback(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem("aurumshield:concierge-fallback") === "true";
}

/**
 * Set the concierge fallback flag (persisted across renders).
 */
export function setConciergeFallback(fallback: boolean): void {
  if (!isBrowser()) return;
  if (fallback) {
    localStorage.setItem("aurumshield:concierge-fallback", "true");
  } else {
    localStorage.removeItem("aurumshield:concierge-fallback");
  }
}
