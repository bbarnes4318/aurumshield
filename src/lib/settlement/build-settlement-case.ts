/* ================================================================
   BUILD SETTLEMENT CASE — Pure function to derive case state
   ================================================================
   Takes data from onboarding_state.metadataJson.__firstTradeIntent
   and builds a complete SettlementCaseData object with correct
   milestone states.

   This is the single source of truth for the settlement case
   shape. It does NOT query the database — that responsibility
   belongs to the API route or server action that calls this.

   The function is designed to work with:
     1. First-trade intent data (from guided onboarding)
     2. Marketplace execution data (from sessionStorage)
     3. Mock/fixture data (for demo mode)
   ================================================================ */

import {
  SETTLEMENT_MILESTONES,
  MILESTONE_META,
  ARTIFACT_META,
  ARTIFACT_TYPES,
  type SettlementCaseData,
  type MilestoneDetail,
  type SettlementArtifact,
  type SettlementPriceSnapshot,
  type PriceLabel,
} from "@/lib/types/settlement-case-types";

/* ── Input shape (matches __firstTradeIntent from first-trade-actions) ── */

export interface FirstTradeIntentData {
  ref: string;
  assetId: string;
  quantity: number;
  deliveryMethod: string;
  vaultJurisdiction: string | null;
  deliveryRegion: string | null;
  indicativeSnapshot?: {
    tier: string;
    spotPriceUsd: number;
    totalWeightOz: number;
    baseSpotValueUsd: number;
    assetPremiumUsd: number;
    assetPremiumBps: number;
    platformFeeUsd: number;
    platformFeeBps: number;
    estimatedTotalUsd: number;
    capturedAt: string;
  };
  submittedAt: string;
}

/* ── Asset name lookup (mirrors the asset catalog) ── */

const ASSET_NAMES: Record<string, { name: string; weightOz: number }> = {
  "lbma-400oz": { name: "400 oz LBMA Good Delivery Bar", weightOz: 400 },
  "kilo-bar": { name: "1 Kilogram Gold Bar", weightOz: 32.15 },
  "10oz-cast": { name: "10 oz Cast Gold Bar", weightOz: 10 },
  "1oz-minted": { name: "1 oz Minted Gold Bar", weightOz: 1 },
};

/* ── Builder ── */

/**
 * Build a SettlementCaseData from first-trade intent data.
 *
 * @param intent - The __firstTradeIntent object from metadata
 * @param completedMilestoneCount - How many milestones are completed (0-8).
 *   Default = 1 (TRADE_INTENT_RECORDED is always complete after authorization).
 *   Higher values can be passed when DB settlement case data is available.
 */
export function buildSettlementCase(
  intent: FirstTradeIntentData,
  completedMilestoneCount = 1,
): SettlementCaseData {
  /* ── Asset resolution ── */
  const assetInfo = ASSET_NAMES[intent.assetId] ?? {
    name: intent.assetId,
    weightOz: 1,
  };

  const totalWeightOz = assetInfo.weightOz * intent.quantity;

  /* ── Settlement rail inference ── */
  const settlementRail =
    intent.deliveryMethod === "vault_custody"
      ? "Fedwire RTGS"
      : "Fedwire RTGS";

  /* ── Milestones ── */
  const clampedCount = Math.max(
    0,
    Math.min(completedMilestoneCount, SETTLEMENT_MILESTONES.length),
  );

  const milestones: MilestoneDetail[] = SETTLEMENT_MILESTONES.map(
    (milestone, index) => {
      const meta = MILESTONE_META[milestone];
      let state: MilestoneDetail["state"];

      if (index < clampedCount) {
        state = "completed";
      } else if (index === clampedCount) {
        state = "active";
      } else {
        state = "pending";
      }

      return {
        milestone,
        label: meta.label,
        description: meta.description,
        state,
        completedAt:
          state === "completed"
            ? index === 0
              ? intent.submittedAt
              : null
            : null,
        responsibleParty: meta.responsibleParty,
      };
    },
  );

  /* ── Current milestone index ── */
  const currentMilestoneIndex = Math.min(
    clampedCount,
    SETTLEMENT_MILESTONES.length - 1,
  );

  /* ── Artifacts ── */
  const artifactAvailability: Record<string, number> = {
    quote_confirmation: 1,
    settlement_instructions: 2,
    custody_confirmation: 7,
    clearing_certificate: 6,
  };

  const artifacts: SettlementArtifact[] = ARTIFACT_TYPES.map((type) => {
    const meta = ARTIFACT_META[type];
    const requiredMilestones = artifactAvailability[type] ?? 99;
    const available = clampedCount > requiredMilestones;

    return {
      type,
      label: meta.label,
      description: meta.description,
      available,
      availableAt: available ? intent.submittedAt : null,
    };
  });

  /* ── Price Snapshot ── */
  let priceSnapshot: SettlementPriceSnapshot | null = null;
  let priceLabel: PriceLabel = "INDICATIVE";

  if (intent.indicativeSnapshot) {
    const snap = intent.indicativeSnapshot;
    priceSnapshot = {
      label: "INDICATIVE",
      spotPriceUsd: snap.spotPriceUsd,
      totalWeightOz: snap.totalWeightOz,
      baseSpotValueUsd: snap.baseSpotValueUsd,
      assetPremiumUsd: snap.assetPremiumUsd,
      assetPremiumBps: snap.assetPremiumBps,
      platformFeeUsd: snap.platformFeeUsd,
      platformFeeBps: snap.platformFeeBps,
      estimatedTotalUsd: snap.estimatedTotalUsd,
      capturedAt: snap.capturedAt,
    };

    // Price label escalation based on milestone progress
    if (clampedCount >= 6) {
      priceLabel = "FINAL";
      priceSnapshot.label = "FINAL";
    } else if (clampedCount >= 1) {
      priceLabel = "INDICATIVE";
      priceSnapshot.label = "INDICATIVE";
    }
  }

  /* ── Case Reference ── */
  const caseRef = `SC-${intent.ref.replace("FT-", "")}`;

  return {
    caseRef,
    orderRef: intent.ref,
    submittedAt: intent.submittedAt,
    priceLabel,

    assetName: assetInfo.name,
    assetId: intent.assetId,
    quantity: intent.quantity,
    totalWeightOz,

    deliveryMethod:
      intent.deliveryMethod === "vault_custody"
        ? "vault_custody"
        : "secure_delivery",
    vaultJurisdiction: intent.vaultJurisdiction,
    deliveryRegion: intent.deliveryRegion,
    settlementRail,

    milestones,
    currentMilestoneIndex,

    artifacts,

    priceSnapshot,

    escalationEmail: "operations@aurumshield.com",
    escalationSubject: `Settlement Case ${caseRef} — ${intent.ref}`,
  };
}
