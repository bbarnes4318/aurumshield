/* ================================================================
   FUNDING READINESS — Server-Authoritative Evaluation
   ================================================================
   Evaluates whether a user's funding configuration is genuinely
   ready for first-trade progression. This is the server-side
   counterpart to the client-side `isFundingReady()` form
   completeness check.

   Mirrors the verification stage's `deriveVerificationFromCase()`
   pattern: the UI can show form completeness instantly, but
   actual progression depends on this server evaluation.

   Checks:
     1. Funding data exists in onboarding_state.metadata_json.__funding
     2. Funding data passes Zod schema validation
     3. Compliance case exists and is APPROVED
     4. Method-specific format validation:
        - Stablecoin: wallet address format, valid network, valid asset
        - Wire: routing number format (9 digits), SWIFT/BIC format

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { getOnboardingState } from "@/lib/compliance/onboarding-state";
import {
  getComplianceCaseByUserId,
  type ComplianceCaseStatus,
} from "@/lib/compliance/models";
import {
  fundingStageSchema,
  FUNDING_METHODS,
  type FundingStageData,
  type FundingMethod,
} from "@/lib/schemas/funding-stage-schema";
import { emitAuditEvent } from "@/lib/audit-logger";

/* ================================================================
   Types
   ================================================================ */

/** Individual readiness check result. */
export interface FundingReadinessCheck {
  check: string;
  passed: boolean;
  detail: string;
}

/** Server-authoritative funding readiness result. */
export interface FundingReadinessResult {
  userId: string;
  /** True only when ALL server checks pass. */
  serverReady: boolean;
  /** True when the form fields are complete (client-level). */
  formComplete: boolean;
  /** The funding method configured, or null if no data. */
  fundingMethod: FundingMethod | null;
  /** Compliance case status, if a case exists. */
  complianceCaseStatus: ComplianceCaseStatus | null;
  /** Itemized checks. */
  checks: FundingReadinessCheck[];
  /** Human-readable blockers (empty when ready). */
  blockers: string[];
  /** ISO timestamp when server marked as ready, null if not ready. */
  serverApprovedAt: string | null;
  evaluatedAt: string;
}

/* ================================================================
   Format Validators
   ================================================================ */

/** ABA routing number: exactly 9 digits. */
const ROUTING_NUMBER_RE = /^\d{9}$/;

/** SWIFT/BIC: 8 or 11 alphanumeric characters. */
const SWIFT_BIC_RE = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i;

/**
 * Basic wallet address format check.
 * Accepts common formats:
 *   - EVM (0x + 40 hex chars)
 *   - Tron (T + 33 alphanumeric)
 *   - Solana (32-44 base58)
 * This is NOT ownership verification — just syntactic sanity.
 */
const WALLET_ADDRESS_RES: readonly RegExp[] = [
  /^0x[0-9a-fA-F]{40}$/, // EVM (Ethereum, Base)
  /^T[1-9A-HJ-NP-Za-km-z]{33}$/, // Tron TRC-20
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, // Solana (base58)
];

function isValidWalletAddress(address: string): boolean {
  return WALLET_ADDRESS_RES.some((re) => re.test(address));
}

/** Valid network values from the STABLECOIN_NETWORKS constant. */
const VALID_NETWORKS = new Set([
  "ERC-20 (Ethereum)",
  "TRC-20 (Tron)",
  "Solana",
  "Base",
]);

/** Valid asset values from the STABLECOIN_ASSETS constant. */
const VALID_ASSETS = new Set(["USDC", "USDT"]);

/* ================================================================
   evaluateFundingReadiness
   ================================================================ */

/**
 * Server-authoritative funding readiness evaluation.
 *
 * Reads persisted funding data from onboarding_state, validates
 * it against schema + format rules, and checks compliance case
 * status. Returns a fail-closed result.
 */
export async function evaluateFundingReadiness(
  userId: string,
): Promise<FundingReadinessResult> {
  const evaluatedAt = new Date().toISOString();
  const checks: FundingReadinessCheck[] = [];
  const blockers: string[] = [];

  emitAuditEvent(
    "funding.readiness.evaluation_started",
    "INFO",
    { userId },
    { userId },
  );

  /* ── Step 1: Load onboarding state ── */
  let fundingData: FundingStageData | null = null;
  let formComplete = false;

  try {
    const state = await getOnboardingState(userId);

    if (!state) {
      checks.push({
        check: "ONBOARDING_STATE_EXISTS",
        passed: false,
        detail: "No onboarding state found for user",
      });
      blockers.push("No onboarding state — funding not started");
      return buildResult(userId, false, formComplete, null, null, checks, blockers, evaluatedAt);
    }

    checks.push({
      check: "ONBOARDING_STATE_EXISTS",
      passed: true,
      detail: "Onboarding state loaded successfully",
    });

    /* ── Step 2: Extract and validate __funding ── */
    const meta = state.metadataJson as Record<string, unknown> | undefined;
    const rawFunding = meta?.__funding;

    if (!rawFunding || typeof rawFunding !== "object") {
      checks.push({
        check: "FUNDING_DATA_EXISTS",
        passed: false,
        detail: "No __funding data in onboarding state metadata",
      });
      blockers.push("Funding configuration not saved");
      return buildResult(userId, false, formComplete, null, null, checks, blockers, evaluatedAt);
    }

    checks.push({
      check: "FUNDING_DATA_EXISTS",
      passed: true,
      detail: "Funding data found in metadata",
    });

    /* ── Step 3: Zod schema validation ── */
    const parsed = fundingStageSchema.safeParse(rawFunding);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const errorSummary = Object.entries(errors)
        .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(", ")}`)
        .join("; ");

      checks.push({
        check: "SCHEMA_VALIDATION",
        passed: false,
        detail: `Funding data fails schema validation: ${errorSummary}`,
      });
      blockers.push(`Schema validation failed: ${errorSummary}`);
      return buildResult(userId, false, formComplete, null, null, checks, blockers, evaluatedAt);
    }

    fundingData = parsed.data;
    checks.push({
      check: "SCHEMA_VALIDATION",
      passed: true,
      detail: "Funding data passes Zod schema validation",
    });

    /* ── Step 4: Client-level form completeness ── */
    formComplete = checkFormCompleteness(fundingData);
    checks.push({
      check: "FORM_COMPLETENESS",
      passed: formComplete,
      detail: formComplete
        ? "All required fields for selected method are populated"
        : "Some required fields are missing or empty",
    });

    if (!formComplete) {
      blockers.push("Form fields incomplete — all required fields must be filled");
    }

    /* ── Step 5: Method-specific format validation ── */
    if (formComplete) {
      validateMethodFormats(fundingData, checks, blockers);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({
      check: "ONBOARDING_STATE_EXISTS",
      passed: false,
      detail: `Failed to load onboarding state: ${message}`,
    });
    blockers.push(`Database error: unable to load funding data`);
    return buildResult(userId, false, false, null, null, checks, blockers, evaluatedAt);
  }

  /* ── Step 6: Compliance case check ── */
  let complianceCaseStatus: ComplianceCaseStatus | null = null;

  try {
    const complianceCase = await getComplianceCaseByUserId(userId);
    complianceCaseStatus = complianceCase?.status ?? null;

    if (!complianceCase) {
      checks.push({
        check: "COMPLIANCE_CASE_EXISTS",
        passed: false,
        detail: "No compliance case found — verification not completed",
      });
      blockers.push("Compliance verification not completed — APPROVED case required");
    } else if (complianceCase.status !== "APPROVED") {
      checks.push({
        check: "COMPLIANCE_CASE_APPROVED",
        passed: false,
        detail: `Compliance case status is ${complianceCase.status} — APPROVED required for funding readiness`,
      });
      blockers.push(`Compliance case status is ${complianceCase.status} — must be APPROVED`);
    } else {
      checks.push({
        check: "COMPLIANCE_CASE_APPROVED",
        passed: true,
        detail: `Compliance case ${complianceCase.id} is APPROVED`,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({
      check: "COMPLIANCE_CASE_EXISTS",
      passed: false,
      detail: `Failed to query compliance case: ${message}`,
    });
    blockers.push("Unable to verify compliance status — database error");
  }

  /* ── Build final result ── */
  const serverReady = blockers.length === 0;

  emitAuditEvent(
    "funding.readiness.evaluation_completed",
    serverReady ? "INFO" : "WARN",
    {
      userId,
      serverReady,
      formComplete,
      fundingMethod: fundingData?.fundingMethod ?? null,
      blockerCount: blockers.length,
      blockers,
      complianceCaseStatus,
    },
    { userId },
  );

  return buildResult(
    userId,
    serverReady,
    formComplete,
    fundingData?.fundingMethod ?? null,
    complianceCaseStatus,
    checks,
    blockers,
    evaluatedAt,
  );
}

/* ================================================================
   Internal Helpers
   ================================================================ */

function buildResult(
  userId: string,
  serverReady: boolean,
  formComplete: boolean,
  fundingMethod: FundingMethod | null,
  complianceCaseStatus: ComplianceCaseStatus | null,
  checks: FundingReadinessCheck[],
  blockers: string[],
  evaluatedAt: string,
): FundingReadinessResult {
  return {
    userId,
    serverReady,
    formComplete,
    fundingMethod,
    complianceCaseStatus,
    checks,
    blockers,
    serverApprovedAt: serverReady ? evaluatedAt : null,
    evaluatedAt,
  };
}

/**
 * Client-level form completeness check (mirrors isFundingReady logic).
 * Checks that isFundingConfigured is true and required fields are non-empty.
 */
function checkFormCompleteness(data: FundingStageData): boolean {
  if (!data.isFundingConfigured) return false;

  if (data.fundingMethod === "digital_stablecoin") {
    return (
      data.walletAddress.trim().length > 0 &&
      data.walletNetwork.trim().length > 0 &&
      data.stablecoinAsset.trim().length > 0
    );
  }

  if (data.fundingMethod === "legacy_wire") {
    return (
      data.bankName.trim().length > 0 &&
      data.bankRoutingNumber.trim().length > 0 &&
      data.bankAccountNumber.trim().length > 0 &&
      data.bankSwiftCode.trim().length > 0
    );
  }

  return false;
}

/**
 * Method-specific format validation.
 * Stablecoin: wallet address pattern, valid network/asset enums.
 * Wire: ABA routing number format, SWIFT/BIC format.
 */
function validateMethodFormats(
  data: FundingStageData,
  checks: FundingReadinessCheck[],
  blockers: string[],
): void {
  if (data.fundingMethod === "digital_stablecoin") {
    // Wallet address format
    const walletValid = isValidWalletAddress(data.walletAddress.trim());
    checks.push({
      check: "WALLET_ADDRESS_FORMAT",
      passed: walletValid,
      detail: walletValid
        ? "Wallet address matches expected format"
        : `Wallet address "${data.walletAddress}" does not match any known format (EVM, Tron, Solana)`,
    });
    if (!walletValid) {
      blockers.push("Wallet address format is invalid — must be a valid EVM, Tron, or Solana address");
    }

    // Network enum
    const networkValid = VALID_NETWORKS.has(data.walletNetwork);
    checks.push({
      check: "NETWORK_VALID",
      passed: networkValid,
      detail: networkValid
        ? `Network "${data.walletNetwork}" is a supported network`
        : `Network "${data.walletNetwork}" is not a recognized network`,
    });
    if (!networkValid) {
      blockers.push(`Network "${data.walletNetwork}" is not supported`);
    }

    // Asset enum
    const assetValid = VALID_ASSETS.has(data.stablecoinAsset);
    checks.push({
      check: "ASSET_VALID",
      passed: assetValid,
      detail: assetValid
        ? `Asset "${data.stablecoinAsset}" is a supported stablecoin`
        : `Asset "${data.stablecoinAsset}" is not a recognized stablecoin`,
    });
    if (!assetValid) {
      blockers.push(`Asset "${data.stablecoinAsset}" is not supported`);
    }
  }

  if (data.fundingMethod === "legacy_wire") {
    // Routing number format
    const routingValid = ROUTING_NUMBER_RE.test(data.bankRoutingNumber.trim());
    checks.push({
      check: "ROUTING_NUMBER_FORMAT",
      passed: routingValid,
      detail: routingValid
        ? "Routing number is a valid 9-digit ABA number"
        : `Routing number "${data.bankRoutingNumber}" is not a valid 9-digit ABA format`,
    });
    if (!routingValid) {
      blockers.push("Routing number must be exactly 9 digits");
    }

    // SWIFT/BIC format
    const swiftValid = SWIFT_BIC_RE.test(data.bankSwiftCode.trim());
    checks.push({
      check: "SWIFT_BIC_FORMAT",
      passed: swiftValid,
      detail: swiftValid
        ? "SWIFT/BIC code is valid format (8 or 11 alphanumeric)"
        : `SWIFT/BIC code "${data.bankSwiftCode}" is not a valid 8 or 11 character format`,
    });
    if (!swiftValid) {
      blockers.push("SWIFT/BIC code must be 8 or 11 alphanumeric characters");
    }
  }
}

// Suppress unused import warnings — FUNDING_METHODS is used for type derivation
void FUNDING_METHODS;
