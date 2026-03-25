/* ================================================================
   VERIFICATION STAGE — Zod Schema
   ================================================================
   Validation schema for the guided Verification stage at:
     /institutional/get-started/verification

   Tracks four verification milestones as boolean flags.
   Each milestone corresponds to a compliance sub-process that
   runs (or simulates) during the verification stage.

   Persisted in metadata_json.__verification via the standard
   PATCH /api/compliance/state path.
   ================================================================ */

import { z } from "zod";

/* ── Verification Stage Schema ── */

export const verificationStageSchema = z.object({
  /** Corporate registry + KYB entity verification */
  entityVerificationPassed: z.boolean(),
  /** UBO declaration review */
  uboReviewPassed: z.boolean(),
  /** AML / sanctions screening (OFAC, EU, UN, HMT, DFAT) */
  screeningPassed: z.boolean(),
  /** Compliance cross-check review */
  complianceReviewPassed: z.boolean(),
});

/* ── Inferred Type ── */

export type VerificationStageData = z.infer<typeof verificationStageSchema>;

/* ── Default Values — used by useForm and state restoration ── */

export const VERIFICATION_STAGE_DEFAULTS: VerificationStageData = {
  entityVerificationPassed: false,
  uboReviewPassed: false,
  screeningPassed: false,
  complianceReviewPassed: false,
};

/**
 * Returns true when all four milestones are complete.
 * Used to gate progression to the Funding stage.
 */
export function isVerificationComplete(data: VerificationStageData): boolean {
  return (
    data.entityVerificationPassed &&
    data.uboReviewPassed &&
    data.screeningPassed &&
    data.complianceReviewPassed
  );
}

/* ── Authoritative Compliance Case Status Type ──
   Mirrors ComplianceCaseStatus from models.ts without importing
   the server-only module. Kept in sync manually. */
export type ComplianceCaseStatusLite =
  | "OPEN"
  | "PENDING_USER"
  | "PENDING_PROVIDER"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";

/**
 * Derives verification milestone booleans from the authoritative
 * compliance_cases.status value.
 *
 * Mapping rationale:
 *   OPEN / REJECTED / CLOSED   → nothing verified yet
 *   PENDING_USER               → user submitted to provider, entity check initiated
 *   PENDING_PROVIDER           → provider processing, entity submitted
 *   UNDER_REVIEW               → provider checks done, final compliance review in progress
 *   APPROVED                   → all gates passed
 *
 * Returns VERIFICATION_STAGE_DEFAULTS (all false) when caseStatus is null
 * (no compliance case exists — brand-new user). This is fail-closed.
 */
export function deriveVerificationFromCase(
  caseStatus: ComplianceCaseStatusLite | null,
): VerificationStageData {
  if (!caseStatus) return { ...VERIFICATION_STAGE_DEFAULTS };

  switch (caseStatus) {
    case "APPROVED":
      return {
        entityVerificationPassed: true,
        uboReviewPassed: true,
        screeningPassed: true,
        complianceReviewPassed: true,
      };

    case "UNDER_REVIEW":
      // Provider sub-checks complete, final manual compliance review in progress
      return {
        entityVerificationPassed: true,
        uboReviewPassed: true,
        screeningPassed: true,
        complianceReviewPassed: false,
      };

    case "PENDING_PROVIDER":
      // Entity data submitted, provider is processing KYB + AML
      return {
        entityVerificationPassed: true,
        uboReviewPassed: false,
        screeningPassed: false,
        complianceReviewPassed: false,
      };

    case "PENDING_USER":
      // Case created, user needs to complete provider flow
      return {
        entityVerificationPassed: false,
        uboReviewPassed: false,
        screeningPassed: false,
        complianceReviewPassed: false,
      };

    case "OPEN":
    case "REJECTED":
    case "CLOSED":
    default:
      // Fail-closed: nothing verified
      return { ...VERIFICATION_STAGE_DEFAULTS };
  }
}

/**
 * User-facing status label for a given compliance case status.
 * Used by the verification page to show honest state descriptions.
 */
export function getVerificationStatusLabel(
  caseStatus: ComplianceCaseStatusLite | null,
): string {
  if (!caseStatus) return "Verification not started — submit your entity details to begin";

  switch (caseStatus) {
    case "APPROVED":
      return "All checks passed — your entity is verified";
    case "UNDER_REVIEW":
      return "Provider checks complete — final compliance review in progress";
    case "PENDING_PROVIDER":
      return "Entity submitted — provider is processing verification";
    case "PENDING_USER":
      return "Action required — complete the verification flow with our provider";
    case "REJECTED":
      return "Verification was not approved — please contact support";
    case "OPEN":
      return "Verification case opened — awaiting submission";
    case "CLOSED":
      return "Verification case closed";
    default:
      return "Verification status unknown";
  }
}
