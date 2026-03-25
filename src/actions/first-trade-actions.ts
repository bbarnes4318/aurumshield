"use server";

/* ================================================================
   FIRST TRADE ACTIONS — Server Actions for Guided First Trade
   ================================================================
   Server-backed submission for the institutional guided first trade.
   This is the SINGLE authoritative point where:
     1. The trade intent is recorded with an indicative price snapshot
     2. firstTradeCompleted flips to true
     3. onboarding status becomes COMPLETED
     4. The journey stage becomes FIRST_TRADE_SUCCESS

   The indicative price snapshot is captured client-side at the
   moment of authorization and validated server-side. It is NOT
   a locked quote — true quote-lock requires a server-side pricing
   service with exchange integration (future work).

   AUTHORIZATION CHAIN (3-layer, fail-closed):
     Layer 1 -> requireProductionAuth()
               Rejects demo-mock sessions. First-trade is a
               financial commitment requiring Clerk-verified identity.
     Layer 2 -> requireReverification()
               Enforces 5-minute session freshness. Prevents
               stale-session authorization.
     Layer 3 -> requireComplianceCapability("EXECUTE_PURCHASE")
               DB-verified APPROVED compliance case required.
               DB unreachable = 500, not silent pass.

   Additional guards:
     - Idempotency: rejects if firstTradeCompleted already true
     - Confirmation phrase: server-validated typed "CONFIRM TRADE"
     - Draft readiness: isDeliveryStageReady(draft)
     - Snapshot freshness: <=5 minutes old
   ================================================================ */

import {
  getOnboardingState,
  upsertOnboardingState,
} from "@/lib/compliance/onboarding-state";
import {
  isDeliveryStageReady,
  indicativePriceSnapshotSchema,
  isSnapshotFresh,
  type FirstTradeDraft,
  type IndicativePriceSnapshot,
} from "@/lib/schemas/first-trade-draft-schema";

/* ----------------------------------------------------------------
   Constants
   ---------------------------------------------------------------- */

/**
 * The exact phrase the user must type to confirm the trade.
 * Validated server-side — client cannot bypass.
 */
export const CONFIRMATION_PHRASE = "CONFIRM TRADE" as const;

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

export interface SubmitFirstTradeResult {
  success: true;
  /** Unique reference for the trade intent */
  tradeIntentRef: string;
  /** ISO timestamp of submission */
  submittedAt: string;
  /** The validated indicative snapshot that was recorded */
  indicativeSnapshot: IndicativePriceSnapshot;
}

export interface SubmitFirstTradeInput {
  /** Indicative price snapshot captured at authorization time */
  indicativePriceSnapshot: IndicativePriceSnapshot;
  /** Typed confirmation phrase — must exactly match CONFIRMATION_PHRASE */
  confirmationPhrase: string;
}

/* ----------------------------------------------------------------
   Public Action — submitFirstTrade
   ---------------------------------------------------------------- */

/**
 * Authorize and record the institutional first trade intent.
 *
 * AUTHORIZATION CHAIN (all must pass, fail-closed):
 *   1. requireProductionAuth() — Clerk-verified identity only
 *   2. requireReverification()  — session freshness <=5 minutes
 *   3. requireComplianceCapability("EXECUTE_PURCHASE") — DB-verified
 *
 * ADDITIONAL GUARDS:
 *   4. Confirmation phrase matches CONFIRMATION_PHRASE exactly
 *   5. Idempotency: rejects if firstTradeCompleted already true
 *   6. Existing onboarding state with a delivery-ready draft
 *   7. Indicative price snapshot passes Zod validation
 *   8. Indicative price snapshot is not stale (<=5 min old)
 *
 * Persists:
 *   - __firstTradeIntent: reference, asset summary, indicative snapshot, timestamp
 *   - __journey: { stage: FIRST_TRADE_SUCCESS, firstTradeCompleted: true }
 *   - status: COMPLETED
 *
 * This is the ONLY codepath that sets firstTradeCompleted = true.
 */
export async function submitFirstTrade(
  input: SubmitFirstTradeInput,
): Promise<SubmitFirstTradeResult> {
  /* ==============================================================
     LAYER 1: Production Auth — reject demo-mock sessions
     ============================================================== */
  const { requireProductionAuth } = await import("@/lib/authz");
  const session = await requireProductionAuth();
  const userId = session.userId;

  /* ==============================================================
     LAYER 2: Step-Up Reverification — session must be fresh
     ============================================================== */
  const { requireReverification } = await import("@/lib/authz");
  await requireReverification();

  /* ==============================================================
     LAYER 3: Compliance Capability — DB-verified APPROVED case
     ============================================================== */
  const { requireComplianceCapability } = await import("@/lib/authz");
  await requireComplianceCapability("EXECUTE_PURCHASE");

  /* -- Confirmation phrase validation -- */
  if (
    !input.confirmationPhrase ||
    input.confirmationPhrase.trim() !== CONFIRMATION_PHRASE
  ) {
    const received = input.confirmationPhrase || "(empty)";
    throw new Error(
      "FIRST_TRADE_SUBMIT_FAILED: Confirmation phrase mismatch. " +
        "Expected \"" + CONFIRMATION_PHRASE + "\", received \"" + received + "\".",
    );
  }

  /* -- Read existing state — must have a valid draft -- */
  const existing = await getOnboardingState(userId);

  if (!existing) {
    throw new Error("FIRST_TRADE_SUBMIT_FAILED: No onboarding state found.");
  }

  const meta = existing.metadataJson as Record<string, unknown>;

  /* -- Idempotency guard: reject if already completed -- */
  const journey = meta.__journey as
    | { firstTradeCompleted?: boolean }
    | undefined;
  if (journey?.firstTradeCompleted === true) {
    throw new Error(
      "FIRST_TRADE_SUBMIT_FAILED: First trade has already been completed. " +
        "This action cannot be repeated.",
    );
  }

  const draft = meta.__firstTradeDraft as FirstTradeDraft | undefined;

  if (!draft || typeof draft !== "object") {
    throw new Error(
      "FIRST_TRADE_SUBMIT_FAILED: No first-trade draft found in onboarding state.",
    );
  }

  /* -- Fail-closed: validate draft readiness on the server -- */
  if (!isDeliveryStageReady(draft)) {
    throw new Error(
      "FIRST_TRADE_SUBMIT_FAILED: Draft is not delivery-ready. " +
        "Asset, quantity, intent, delivery method, and destination must all be set.",
    );
  }

  /* -- Validate indicative price snapshot -- */
  const snapshotParsed = indicativePriceSnapshotSchema.safeParse(
    input.indicativePriceSnapshot,
  );

  if (!snapshotParsed.success) {
    const errors = snapshotParsed.error.flatten().fieldErrors;
    const errorDetails = Object.entries(errors)
      .map(function (entry) {
        return entry[0] + ": " + (entry[1] ?? []).join(", ");
      })
      .join("; ");
    throw new Error(
      "FIRST_TRADE_SUBMIT_FAILED: Indicative price snapshot is invalid: " + errorDetails,
    );
  }

  const validatedSnapshot = snapshotParsed.data as IndicativePriceSnapshot;

  /* -- Staleness check: reject snapshots older than 5 minutes -- */
  if (!isSnapshotFresh(validatedSnapshot)) {
    throw new Error(
      "FIRST_TRADE_SUBMIT_FAILED: Indicative price snapshot is stale " +
        "(captured more than 5 minutes ago). Please return to the review page " +
        "to capture a fresh estimate.",
    );
  }

  /* -- Generate trade intent reference -- */
  const { randomUUID } = await import("crypto");
  const tradeIntentRef = "FT-" + randomUUID().slice(0, 8).toUpperCase();
  const submittedAt = new Date().toISOString();

  /* -- Persist: finalize the guided journey -- */
  await upsertOnboardingState(userId, {
    status: "COMPLETED",
    currentStep: 8,
    metadataJson: {
      __firstTradeIntent: {
        ref: tradeIntentRef,
        assetId: draft.selectedAssetId,
        quantity: draft.quantity,
        deliveryMethod: draft.deliveryMethod,
        vaultJurisdiction: draft.vaultJurisdiction || null,
        deliveryRegion: draft.deliveryRegion || null,
        indicativeSnapshot: validatedSnapshot,
        submittedAt,
      },
      __journey: {
        stage: "FIRST_TRADE_SUCCESS",
        firstTradeCompleted: true,
      },
    },
  });

  /* -- Structured audit log -- */
  console.info(
    "[AurumShield AUDIT] first_trade_submitted | " +
      "userId=" + userId + " " +
      "ref=" + tradeIntentRef + " " +
      "assetId=" + draft.selectedAssetId + " " +
      "quantity=" + draft.quantity + " " +
      "deliveryMethod=" + draft.deliveryMethod + " " +
      "indicativeTotal=" + validatedSnapshot.estimatedTotalUsd.toFixed(2) + " " +
      "priceTier=" + validatedSnapshot.tier + " " +
      "snapshotAge=" + (Date.now() - new Date(validatedSnapshot.capturedAt).getTime()) + "ms " +
      "authSource=" + session.authSource + " " +
      "reverificationEnforced=true " +
      "complianceCapability=EXECUTE_PURCHASE " +
      "confirmationPhrase=VERIFIED " +
      "timestamp=" + submittedAt,
  );

  return {
    success: true,
    tradeIntentRef,
    submittedAt,
    indicativeSnapshot: validatedSnapshot,
  };
}
