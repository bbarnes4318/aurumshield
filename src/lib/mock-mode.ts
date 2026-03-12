/* ================================================================
   GLOBAL MOCK MODE SWITCH
   ================================================================

   Controls whether all third-party services return mock data or
   make live API calls. This is a GLOBAL OVERRIDE — when enabled,
   every service in the stack will bypass real API calls regardless
   of whether their individual credentials are configured.

   Environment:
     FORCE_MOCK_MODE — "true" to force all services into mock mode.
                       Any other value (or unset) = live mode.

   When FORCE_MOCK_MODE is NOT set, each service independently
   decides based on whether its own credentials are present (the
   existing behavior).

   Usage in services:
     import { isMockMode } from "@/lib/mock-mode";

     if (isMockMode() || !this.isConfigured()) {
       // return mock data
     }

   This gives you a single switch to control the entire stack from
   the AWS Console (Secrets Manager) or ECS environment variables.
   ================================================================ */

/**
 * Returns `true` when the global mock mode override is active.
 *
 * When this returns `true`, ALL services must return mock data
 * regardless of whether their individual credentials are present.
 *
 * When this returns `false`, each service independently decides
 * based on its own `isConfigured()` check.
 */
export function isMockMode(): boolean {
  return process.env.FORCE_MOCK_MODE === "true";
}
