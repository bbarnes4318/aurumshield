/* ================================================================
   ANALYTICS — Server-Side Telemetry Module (PostHog Node)
   ================================================================
   Server-side event tracker backed by PostHog Node SDK.
   Fires backend events for settlement, compliance, and capital
   operations. All tracking is fire-and-forget — failures never
   block business logic.

   IMPORTANT: No client-side analytics scripts are included.
   This module runs ENTIRELY on the server.

   Datadog handles APM/infra/log monitoring via the ECS sidecar.
   PostHog handles product analytics and business events.

   Usage:
     import { trackServerEvent } from "@/lib/analytics";
     trackServerEvent("Trade Executed", { notionalValue, entityType });
   ================================================================ */

import "server-only";

/* ---------- Types ---------- */

interface PostHogClient {
  capture(params: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }): void;
  shutdown(): Promise<void>;
}

/* ---------- Singleton ---------- */

let _client: PostHogClient | null = null;
let _initAttempted = false;

/**
 * Initialize the server-side PostHog Node client (idempotent).
 * Reads `POSTHOG_SERVER_KEY` from the environment.
 */
function ensureClient(): PostHogClient | null {
  if (_initAttempted) return _client;
  _initAttempted = true;

  const apiKey = process.env.POSTHOG_SERVER_KEY;
  if (!apiKey) {
    console.debug(
      "[AurumShield Analytics] No POSTHOG_SERVER_KEY — using console.debug fallback.",
    );
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostHog } = require("posthog-node");
    _client = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 10,
      flushInterval: 5000,
    }) as PostHogClient;
    console.debug("[AurumShield Analytics] PostHog Node client initialized.");
  } catch (err) {
    console.debug("[AurumShield Analytics] PostHog Node init failed:", err);
  }

  return _client;
}

/* ---------- Public API ---------- */

/**
 * Track a server-side event with optional properties.
 *
 * - If PostHog is initialized, forwards to `posthog.capture()`.
 * - Otherwise, logs via `console.debug` for dev visibility.
 * - Never throws. Never blocks.
 */
export function trackServerEvent(
  event: string,
  properties?: Record<string, unknown>,
  distinctId: string = "system",
): void {
  try {
    const client = ensureClient();
    if (client) {
      client.capture({
        distinctId,
        event,
        properties: {
          ...properties,
          platform: "aurumshield",
          environment: process.env.NODE_ENV ?? "development",
        },
      });
    } else {
      console.debug(`[AurumShield Analytics] ${event}`, properties ?? {});
    }
  } catch {
    // Swallow — telemetry must never interfere with business logic
  }
}

/**
 * Identify a user/organization for server-side attribution.
 */
export function identifyEntity(
  entityId: string,
  traits?: Record<string, unknown>,
): void {
  try {
    const client = ensureClient();
    if (client) {
      client.capture({
        distinctId: entityId,
        event: "$identify",
        properties: {
          $set: traits,
        },
      });
    } else {
      console.debug("[AurumShield Analytics] identify", entityId, traits ?? {});
    }
  } catch {
    // Swallow
  }
}

/**
 * Graceful shutdown — flush pending events.
 * Call during server shutdown / signal handler.
 */
export async function shutdownAnalytics(): Promise<void> {
  try {
    if (_client) {
      await _client.shutdown();
      console.debug("[AurumShield Analytics] PostHog client shut down.");
    }
  } catch {
    // Swallow
  }
}

/**
 * @deprecated Use trackServerEvent() instead.
 * Backward-compatible alias for UI components still importing trackEvent.
 */
export const trackEvent = trackServerEvent;
