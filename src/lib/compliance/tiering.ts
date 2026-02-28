/* ================================================================
   COMPLIANCE TIERING — Risk-Based Verification Requirements
   ================================================================
   Maps organizational profile (type, jurisdiction, transaction size)
   to a compliance tier that determines:
     1. Which verification steps are required
     2. What capabilities the user unlocks

   Tier ladder (cumulative):
     BROWSE  → browse marketplace (email + passkey only)
     QUOTE   → request price quotes (+ government ID)
     LOCK    → lock price for 60 seconds (+ full KYC)
     EXECUTE → execute purchase + settle + deliver (+ KYB for companies)

   Progressive Profiling:
     BROWSE access is granted upon Passkey/Email registration.
     Identity verification is deferred until QUOTE or LOCK_PRICE
     operations are attempted.

   Server-side only — do not import in client components.
   ================================================================ */

import type { ComplianceTier, ComplianceCaseStatus } from "./models";
import type { ComplianceCapability } from "../authz";

/* ── High-Risk Jurisdictions ── */

/**
 * Jurisdictions that require enhanced due diligence (EDD).
 * These automatically escalate the required tier steps.
 */
const HIGH_RISK_JURISDICTIONS = new Set([
  "RU", "IR", "KP", "SY", "CU", "VE", "MM", "BY",
  "ZW", "SD", "CF", "CD", "LY", "SO", "YE", "SS",
]);

/* ── Step Definitions Per Tier ── */

export interface TierDefinition {
  tier: ComplianceTier;
  label: string;
  requiredSteps: string[];
}

/**
 * Each tier specifies the CUMULATIVE set of verification steps
 * that must be completed. Higher tiers include all lower tier steps.
 */
export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    tier: "BROWSE",
    label: "Browse Marketplace",
    // Progressive Profiling: only email verification + WebAuthn passkey
    // required for initial access. KYC deferred to QUOTE/LOCK operations.
    requiredSteps: ["email_verified", "webauthn_enrolled"],
  },
  {
    tier: "QUOTE",
    label: "Request Quotes",
    // Triggers identity verification prompt on first QUOTE attempt
    requiredSteps: ["email_verified", "webauthn_enrolled", "id_document"],
  },
  {
    tier: "LOCK",
    label: "Lock Prices",
    requiredSteps: [
      "email_verified",
      "webauthn_enrolled",
      "id_document",
      "selfie_liveness",
      "sanctions_pep",
    ],
  },
  {
    tier: "EXECUTE",
    label: "Execute Trades",
    requiredSteps: [
      "email_verified",
      "webauthn_enrolled",
      "id_document",
      "selfie_liveness",
      "sanctions_pep",
      "business_registration",
      "ubo_capture",
      "proof_of_address",
      "source_of_funds",
    ],
  },
];

/* ── Tier Ladder (ordered) ── */

const TIER_ORDER: ComplianceTier[] = ["BROWSE", "QUOTE", "LOCK", "EXECUTE"];

/**
 * Tier → ComplianceCapability mapping.
 * Maps each compliance tier to the maximum server-side capability
 * it grants (as defined in authz.ts CAPABILITY_LADDER).
 */
export const TIER_TO_CAPABILITY_MAP: Record<ComplianceTier, ComplianceCapability> = {
  BROWSE: "BROWSE",
  QUOTE: "QUOTE",
  LOCK: "LOCK_PRICE",
  EXECUTE: "SETTLE",
};

/* ── Pure Functions ── */

/**
 * Compare two tiers. Returns true if `a` >= `b` on the ladder.
 */
export function tierAtLeast(a: ComplianceTier, b: ComplianceTier): boolean {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b);
}

/**
 * Compute the target tier for a user's organizational profile.
 *
 * Rules:
 *   - Company/institution → always EXECUTE (full verification)
 *   - Individual + high-risk jurisdiction → EXECUTE
 *   - Individual + amount > $10,000 → LOCK (Bank Secrecy Act threshold)
 *   - Individual + amount > $2,500 → QUOTE
 *   - Default → BROWSE
 */
export function computeTierForProfile(
  orgType: string | null,
  jurisdiction: string | null,
  transactionAmountUsd?: number,
): ComplianceTier {
  // All companies require full verification
  if (orgType === "company") return "EXECUTE";

  // High-risk jurisdiction → full verification
  if (jurisdiction && HIGH_RISK_JURISDICTIONS.has(jurisdiction.toUpperCase())) {
    return "EXECUTE";
  }

  // Amount-based tiering for individuals
  if (transactionAmountUsd !== undefined) {
    if (transactionAmountUsd > 10_000) return "LOCK";
    if (transactionAmountUsd > 2_500) return "QUOTE";
  }

  return "BROWSE";
}

/**
 * Get the required verification steps for a given tier.
 */
export function getRequiredSteps(tier: ComplianceTier): string[] {
  const def = TIER_DEFINITIONS.find((d) => d.tier === tier);
  return def?.requiredSteps ?? TIER_DEFINITIONS[0].requiredSteps;
}

/**
 * Evaluate the maximum tier a user has earned based on their
 * case status and the set of completed verification steps.
 *
 * Progressive Profiling rules:
 *   - APPROVED cases: full tier evaluation based on completed steps
 *   - UNDER_REVIEW with parallel_engagement_enabled: grants BROWSE
 *     (allows mock checkout + live indicative pricing)
 *   - All other non-approved statuses: restricted to BROWSE
 */
export function evaluateTierFromCase(
  caseStatus: ComplianceCaseStatus,
  completedStepIds: string[],
  parallelEngagementEnabled?: boolean,
): ComplianceTier {
  // UNDER_REVIEW with parallel engagement → BROWSE (mock checkout access)
  if (caseStatus === "UNDER_REVIEW" && parallelEngagementEnabled) {
    return "BROWSE";
  }

  // Non-approved cases are restricted to BROWSE
  if (caseStatus !== "APPROVED") return "BROWSE";

  const completedSet = new Set(completedStepIds);

  // Walk the tier definitions from highest to lowest and return
  // the first tier whose requirements are fully satisfied.
  for (let i = TIER_DEFINITIONS.length - 1; i >= 0; i--) {
    const def = TIER_DEFINITIONS[i];
    const allMet = def.requiredSteps.every((step) => completedSet.has(step));
    if (allMet) return def.tier;
  }

  return "BROWSE";
}
