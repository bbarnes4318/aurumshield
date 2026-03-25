/* ================================================================
   FIRST TRADE DRAFT — Asset Stage Schema
   ================================================================
   Minimal Zod schema for persisting the first-trade asset stage
   selection. Stored in metadata_json.__firstTradeDraft.

   Derived from the marketplace ASSET_CATALOG but stripped of all
   terminal-density data. Keeps only what the guided flow needs.
   ================================================================ */

import { z } from "zod";

/* ----------------------------------------------------------------
   Curated Asset Catalog for First Trade
   ----------------------------------------------------------------
   Same underlying data as the marketplace ASSET_CATALOG, but
   curated for the guided flow — no tier numbers, no pool
   liquidity, no execution-terminal display fields.
   ---------------------------------------------------------------- */

export interface FirstTradeAsset {
  /** Stable identifier matching marketplace ASSET_CATALOG */
  id: string;
  /** Human-friendly display name */
  name: string;
  /** Short name for compact display */
  shortName: string;
  /** One-line description */
  description: string;
  /** Weight in troy ounces */
  weightOz: number;
  /** Fineness (e.g., "≥995.0", "999.9") */
  fineness: string;
  /** Premium above spot in basis points */
  premiumBps: number;
  /** Whether this is the flagship LBMA bar */
  isApex: boolean;
  /** Path to product image */
  imageUrl: string;
}

/**
 * Curated subset of the institutional marketplace asset catalog.
 * Same IDs, weights, and premiums — no terminal UI baggage.
 */
export const FIRST_TRADE_ASSETS: FirstTradeAsset[] = [
  {
    id: "lbma-400oz",
    name: "400 oz LBMA Good Delivery Bar",
    shortName: "LBMA 400oz",
    description: "350–430 oz range, ≥995 fineness. Allocated custody.",
    weightOz: 400,
    fineness: "≥995.0",
    premiumBps: 10,
    isApex: true,
    imageUrl: "/assets/gold-400oz.png",
  },
  {
    id: "kilo-bar",
    name: "1 Kilogram Gold Bar",
    shortName: "1kg Bar",
    description: "32.15 troy oz, 999.9 fineness. Institutional standard.",
    weightOz: 32.15,
    fineness: "999.9",
    premiumBps: 35,
    isApex: false,
    imageUrl: "/assets/gold-1kg.png",
  },
  {
    id: "10oz-cast",
    name: "10 oz Cast Gold Bar",
    shortName: "10oz Cast",
    description: "999.9 fineness. Cast ingot format.",
    weightOz: 10,
    fineness: "999.9",
    premiumBps: 75,
    isApex: false,
    imageUrl: "/assets/gold-10oz.png",
  },
  {
    id: "1oz-minted",
    name: "1 oz Minted Gold Bar",
    shortName: "1oz Minted",
    description: "999.9 fineness. Serialized minted bar.",
    weightOz: 1,
    fineness: "999.9",
    premiumBps: 150,
    isApex: false,
    imageUrl: "/assets/gold-1oz.png",
  },
];

/** Map for O(1) asset lookup by ID */
export const ASSET_MAP = new Map(
  FIRST_TRADE_ASSETS.map((a) => [a.id, a]),
);

/* ----------------------------------------------------------------
   Transaction Intent — broad categorization of what the user
   wants to do with the gold. Full delivery/logistics config
   is handled in the DELIVERY stage (Phase 9).
   ---------------------------------------------------------------- */

export const TRANSACTION_INTENTS = [
  "ALLOCATION",        // Vaulted custody
  "PHYSICAL_DELIVERY", // Ship to address
] as const;

export type TransactionIntent = (typeof TRANSACTION_INTENTS)[number];

/* ----------------------------------------------------------------
   Delivery Method — mirrors `DeliveryMethod` from delivery-types.ts
   Re-declared here to keep the draft schema self-contained.
   ---------------------------------------------------------------- */

export const DELIVERY_METHODS = [
  "vault_custody",     // Allocated freeport custody
  "secure_delivery",   // Armored physical delivery
] as const;

export type FirstTradeDeliveryMethod = (typeof DELIVERY_METHODS)[number];

/* ----------------------------------------------------------------
   Vault Jurisdictions — curated from seed-logistics-hubs.ts
   Malca-Amit FTZ custody vaults only (no refineries).
   ---------------------------------------------------------------- */

export interface VaultJurisdiction {
  code: string;
  name: string;
  label: string;
  isRecommended: boolean;
}

export const VAULT_JURISDICTIONS: VaultJurisdiction[] = [
  {
    code: "ZRH",
    name: "Zurich Airport FTZ",
    label: "Zurich, Switzerland",
    isRecommended: true,
  },
  {
    code: "LHR",
    name: "Heathrow Secured",
    label: "London, United Kingdom",
    isRecommended: false,
  },
  {
    code: "SIN",
    name: "Le Freeport",
    label: "Singapore",
    isRecommended: false,
  },
  {
    code: "JFK",
    name: "JFK Secured",
    label: "New York, United States",
    isRecommended: false,
  },
  {
    code: "YYZ",
    name: "Pearson FTZ",
    label: "Toronto, Canada",
    isRecommended: false,
  },
];

export const VAULT_MAP = new Map(
  VAULT_JURISDICTIONS.map((v) => [v.code, v]),
);

/* ----------------------------------------------------------------
   Delivery Regions — broad destination for physical delivery.
   Exact address is captured later in the review/authorize flow.
   ---------------------------------------------------------------- */

export interface DeliveryRegion {
  code: string;
  label: string;
}

export const DELIVERY_REGIONS: DeliveryRegion[] = [
  { code: "US", label: "United States" },
  { code: "EU", label: "Europe" },
  { code: "APAC", label: "Asia-Pacific" },
];

/* ----------------------------------------------------------------
   Draft Schema — persisted in metadata_json.__firstTradeDraft
   ---------------------------------------------------------------- */

export const firstTradeDraftSchema = z.object({
  /** Selected asset ID from FIRST_TRADE_ASSETS, or empty */
  selectedAssetId: z.string(),
  /** Number of units (bars) to purchase */
  quantity: z.number().int().min(1),
  /** Broad transaction intent — empty until chosen */
  transactionIntent: z.union([
    z.enum(TRANSACTION_INTENTS),
    z.literal(""),
  ]),

  /* ── Delivery stage fields (Phase 9) ── */

  /** Delivery method: vault_custody or secure_delivery, empty until chosen */
  deliveryMethod: z.union([
    z.enum(DELIVERY_METHODS),
    z.literal(""),
  ]),
  /** Vault jurisdiction code (e.g. "ZRH"), empty until chosen */
  vaultJurisdiction: z.string(),
  /** Delivery region code (e.g. "US"), empty until chosen */
  deliveryRegion: z.string(),
});

export type FirstTradeDraft = z.infer<typeof firstTradeDraftSchema>;

/* ----------------------------------------------------------------
   Defaults — clean initial state
   ---------------------------------------------------------------- */

export const FIRST_TRADE_DRAFT_DEFAULTS: FirstTradeDraft = {
  selectedAssetId: "",
  quantity: 1,
  transactionIntent: "",
  deliveryMethod: "",
  vaultJurisdiction: "",
  deliveryRegion: "",
};

/* ----------------------------------------------------------------
   Readiness Guard — true when enough info to proceed to delivery
   ---------------------------------------------------------------- */

/**
 * Returns true when the asset stage has sufficient data to
 * allow progression to the delivery stage.
 *
 * Requirements:
 *   1. A valid asset is selected
 *   2. Quantity is at least 1
 *   3. A transaction intent is chosen
 */
export function isAssetStageReady(draft: FirstTradeDraft): boolean {
  if (!draft.selectedAssetId) return false;
  if (!ASSET_MAP.has(draft.selectedAssetId)) return false;
  if (draft.quantity < 1) return false;
  if (!draft.transactionIntent) return false;
  return true;
}

/* ----------------------------------------------------------------
   Delivery Readiness Guard — true when enough info to proceed
   to the review stage.
   ---------------------------------------------------------------- */

/**
 * Returns true when the delivery stage has sufficient data to
 * allow progression to review.
 *
 * Requirements:
 *   1. Asset stage must be complete
 *   2. A delivery method is chosen
 *   3. If vault_custody → a vault jurisdiction is selected
 *   4. If secure_delivery → a delivery region is selected
 */
export function isDeliveryStageReady(draft: FirstTradeDraft): boolean {
  if (!isAssetStageReady(draft)) return false;
  if (!draft.deliveryMethod) return false;

  if (draft.deliveryMethod === "vault_custody") {
    if (!draft.vaultJurisdiction) return false;
    if (!VAULT_MAP.has(draft.vaultJurisdiction)) return false;
  }

  if (draft.deliveryMethod === "secure_delivery") {
    if (!draft.deliveryRegion) return false;
  }

  return true;
}

/* ----------------------------------------------------------------
   Platform Fee — matches the marketplace 1% fee sweep
   ---------------------------------------------------------------- */

export const PLATFORM_FEE_BPS = 100;

/* ================================================================
   Indicative Price Snapshot
   ================================================================
   Captured at the moment of trade intent authorization. Explicitly
   labeled as INDICATIVE — not a locked quote. Persisted server-side
   in __firstTradeIntent.indicativeSnapshot for audit trail and
   honest display on the success page.

   True quote-lock requires a server-side pricing service with
   exchange integration, which does not yet exist.
   ================================================================ */

/** Pricing tier: INDICATIVE means no quote-lock guarantee. */
export type PricingTier = "INDICATIVE";

export interface IndicativePriceSnapshot {
  /** Always "INDICATIVE" — no quote-lock exists yet. */
  tier: PricingTier;
  /** XAU/USD spot price at capture time. */
  spotPriceUsd: number;
  /** Total weight in troy ounces. */
  totalWeightOz: number;
  /** Base spot value (weight × spot). */
  baseSpotValueUsd: number;
  /** Asset premium in USD. */
  assetPremiumUsd: number;
  /** Asset premium in basis points (for transparency). */
  assetPremiumBps: number;
  /** Platform fee in USD. */
  platformFeeUsd: number;
  /** Platform fee in basis points. */
  platformFeeBps: number;
  /** Estimated total (spot + premium + fee). */
  estimatedTotalUsd: number;
  /** ISO timestamp when this snapshot was captured client-side. */
  capturedAt: string;
}

/** Zod schema for server-side validation of the price snapshot. */
export const indicativePriceSnapshotSchema = z.object({
  tier: z.literal("INDICATIVE"),
  spotPriceUsd: z.number().positive(),
  totalWeightOz: z.number().positive(),
  baseSpotValueUsd: z.number().positive(),
  assetPremiumUsd: z.number().min(0),
  assetPremiumBps: z.number().int().min(0),
  platformFeeUsd: z.number().min(0),
  platformFeeBps: z.number().int().min(0),
  estimatedTotalUsd: z.number().positive(),
  capturedAt: z.string().datetime(),
});

/**
 * Maximum age (in ms) for an indicative price snapshot to be accepted.
 * Snapshots older than this are rejected to prevent stale pricing.
 */
export const SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Validates that an indicative price snapshot is not stale.
 * Returns true if the snapshot was captured within SNAPSHOT_MAX_AGE_MS.
 */
export function isSnapshotFresh(snapshot: IndicativePriceSnapshot): boolean {
  const capturedMs = new Date(snapshot.capturedAt).getTime();
  const nowMs = Date.now();
  return nowMs - capturedMs <= SNAPSHOT_MAX_AGE_MS;
}
