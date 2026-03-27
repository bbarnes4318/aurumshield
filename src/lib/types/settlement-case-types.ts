/* ================================================================
   SETTLEMENT CASE TYPES — Central type definitions
   ================================================================
   Defines the data model for the institutional Settlement Case
   operational center. Used by the settlement case page, builder,
   and order detail page.
   ================================================================ */

/* ── Settlement Timeline Milestones ── */

export const SETTLEMENT_MILESTONES = [
  "TRADE_INTENT_RECORDED",
  "BINDING_QUOTE_ISSUED",
  "SETTLEMENT_INSTRUCTIONS_ISSUED",
  "FUNDS_PENDING",
  "FUNDS_RECEIVED",
  "DVP_TRIGGERED",
  "TITLE_TRANSFER_COMPLETE",
  "CUSTODY_ALLOCATION_COMPLETE",
] as const;

export type SettlementMilestone = (typeof SETTLEMENT_MILESTONES)[number];

export type MilestoneState = "completed" | "active" | "pending";

export type PriceLabel = "INDICATIVE" | "LOCKED" | "FINAL";

/* ── Artifact Types ── */

export const ARTIFACT_TYPES = [
  "quote_confirmation",
  "settlement_instructions",
  "custody_confirmation",
  "clearing_certificate",
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export interface SettlementArtifact {
  type: ArtifactType;
  label: string;
  description: string;
  available: boolean;
  /** ISO timestamp when the artifact became available */
  availableAt: string | null;
}

/* ── Milestone Detail ── */

export interface MilestoneDetail {
  milestone: SettlementMilestone;
  label: string;
  description: string;
  state: MilestoneState;
  /** ISO timestamp when this milestone was reached */
  completedAt: string | null;
  /** Who is responsible for advancing past this milestone */
  responsibleParty: "Buyer" | "Operations" | "Clearing" | "Custodian";
}

/* ── Price Snapshot (matches existing IndicativeSnapshotData) ── */

export interface SettlementPriceSnapshot {
  label: PriceLabel;
  spotPriceUsd: number;
  totalWeightOz: number;
  baseSpotValueUsd: number;
  assetPremiumUsd: number;
  assetPremiumBps: number;
  platformFeeUsd: number;
  platformFeeBps: number;
  estimatedTotalUsd: number;
  capturedAt: string;
}

/* ── Full Settlement Case Data ── */

export interface SettlementCaseData {
  /** Settlement case reference (e.g. SC-XXXXXXXX) */
  caseRef: string;
  /** Order reference from trade intent (e.g. FT-XXXXXXXX) */
  orderRef: string;
  /** ISO timestamp of trade intent submission */
  submittedAt: string;
  /** Current price label */
  priceLabel: PriceLabel;

  /* ── Asset Summary ── */
  assetName: string;
  assetId: string;
  quantity: number;
  totalWeightOz: number;

  /* ── Settlement Config ── */
  deliveryMethod: "vault_custody" | "secure_delivery";
  vaultJurisdiction: string | null;
  deliveryRegion: string | null;
  settlementRail: string;

  /* ── Timeline ── */
  milestones: MilestoneDetail[];
  currentMilestoneIndex: number;

  /* ── Artifacts ── */
  artifacts: SettlementArtifact[];

  /* ── Price Snapshot ── */
  priceSnapshot: SettlementPriceSnapshot | null;

  /* ── Escalation ── */
  escalationEmail: string;
  escalationSubject: string;
}

/* ── Milestone Metadata (static) ── */

export const MILESTONE_META: Record<
  SettlementMilestone,
  {
    label: string;
    description: string;
    responsibleParty: MilestoneDetail["responsibleParty"];
  }
> = {
  TRADE_INTENT_RECORDED: {
    label: "Trade Intent Recorded",
    description:
      "Your institutional trade authorization has been cryptographically logged with an indicative price snapshot.",
    responsibleParty: "Buyer",
  },
  BINDING_QUOTE_ISSUED: {
    label: "Binding Quote Issued",
    description:
      "A binding execution quote replaces the indicative estimate based on live market conditions.",
    responsibleParty: "Operations",
  },
  SETTLEMENT_INSTRUCTIONS_ISSUED: {
    label: "Settlement Instructions Issued",
    description:
      "Wire transfer or stablecoin funding instructions have been generated and delivered.",
    responsibleParty: "Operations",
  },
  FUNDS_PENDING: {
    label: "Funds Pending",
    description:
      "Your funding transfer has been initiated and is being processed by the settlement rail.",
    responsibleParty: "Buyer",
  },
  FUNDS_RECEIVED: {
    label: "Funds Received",
    description:
      "Funds have been confirmed and credited to the escrow account. Settlement is cleared to proceed.",
    responsibleParty: "Clearing",
  },
  DVP_TRIGGERED: {
    label: "Delivery vs. Payment Triggered",
    description:
      "Atomic DvP execution initiated — cryptographic title minting and payout routing in progress.",
    responsibleParty: "Clearing",
  },
  TITLE_TRANSFER_COMPLETE: {
    label: "Title Transfer Complete",
    description:
      "Cryptographic title has been minted and assigned. The clearing certificate is now available.",
    responsibleParty: "Clearing",
  },
  CUSTODY_ALLOCATION_COMPLETE: {
    label: "Custody Allocation Complete",
    description:
      "Gold has been allocated, serialized, and placed under bailment at the designated vault facility.",
    responsibleParty: "Custodian",
  },
};

/* ── Artifact Metadata (static) ── */

export const ARTIFACT_META: Record<
  ArtifactType,
  { label: string; description: string }
> = {
  quote_confirmation: {
    label: "Quote Confirmation",
    description:
      "Binding execution quote with locked spot price, premiums, and fee schedule.",
  },
  settlement_instructions: {
    label: "Settlement Instructions",
    description:
      "Wire transfer or stablecoin funding details for settlement.",
  },
  custody_confirmation: {
    label: "Custody Confirmation",
    description:
      "Vault facility allocation receipt with serial numbers and bailment terms.",
  },
  clearing_certificate: {
    label: "Clearing Certificate",
    description:
      "Cryptographic clearing certificate proving DvP settlement and title transfer.",
  },
};
