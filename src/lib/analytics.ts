/* ================================================================
   ANALYTICS — Centralized Telemetry Module
   ================================================================
   Fire-and-forget event tracker backed by PostHog. Degrades
   gracefully: uses console.debug when PostHog is unavailable or
   during SSR. All calls are wrapped in try/catch so tracking
   failures never block user interactions.

   Usage:
     import { trackEvent } from "@/lib/analytics";
     trackEvent("PriceLocked", { listingId, lockedPrice });
   ================================================================ */

/* eslint-disable @typescript-eslint/no-explicit-any */

let posthogInstance: any = null;
let initAttempted = false;

/**
 * Initialize PostHog analytics (client-side only, idempotent).
 * Reads `NEXT_PUBLIC_POSTHOG_KEY` from the environment.
 * If the key is missing or PostHog fails to load, all subsequent
 * trackEvent calls silently fall back to console.debug.
 */
export function initAnalytics(): void {
  if (initAttempted) return;
  initAttempted = true;

  if (typeof window === "undefined") return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    console.debug(
      "[AurumShield Analytics] No NEXT_PUBLIC_POSTHOG_KEY — using console.debug fallback.",
    );
    return;
  }

  try {
    // Dynamic import — PostHog is an optional peer dependency.
    // If the package is not installed, the import fails silently.
    // @ts-expect-error — posthog-js may not be installed
    import("posthog-js" /* webpackIgnore: true */)
      .then((mod: any) => {
        const posthog = mod.default ?? mod;
        posthog.init(apiKey, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
          loaded: (ph: any) => {
            posthogInstance = ph;
            console.debug("[AurumShield Analytics] PostHog initialized.");
          },
          autocapture: false,
          capture_pageview: false,
        });
        posthogInstance = posthog;
      })
      .catch((err: unknown) => {
        console.debug("[AurumShield Analytics] PostHog load failed:", err);
      });
  } catch {
    // Dynamic import not supported or blocked — silent degradation
  }
}

/**
 * Track a named event with optional properties.
 *
 * - If PostHog is initialized, forwards to `posthog.capture()`.
 * - Otherwise, logs via `console.debug` for dev visibility.
 * - Never throws. Never blocks.
 */
export function trackEvent(
  name: string,
  props?: Record<string, unknown>,
): void {
  try {
    if (posthogInstance?.capture) {
      posthogInstance.capture(name, props);
    } else {
      console.debug(`[AurumShield Analytics] ${name}`, props ?? {});
    }
  } catch {
    // Swallow — telemetry must never interfere with UX
  }
}

/**
 * Identify the current user for attribution.
 * Call after authentication succeeds.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  try {
    if (posthogInstance?.identify) {
      posthogInstance.identify(userId, traits);
    } else {
      console.debug("[AurumShield Analytics] identify", userId, traits ?? {});
    }
  } catch {
    // Swallow
  }
}
