/* ================================================================
   WIZARD POLICY ENGINE — Re-exports from shared policy-engine.ts
   All policy logic lives in @/lib/policy-engine to serve both
   the transaction wizard and the marketplace trading venue.
   ================================================================ */
export {
  computeTRI,
  validateCapital,
  checkBlockers,
  hasBlockLevel,
  determineApproval,
  runComplianceChecks,
  type TRIComponent,
  type TRIResult,
  type CapitalValidation,
  type BlockerSeverity,
  type PolicyBlocker,
  type ApprovalTier,
  type ApprovalResult,
  type ComplianceCheck,
  type PolicySnapshot,
} from "@/lib/policy-engine";
