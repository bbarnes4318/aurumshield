"use server";

/* ================================================================
   FIRST TRADE ACTIONS — Server Actions for Guided First Trade
   ================================================================
   Server-backed submission for the institutional guided first trade.
   This is the SINGLE authoritative point where:
     1. The trade intent is recorded
     2. firstTradeCompleted flips to true
     3. onboarding status becomes COMPLETED
     4. The journey stage becomes FIRST_TRADE_SUCCESS

   Fail-closed: requires authenticated session and a valid,
   delivery-ready draft in existing onboarding state.
   ================================================================ */

import {
  getOnboardingState,
  upsertOnboardingState,
} from "@/lib/compliance/onboarding-state";
import {
  isDeliveryStageReady,
  type FirstTradeDraft,
} from "@/lib/schemas/first-trade-draft-schema";

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

export interface SubmitFirstTradeResult {
  success: true;
  /** Unique reference for the trade intent */
  tradeIntentRef: string;
  /** ISO timestamp of submission */
  submittedAt: string;
}

/* ----------------------------------------------------------------
   Public Action — submitFirstTrade
   ---------------------------------------------------------------- */

/**
 * Authorize and record the institutional first trade intent.
 *
 * Enforces:
 *   1. Authenticated session (via requireSession)
 *   2. Existing onboarding state with a delivery-ready draft
 *   3. Server-side draft validation (fail-closed)
 *
 * Persists:
 *   - __firstTradeIntent: reference, asset summary, timestamp
 *   - __journey: { stage: FIRST_TRADE_SUCCESS, firstTradeCompleted: true }
 *   - status: COMPLETED
 *
 * This is the ONLY codepath that sets firstTradeCompleted = true.
 */
export async function submitFirstTrade(): Promise<SubmitFirstTradeResult> {
  /* ── Session auth ── */
  const { requireSession } = await import("@/lib/authz");
  const session = await requireSession();
  const userId = session.userId;

  /* ── Read existing state — must have a valid draft ── */
  const existing = await getOnboardingState(userId);

  if (!existing) {
    throw new Error("FIRST_TRADE_SUBMIT_FAILED: No onboarding state found.");
  }

  const meta = existing.metadataJson as Record<string, unknown>;
  const draft = meta.__firstTradeDraft as FirstTradeDraft | undefined;

  if (!draft || typeof draft !== "object") {
    throw new Error(
      "FIRST_TRADE_SUBMIT_FAILED: No first-trade draft found in onboarding state.",
    );
  }

  /* ── Fail-closed: validate draft readiness on the server ── */
  if (!isDeliveryStageReady(draft)) {
    throw new Error(
      "FIRST_TRADE_SUBMIT_FAILED: Draft is not delivery-ready. " +
        "Asset, quantity, intent, delivery method, and destination must all be set.",
    );
  }

  /* ── Generate trade intent reference ── */
  const { randomUUID } = await import("crypto");
  const tradeIntentRef = `FT-${randomUUID().slice(0, 8).toUpperCase()}`;
  const submittedAt = new Date().toISOString();

  /* ── Persist: finalize the guided journey ── */
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
        submittedAt,
      },
      __journey: {
        stage: "FIRST_TRADE_SUCCESS",
        firstTradeCompleted: true,
      },
    },
  });

  /* ── Structured audit log ── */
  console.info(
    `[AurumShield AUDIT] first_trade_submitted | ` +
      `userId=${userId} ` +
      `ref=${tradeIntentRef} ` +
      `assetId=${draft.selectedAssetId} ` +
      `quantity=${draft.quantity} ` +
      `deliveryMethod=${draft.deliveryMethod} ` +
      `timestamp=${submittedAt}`,
  );

  return {
    success: true,
    tradeIntentRef,
    submittedAt,
  };
}
