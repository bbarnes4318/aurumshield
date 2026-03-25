/* ================================================================
   INSTITUTIONAL JOURNEY — Authoritative Stage Model
   ================================================================
   Defines the macro stages an institutional user progresses through
   during their guided first-run journey. Used by:

     • StrictComplianceGate (route decision)
     • Guided journey layouts (step indicator)
     • Resume helpers (pick up where you left off)
     • Backward compat mapper (legacy onboarding_state rows)

   Persisted in the existing onboarding_state.metadata_json JSONB
   column under the __journey namespace.

   MUST NOT be imported in server-only contexts that don't already
   have access to onboarding_state data — this is a shared schema.
   ================================================================ */

import { z } from "zod";
import type { OnboardingState } from "@/lib/compliance/onboarding-state";

/* ----------------------------------------------------------------
   Journey Stages — ordered progression
   ----------------------------------------------------------------
   Getting Started:
     WELCOME → ORGANIZATION → VERIFICATION → FUNDING

   First Trade:
     FIRST_TRADE_ASSET → FIRST_TRADE_DELIVERY →
     FIRST_TRADE_REVIEW → FIRST_TRADE_AUTHORIZE →
     FIRST_TRADE_SUCCESS
   ---------------------------------------------------------------- */

export const JOURNEY_STAGES = [
  "WELCOME",
  "ORGANIZATION",
  "VERIFICATION",
  "FUNDING",
  "FIRST_TRADE_ASSET",
  "FIRST_TRADE_DELIVERY",
  "FIRST_TRADE_REVIEW",
  "FIRST_TRADE_AUTHORIZE",
  "FIRST_TRADE_SUCCESS",
] as const;

export type InstitutionalJourneyStage = (typeof JOURNEY_STAGES)[number];

/* ----------------------------------------------------------------
   Journey Phases — derived from stage
   ---------------------------------------------------------------- */

export const JOURNEY_PHASES = [
  "GETTING_STARTED",
  "FIRST_TRADE",
] as const;

export type InstitutionalJourneyPhase = (typeof JOURNEY_PHASES)[number];

/* ----------------------------------------------------------------
   Stage → Phase mapping
   ---------------------------------------------------------------- */

const GETTING_STARTED_STAGES: ReadonlySet<InstitutionalJourneyStage> = new Set([
  "WELCOME",
  "ORGANIZATION",
  "VERIFICATION",
  "FUNDING",
]);

export function getPhaseForStage(stage: InstitutionalJourneyStage): InstitutionalJourneyPhase {
  return GETTING_STARTED_STAGES.has(stage) ? "GETTING_STARTED" : "FIRST_TRADE";
}

/* ----------------------------------------------------------------
   Stage → Route mapping
   ---------------------------------------------------------------- */

const STAGE_ROUTES: Record<InstitutionalJourneyStage, string> = {
  WELCOME:                "/institutional/get-started/welcome",
  ORGANIZATION:           "/institutional/get-started/organization",
  VERIFICATION:           "/institutional/get-started/verification",
  FUNDING:                "/institutional/get-started/funding",
  FIRST_TRADE_ASSET:      "/institutional/first-trade/asset",
  FIRST_TRADE_DELIVERY:   "/institutional/first-trade/delivery",
  FIRST_TRADE_REVIEW:     "/institutional/first-trade/review",
  FIRST_TRADE_AUTHORIZE:  "/institutional/first-trade/authorize",
  FIRST_TRADE_SUCCESS:    "/institutional/first-trade/success",
};

export function getRouteForStage(stage: InstitutionalJourneyStage): string {
  return STAGE_ROUTES[stage];
}

/* ----------------------------------------------------------------
   Stage progression
   ---------------------------------------------------------------- */

const STAGE_INDEX = new Map<InstitutionalJourneyStage, number>(
  JOURNEY_STAGES.map((s, i) => [s, i]),
);

/**
 * Returns the next stage in the guided journey, or null if the user
 * has reached the terminal guided stage (FIRST_TRADE_SUCCESS).
 */
export function getNextStage(
  stage: InstitutionalJourneyStage,
): InstitutionalJourneyStage | null {
  const idx = STAGE_INDEX.get(stage);
  if (idx === undefined || idx >= JOURNEY_STAGES.length - 1) return null;
  return JOURNEY_STAGES[idx + 1];
}

/**
 * Returns true when the user has completed the entire guided
 * journey (reached FIRST_TRADE_SUCCESS).
 */
export function isGuidedJourneyComplete(
  stage: InstitutionalJourneyStage,
): boolean {
  return stage === "FIRST_TRADE_SUCCESS";
}

/**
 * Returns the 0-based index of a stage. Useful for progress
 * indicators (e.g. "step 3 of 9").
 */
export function getStageIndex(stage: InstitutionalJourneyStage): number {
  return STAGE_INDEX.get(stage) ?? 0;
}

/* ----------------------------------------------------------------
   Zod schema for the __journey sub-object in metadata_json
   ----------------------------------------------------------------
   Stored as: metadata_json.__journey = { stage, firstTradeCompleted }
   Keep this MINIMAL — only authoritative progression fields.
   ---------------------------------------------------------------- */

export const journeyMetadataSchema = z.object({
  stage: z.enum(JOURNEY_STAGES),
  firstTradeCompleted: z.boolean(),
});

export type JourneyMetadata = z.infer<typeof journeyMetadataSchema>;

/* ----------------------------------------------------------------
   Backward-compatible stage resolution
   ----------------------------------------------------------------
   Maps legacy onboarding_state records (which have no __journey
   data) to the correct guided journey stage.

   RULES:
     1. If __journey exists and parses → trust it (authoritative)
     2. If status === COMPLETED and no __journey → user predates the
        guided flow. Return null to signal "skip guided, go to
        advanced workspace." Do NOT force them into the first-trade
        guided path — there is no repo evidence they haven't traded.
     3. If status === IN_PROGRESS → map currentStep to the best-fit
        Getting Started stage.
     4. All other statuses (PROVIDER_PENDING, MCA_PENDING, etc.) →
        user is in some compliance-review limbo. Map to VERIFICATION
        as the safest resume point.
   ---------------------------------------------------------------- */

/**
 * Resolves the guided journey stage from an onboarding state record.
 *
 * Returns `null` when the user should bypass the guided flow entirely
 * (e.g. legacy COMPLETED users who predate the journey model).
 */
export function resolveJourneyStage(
  state: OnboardingState | null,
): InstitutionalJourneyStage | null {
  // No state at all → brand-new user
  if (!state) return "WELCOME";

  // 1. Authoritative: check for persisted __journey data
  const meta = state.metadataJson as Record<string, unknown> | undefined;
  if (meta && typeof meta === "object" && meta.__journey) {
    const parsed = journeyMetadataSchema.safeParse(meta.__journey);
    if (parsed.success) {
      return parsed.data.stage;
    }
    // If __journey exists but is malformed, fall through to legacy mapping
  }

  // 2. Legacy COMPLETED → skip guided flow (advanced workspace)
  if (state.status === "COMPLETED") {
    return null;
  }

  // 3. IN_PROGRESS → map currentStep to Getting Started stage
  if (state.status === "IN_PROGRESS") {
    return mapLegacyStepToStage(state.currentStep);
  }

  // 4. Other statuses (PROVIDER_PENDING, MCA_PENDING, MCA_SIGNED, REVIEW, ABANDONED)
  //    User is in compliance-review limbo → safest resume: VERIFICATION
  return "VERIFICATION";
}

/**
 * Maps legacy wizard currentStep (1-7) to the closest Getting
 * Started stage. The old wizard steps were:
 *   1. Entity & LEI         → ORGANIZATION
 *   2. KYB Entity            → VERIFICATION
 *   3. UBO Declaration       → VERIFICATION
 *   4. AML Screening         → VERIFICATION
 *   5. Source of Funds        → FUNDING
 *   6. Maker-Checker Roles   → FUNDING
 *   7. DocuSign MCA           → FUNDING
 */
function mapLegacyStepToStage(step: number): InstitutionalJourneyStage {
  if (step < 1) return "WELCOME";
  if (step === 1) return "ORGANIZATION"; // step 1: Entity & LEI
  if (step <= 4) return "VERIFICATION";  // steps 2-4: KYB, UBO, AML
  return "FUNDING";                       // steps 5-7: SoF, Roles, MCA
}
