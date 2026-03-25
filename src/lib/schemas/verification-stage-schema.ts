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
