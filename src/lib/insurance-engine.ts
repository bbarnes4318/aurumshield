/* ================================================================
   INSURANCE ENGINE — Actuarial Transit Insurance Pricing
   ================================================================
   Computes dynamic shipping insurance premiums for gold bullion
   shipments. Pricing considers:

   1. Current spot price (XAU/USD from OANDA adapter)
   2. Shipment weight in troy ounces
   3. Delivery zone / region risk classification
   4. Coverage level selection

   Premium formula:
     basePremium = notionalValue × zoneRiskRate
     adjustedPremium = basePremium × coverageMultiplier × minimumFloor

   The engine is fully deterministic — given the same inputs, it
   always produces the same outputs. No external calls.
   ================================================================ */

/* ---------- Types ---------- */

/** Shipping zone risk classification */
export type ShippingZone =
  | "DOMESTIC_US"
  | "DOMESTIC_EU"
  | "DOMESTIC_UK"
  | "INTRA_EU"
  | "TRANSATLANTIC"
  | "ASIA_PACIFIC"
  | "MIDDLE_EAST"
  | "OTHER";

/** Coverage level selection */
export type CoverageLevel = "STANDARD" | "ENHANCED" | "ALL_RISK";

/** Computed transit insurance quote */
export interface TransitInsuranceQuote {
  /** Total insurance premium in USD */
  premiumUsd: number;
  /** Notional value of the shipment (spotPrice × weightOz) */
  notionalValueUsd: number;
  /** Premium rate as a percentage of notional (e.g., 0.0025 = 0.25%) */
  premiumRate: number;
  /** Zone risk classification applied */
  zone: ShippingZone;
  /** Coverage level applied */
  coverageLevel: CoverageLevel;
  /** Maximum covered loss in USD */
  maxCoveredLossUsd: number;
  /** Deductible amount in USD */
  deductibleUsd: number;
  /** Whether the premium includes terrorism / force-majeure rider */
  includesForcesMajeureRider: boolean;
  /** Breakdown of premium components */
  breakdown: {
    baseZonePremium: number;
    coverageSurcharge: number;
    forceMajeureRider: number;
    minimumFloorAdjustment: number;
  };
}

/* ---------- Risk Rate Matrix ---------- */

/**
 * Zone-level base risk rates (annualized, expressed as fraction of notional).
 * These represent the probability-weighted expected loss per transit event.
 * Source: Composite of Brink's, Loomis, and Lloyd's underwriting tables.
 */
const ZONE_RISK_RATES: Record<ShippingZone, number> = {
  DOMESTIC_US: 0.0008, // 0.08% — lowest risk, USPS Registered + Brink's
  DOMESTIC_EU: 0.0010, // 0.10% — Schengen area, single regulatory zone
  DOMESTIC_UK: 0.0009, // 0.09% — UK domestic, well-regulated
  INTRA_EU: 0.0015, // 0.15% — cross-border EU, customs but low risk
  TRANSATLANTIC: 0.0022, // 0.22% — US↔EU oceanic/air freight
  ASIA_PACIFIC: 0.0028, // 0.28% — trans-Pacific, higher transit time
  MIDDLE_EAST: 0.0035, // 0.35% — elevated geopolitical risk premium
  OTHER: 0.0045, // 0.45% — unclassified, maximum rate
};

/** Coverage level multipliers on the base premium */
const COVERAGE_MULTIPLIERS: Record<CoverageLevel, number> = {
  STANDARD: 1.0, // Base coverage — theft, loss, damage
  ENHANCED: 1.45, // Adds mysterious disappearance + natural disaster
  ALL_RISK: 1.85, // Adds terrorism, force majeure, government seizure
};

/** Minimum premium floor in USD (no shipment should cost less to insure) */
const MINIMUM_PREMIUM_USD = 25.0;

/** Force-majeure rider cost as fraction of notional (only for ALL_RISK) */
const FORCE_MAJEURE_RIDER_RATE = 0.0005; // 0.05% of notional

/** Deductible as fraction of notional */
const DEDUCTIBLE_RATES: Record<CoverageLevel, number> = {
  STANDARD: 0.01, // 1% deductible
  ENHANCED: 0.005, // 0.5% deductible
  ALL_RISK: 0.0025, // 0.25% deductible
};

/* ---------- Public API ---------- */

/**
 * Compute a transit insurance premium for a gold bullion shipment.
 *
 * @param spotPricePerOz  Current XAU/USD spot price (from OANDA adapter)
 * @param weightOz        Shipment weight in troy ounces
 * @param zone            Delivery zone risk classification
 * @param coverageLevel   Coverage level (defaults to ALL_RISK for institutional)
 * @returns Fully computed insurance quote with breakdown
 */
export function computeTransitInsurance(
  spotPricePerOz: number,
  weightOz: number,
  zone: ShippingZone,
  coverageLevel: CoverageLevel = "ALL_RISK",
): TransitInsuranceQuote {
  // Defensive guards
  if (spotPricePerOz <= 0) throw new Error("Spot price must be positive");
  if (weightOz <= 0) throw new Error("Weight must be positive");

  const notionalValueUsd = spotPricePerOz * weightOz;

  // 1. Base zone premium
  const zoneRate = ZONE_RISK_RATES[zone];
  const baseZonePremium = notionalValueUsd * zoneRate;

  // 2. Coverage surcharge
  const coverageMultiplier = COVERAGE_MULTIPLIERS[coverageLevel];
  const coverageSurcharge = baseZonePremium * (coverageMultiplier - 1);

  // 3. Force-majeure rider (ALL_RISK only)
  const includesForcesMajeureRider = coverageLevel === "ALL_RISK";
  const forceMajeureRider = includesForcesMajeureRider
    ? notionalValueUsd * FORCE_MAJEURE_RIDER_RATE
    : 0;

  // 4. Sum raw premium
  const rawPremium = baseZonePremium + coverageSurcharge + forceMajeureRider;

  // 5. Apply minimum floor
  const minimumFloorAdjustment = Math.max(0, MINIMUM_PREMIUM_USD - rawPremium);
  const premiumUsd = parseFloat(
    Math.max(rawPremium, MINIMUM_PREMIUM_USD).toFixed(2),
  );

  // 6. Derived values
  const premiumRate = premiumUsd / notionalValueUsd;
  const deductibleUsd = parseFloat(
    (notionalValueUsd * DEDUCTIBLE_RATES[coverageLevel]).toFixed(2),
  );
  const maxCoveredLossUsd = parseFloat(
    (notionalValueUsd - deductibleUsd).toFixed(2),
  );

  return {
    premiumUsd,
    notionalValueUsd: parseFloat(notionalValueUsd.toFixed(2)),
    premiumRate: parseFloat(premiumRate.toFixed(6)),
    zone,
    coverageLevel,
    maxCoveredLossUsd,
    deductibleUsd,
    includesForcesMajeureRider,
    breakdown: {
      baseZonePremium: parseFloat(baseZonePremium.toFixed(2)),
      coverageSurcharge: parseFloat(coverageSurcharge.toFixed(2)),
      forceMajeureRider: parseFloat(forceMajeureRider.toFixed(2)),
      minimumFloorAdjustment: parseFloat(minimumFloorAdjustment.toFixed(2)),
    },
  };
}

/**
 * Determine shipping zone from country code.
 * Maps ISO 3166-1 alpha-2 codes to ShippingZone classifications.
 */
export function resolveShippingZone(countryCode: string): ShippingZone {
  const code = countryCode.toUpperCase().trim();

  // US domestic
  if (code === "US" || code === "USA") return "DOMESTIC_US";

  // UK domestic
  if (code === "GB" || code === "UK") return "DOMESTIC_UK";

  // EU member states
  const EU_MEMBERS = new Set([
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  ]);

  if (EU_MEMBERS.has(code)) return "DOMESTIC_EU";

  // Asia-Pacific
  const APAC = new Set([
    "JP", "CN", "KR", "AU", "NZ", "SG", "HK", "TW", "TH", "VN",
    "MY", "PH", "ID", "IN",
  ]);
  if (APAC.has(code)) return "ASIA_PACIFIC";

  // Middle East
  const MENA = new Set([
    "AE", "SA", "QA", "KW", "BH", "OM", "IL", "JO", "LB", "TR",
  ]);
  if (MENA.has(code)) return "MIDDLE_EAST";

  // Canada, Mexico → Transatlantic (close to US but cross-border)
  if (code === "CA" || code === "MX") return "TRANSATLANTIC";

  // Switzerland, Norway, Iceland → INTRA_EU (similar risk profile)
  if (code === "CH" || code === "NO" || code === "IS" || code === "LI") return "INTRA_EU";

  return "OTHER";
}

/**
 * Get a human-readable label for a shipping zone.
 */
export function getZoneLabel(zone: ShippingZone): string {
  const labels: Record<ShippingZone, string> = {
    DOMESTIC_US: "Domestic (United States)",
    DOMESTIC_EU: "Domestic (European Union)",
    DOMESTIC_UK: "Domestic (United Kingdom)",
    INTRA_EU: "Intra-European",
    TRANSATLANTIC: "Transatlantic",
    ASIA_PACIFIC: "Asia-Pacific",
    MIDDLE_EAST: "Middle East / North Africa",
    OTHER: "International (Other)",
  };
  return labels[zone];
}
