/* ================================================================
   AUTH MODE — Centralized auth mode resolver
   ================================================================
   Single source of truth for determining the current authentication
   operating mode. All auth-related modules should import from here
   instead of independently checking CLERK_ENABLED or env vars.

   ⚠️  TRUST BOUNDARY:
   - "production" mode → Clerk is authoritative. All protected
     actions are server-verified via Clerk's auth() + currentUser().
   - "demo" mode → localStorage-backed mock auth is active.
     Identity is NOT authoritative for protected settlement,
     compliance, or financial execution flows.
   - "local-dev" mode → Clerk is not configured and demo mode is
     not explicitly enabled. Mock fallback is active for convenience.
     Identity is NOT authoritative.

   Usage:
     import { getAuthMode, isProductionAuth } from "@/lib/auth-mode";

     if (isProductionAuth()) {
       // Clerk-verified identity — safe for protected actions
     }
   ================================================================ */

export type AuthMode = "production" | "demo" | "local-dev";

/** Human-readable labels for log output */
export const AUTH_MODE_LABELS: Record<AuthMode, string> = {
  production: "PRODUCTION (Clerk-authoritative)",
  demo: "DEMO (localStorage mock — NOT authoritative)",
  "local-dev": "LOCAL DEV (Clerk not configured — mock fallback)",
};

/**
 * Check if Clerk is configured with real (non-placeholder) keys.
 * Shared logic — replaces the ad hoc checks scattered across
 * middleware.ts, auth-provider.tsx, and authz.ts.
 */
export function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return !!key && key !== "YOUR_PUBLISHABLE_KEY" && key.startsWith("pk_");
}

/**
 * Resolve the current auth operating mode.
 *
 * Priority:
 *   1. If Clerk is configured with real keys → "production"
 *   2. If NEXT_PUBLIC_DEMO_MODE=true → "demo"
 *   3. Otherwise → "local-dev" (Clerk not configured, no demo flag)
 */
export function getAuthMode(): AuthMode {
  if (isClerkConfigured()) return "production";
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return "demo";
  return "local-dev";
}

/**
 * True only when Clerk is configured with real keys.
 * Server actions SHOULD use this to decide whether to trust
 * the session identity for protected operations.
 */
export function isProductionAuth(): boolean {
  return getAuthMode() === "production";
}

/**
 * True when explicitly in demo mode (env flag set).
 * UI components can use this to show demo-specific overlays,
 * guided tours, and presentation features.
 */
export function isDemoMode(): boolean {
  return getAuthMode() === "demo";
}

/**
 * True when Clerk is not configured AND demo mode is not
 * explicitly enabled. This is the local development fallback.
 */
export function isLocalDevFallback(): boolean {
  return getAuthMode() === "local-dev";
}
