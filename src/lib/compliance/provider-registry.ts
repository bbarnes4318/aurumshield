/* ================================================================
   COMPLIANCE PROVIDER REGISTRY — Config-Driven Vendor Selection
   ================================================================
   Central authority for which KYC/KYB/AML vendor is active for new
   verification flows. Reads from environment with fallback chain:

     COMPLIANCE_ACTIVE_PROVIDER  (canonical)
     ACTIVE_COMPLIANCE_PROVIDER  (legacy, backward-compatible)
     Default: "kycaid"

   Adding a new vendor:
     1. Add the vendor key to ComplianceProvider type
     2. Add env-var parsing in resolveProvider()
     3. Implement the vendor adapter in lib/compliance/
     4. Wire the adapter into compliance-engine.ts routing

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import "server-only";

/* ── Supported Provider Keys ── */

export type ComplianceProvider = "kycaid" | "veriff" | "idenfy";

/**
 * Registry of all known providers and their operational status.
 * Preserved providers can be reactivated by changing the env var.
 */
export const PROVIDER_CATALOG: Record<
  ComplianceProvider,
  { label: string; status: "active" | "preserved"; docsUrl: string }
> = {
  kycaid: {
    label: "KYCaid",
    status: "active",
    docsUrl: "https://docs.kycaid.com/",
  },
  veriff: {
    label: "Veriff",
    status: "preserved",
    docsUrl: "https://developers.veriff.com/",
  },
  idenfy: {
    label: "iDenfy",
    status: "preserved",
    docsUrl: "https://documentation.idenfy.com/",
  },
} as const;

/* ── Resolution ── */

/**
 * Resolve the active compliance provider from environment.
 *
 * Precedence:
 *   1. COMPLIANCE_ACTIVE_PROVIDER (canonical)
 *   2. ACTIVE_COMPLIANCE_PROVIDER (legacy fallback)
 *   3. Default: "kycaid"
 */
export function getActiveComplianceProvider(): ComplianceProvider {
  const raw =
    process.env.COMPLIANCE_ACTIVE_PROVIDER?.toLowerCase() ??
    process.env.ACTIVE_COMPLIANCE_PROVIDER?.toLowerCase() ??
    "kycaid";

  if (raw === "kycaid" || raw === "veriff" || raw === "idenfy") {
    return raw;
  }

  console.warn(
    `[PROVIDER_REGISTRY] Unknown compliance provider "${raw}" — defaulting to "kycaid". ` +
      `Valid values: kycaid, veriff, idenfy`,
  );
  return "kycaid";
}

/**
 * Check whether a given provider is the currently active one.
 */
export function isProviderActive(provider: ComplianceProvider): boolean {
  return getActiveComplianceProvider() === provider;
}

/**
 * Get the display label for the active provider.
 */
export function getActiveProviderLabel(): string {
  return PROVIDER_CATALOG[getActiveComplianceProvider()].label;
}
