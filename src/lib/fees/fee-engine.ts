/* ================================================================
   FEE ENGINE — Single source of truth for all fee calculations
   
   Rules:
   1. All amounts stored as integer cents (USD × 100)
   2. Percent items computed via basis points (1 bps = 0.01%)
   3. Round half-up for all fractional cents
   4. Clamp logic: clamp(value, min, max)
   5. FeeQuote is recalculated dynamically until paymentStatus === "paid"
   6. Once paid, FeeQuote becomes immutable snapshot — admin pricing
      changes must NOT retroactively alter paid invoices
   7. No duplicated math — all UI, seeds, and exports use this engine
   ================================================================ */

/* ---------- Add-On Category ---------- */

export type AddOnCategory =
  | "physical"
  | "insurance"
  | "compliance"
  | "structuring"
  | "audit"
  | "priority_ops";

export const ADD_ON_CATEGORY_LABELS: Record<AddOnCategory, string> = {
  physical: "Physical",
  insurance: "Insurance",
  compliance: "Compliance",
  structuring: "Structuring",
  audit: "Audit",
  priority_ops: "Priority Ops",
};

export const ADD_ON_CATEGORY_ORDER: AddOnCategory[] = [
  "physical",
  "insurance",
  "compliance",
  "structuring",
  "audit",
  "priority_ops",
];

/* ---------- Pricing Model ---------- */

export type PricingModel = "percent" | "flat" | "pass_through_plus_fee" | "pass_through";

/* ---------- Add-On Descriptions ---------- */

export interface AddOnDescription {
  whatItDoes: string;
  whenYouNeedIt: string;
  pricingExplainer: string;
  operationalNotes?: string;
}

/* ---------- Add-On Catalog Entry ---------- */

export interface AddOnCatalogEntry {
  code: string;
  label: string;
  category: AddOnCategory;
  pricingModel: PricingModel;
  /** Basis points (1 bps = 0.01%). Used when pricingModel is "percent". */
  defaultBps?: number;
  /** Flat fee in cents. Used when pricingModel is "flat" or as platform fee for pass_through. */
  defaultFlatCents?: number;
  /** Platform coordination fee in cents (pass_through_plus_fee only). */
  defaultPlatformFeeFlatCents?: number;
  /** Minimum fee in cents (percent model clamp). */
  defaultMinCents?: number;
  /** Maximum fee in cents (percent model clamp). */
  defaultMaxCents?: number;
  /** Whether this add-on requires manual OPS/compliance approval. */
  requiresManualApproval: boolean;
  /** Whether enabling this add-on affects capital risk metrics. */
  affectsRisk: boolean;
  /** Whether enabling this add-on affects capital adequacy. */
  affectsCapital: boolean;
  /** Structured descriptions for UI display. */
  description: AddOnDescription;
}

/* ---------- ADD-ON CATALOG — Default entries ---------- */

export const ADD_ON_CATALOG: AddOnCatalogEntry[] = [
  /* ── Physical ── */
  {
    code: "armored_transport_coordination",
    label: "Armored Transport Coordination",
    category: "physical",
    pricingModel: "pass_through_plus_fee",
    defaultPlatformFeeFlatCents: 25_000_00,
    requiresManualApproval: true,
    affectsRisk: true,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Coordinates armored carrier logistics for physical gold transport between vaults, including chain-of-custody documentation and real-time GPS tracking.",
      whenYouNeedIt:
        "When physical gold must be moved between jurisdictions or vault facilities as part of settlement.",
      pricingExplainer:
        "Vendor pass-through (carrier quote) + $25,000 platform coordination fee. Vendor quote required before activation.",
      operationalNotes:
        "Vendor quote must be supplied by Vault Ops before fee can be finalized. Manual approval required.",
    },
  },
  {
    code: "vaulting_onboarding",
    label: "Vaulting Onboarding",
    category: "physical",
    pricingModel: "flat",
    defaultFlatCents: 35_000_00,
    requiresManualApproval: false,
    affectsRisk: false,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Establishes a new allocated storage position at the designated custody vault, including account creation, insurance binding, and compliance documentation.",
      whenYouNeedIt:
        "When the buyer does not yet have an allocated storage account at the settlement vault.",
      pricingExplainer: "Flat fee: $35,000.",
    },
  },
  {
    code: "dual_control_release",
    label: "Dual-Control Release",
    category: "physical",
    pricingModel: "flat",
    defaultFlatCents: 15_000_00,
    requiresManualApproval: false,
    affectsRisk: true,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Enforces two-party authorization (buyer + vault officer) for physical release of gold from custody.",
      whenYouNeedIt:
        "When counterparty or regulatory requirements mandate dual-control withdrawal procedures.",
      pricingExplainer: "Flat fee: $15,000.",
    },
  },

  /* ── Insurance ── */
  {
    code: "transit_insurance_upgrade",
    label: "Transit Insurance Upgrade",
    category: "insurance",
    pricingModel: "percent",
    defaultBps: 12,
    defaultMinCents: 25_000_00,
    defaultMaxCents: 200_000_00,
    requiresManualApproval: false,
    affectsRisk: true,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Upgrades insurance coverage during physical transit to full replacement value plus consequential loss protection.",
      whenYouNeedIt:
        "When the standard transit coverage is insufficient for the value or destination risk profile.",
      pricingExplainer:
        "0.12% of notional (min $25,000 / cap $200,000).",
    },
  },
  {
    code: "counterparty_default_coverage",
    label: "Counterparty Default Coverage",
    category: "insurance",
    pricingModel: "percent",
    defaultBps: 18,
    defaultMinCents: 30_000_00,
    defaultMaxCents: 300_000_00,
    requiresManualApproval: false,
    affectsRisk: true,
    affectsCapital: true,
    description: {
      whatItDoes:
        "Provides insurance against counterparty failure to deliver gold or funds after settlement authorization.",
      whenYouNeedIt:
        "When dealing with counterparties in elevated-risk jurisdictions or with limited credit history.",
      pricingExplainer:
        "0.18% of notional (min $30,000 / cap $300,000).",
    },
  },
  {
    code: "political_risk_coverage",
    label: "Political Risk Coverage",
    category: "insurance",
    pricingModel: "percent",
    defaultBps: 22,
    defaultMinCents: 40_000_00,
    defaultMaxCents: 400_000_00,
    requiresManualApproval: true,
    affectsRisk: true,
    affectsCapital: true,
    description: {
      whatItDoes:
        "Covers loss from sovereign seizure, capital controls, sanctions, or political instability affecting gold held in foreign jurisdictions.",
      whenYouNeedIt:
        "When gold is vaulted or transiting through jurisdictions with elevated political risk scores.",
      pricingExplainer:
        "0.22% of notional (min $40,000 / cap $400,000). Manual approval required.",
      operationalNotes:
        "Underwriting team reviews corridor risk before binding coverage.",
    },
  },

  /* ── Compliance ── */
  {
    code: "enhanced_aml_edd",
    label: "Enhanced AML / EDD",
    category: "compliance",
    pricingModel: "flat",
    defaultFlatCents: 60_000_00,
    requiresManualApproval: false,
    affectsRisk: false,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Performs enhanced due diligence including source-of-funds investigation, beneficial ownership mapping, and PEP/sanctions deep screening.",
      whenYouNeedIt:
        "When the counterparty's risk tier is ELEVATED or HIGH, or when the transaction exceeds jurisdictional reporting thresholds.",
      pricingExplainer: "Flat fee: $60,000.",
    },
  },
  {
    code: "provenance_verification",
    label: "Provenance Verification",
    category: "compliance",
    pricingModel: "flat",
    defaultFlatCents: 45_000_00,
    requiresManualApproval: false,
    affectsRisk: false,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Traces gold provenance from mine-to-vault using LBMA-compliant chain-of-custody records and assay certificates.",
      whenYouNeedIt:
        "When buyers require OECD-aligned responsible sourcing documentation or when gold origin is disputed.",
      pricingExplainer: "Flat fee: $45,000.",
    },
  },
  {
    code: "sanctions_legal_review",
    label: "Sanctions & Legal Review",
    category: "compliance",
    pricingModel: "flat",
    defaultFlatCents: 75_000_00,
    requiresManualApproval: true,
    affectsRisk: true,
    affectsCapital: false,
    description: {
      whatItDoes:
        "External counsel review of transaction against OFAC, EU, and UN sanctions lists with formal legal opinion letter.",
      whenYouNeedIt:
        "When the corridor involves sanctioned or grey-listed jurisdictions, or when regulatory counsel sign-off is required.",
      pricingExplainer: "Flat fee: $75,000. Manual approval required.",
      operationalNotes:
        "Legal opinion is issued by external counsel and takes 3–5 business days.",
    },
  },

  /* ── Structuring ── */
  {
    code: "independent_escrow_structuring",
    label: "Independent Escrow Structuring",
    category: "structuring",
    pricingModel: "percent",
    defaultBps: 8,
    defaultMinCents: 35_000_00,
    defaultMaxCents: 250_000_00,
    requiresManualApproval: false,
    affectsRisk: false,
    affectsCapital: true,
    description: {
      whatItDoes:
        "Structures an independent third-party escrow arrangement with segregated accounts and dual-signatory release conditions.",
      whenYouNeedIt:
        "When either party requires independent escrow management outside the platform's standard clearing process.",
      pricingExplainer:
        "0.08% of notional (min $35,000 / cap $250,000).",
    },
  },
  {
    code: "tranche_settlement_schedule",
    label: "Tranche Settlement Schedule",
    category: "structuring",
    pricingModel: "flat",
    defaultFlatCents: 30_000_00,
    requiresManualApproval: false,
    affectsRisk: false,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Splits a single settlement into multiple time-phased tranches with independent escrow legs and milestone-based release.",
      whenYouNeedIt:
        "When deal size or operational constraints require phased delivery and payment.",
      pricingExplainer: "Flat fee: $30,000.",
    },
  },

  /* ── Audit ── */
  {
    code: "regulatory_dossier_package",
    label: "Regulatory Dossier Package",
    category: "audit",
    pricingModel: "flat",
    defaultFlatCents: 20_000_00,
    requiresManualApproval: false,
    affectsRisk: false,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Compiles a comprehensive regulatory filing package including transaction records, compliance certificates, and ledger exports.",
      whenYouNeedIt:
        "When a regulatory authority requests documentation or when the counterparty requires a compliance dossier.",
      pricingExplainer: "Flat fee: $20,000.",
    },
  },
  {
    code: "independent_auditor_attestation",
    label: "Independent Auditor Attestation",
    category: "audit",
    pricingModel: "flat",
    defaultFlatCents: 90_000_00,
    requiresManualApproval: false,
    affectsRisk: false,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Engages an independent Big-4 or specialist auditor to attest to the transaction, custody, and settlement process integrity.",
      whenYouNeedIt:
        "When institutional governance or fund mandates require independent third-party attestation.",
      pricingExplainer: "Flat fee: $90,000.",
    },
  },

  /* ── Priority Ops ── */
  {
    code: "fast_lane_processing",
    label: "Fast-Lane Processing",
    category: "priority_ops",
    pricingModel: "percent",
    defaultBps: 5,
    defaultMinCents: 25_000_00,
    defaultMaxCents: 150_000_00,
    requiresManualApproval: false,
    affectsRisk: false,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Escalates settlement to priority queue with dedicated operations staff and accelerated verification timelines.",
      whenYouNeedIt:
        "When settlement must complete within same-day or next-day windows.",
      pricingExplainer:
        "0.05% of notional (min $25,000 / cap $150,000).",
    },
  },
  {
    code: "dedicated_ops_oversight",
    label: "Dedicated Ops Oversight",
    category: "priority_ops",
    pricingModel: "flat",
    defaultFlatCents: 40_000_00,
    requiresManualApproval: false,
    affectsRisk: false,
    affectsCapital: false,
    description: {
      whatItDoes:
        "Assigns a named operations officer to the settlement with direct communication channel and real-time status updates.",
      whenYouNeedIt:
        "When the transaction requires white-glove service or the counterparty expects a single point of contact.",
      pricingExplainer: "Flat fee: $40,000.",
    },
  },
];

/* ---------- Pricing Config (Admin-Editable) ---------- */

export interface CoreFeeConfig {
  /** Basis points for indemnification fee (100 = 1.00%). */
  indemnificationBps: number;
  /** Minimum fee in cents. */
  minCents: number;
  /** Maximum fee in cents (cap). */
  maxCents: number;
}

export interface AddOnPricingOverride {
  /** Override basis points (percent model). */
  bps?: number;
  /** Override flat fee cents. */
  flatCents?: number;
  /** Override platform coordination fee cents (pass_through model). */
  platformFeeFlatCents?: number;
  /** Override min cents. */
  minCents?: number;
  /** Override max cents. */
  maxCents?: number;
  /** Whether this add-on is enabled for selection. */
  enabled: boolean;
  /** Override manual approval requirement. */
  requiresManualApproval?: boolean;
  /** Override risk flag. */
  affectsRisk?: boolean;
  /** Override capital flag. */
  affectsCapital?: boolean;
}

export interface PricingConfig {
  coreFee: CoreFeeConfig;
  addOnOverrides: Record<string, AddOnPricingOverride>;
  updatedAtUtc: string;
}

/** Factory defaults matching the spec. */
export function defaultPricingConfig(): PricingConfig {
  const overrides: Record<string, AddOnPricingOverride> = {};
  for (const entry of ADD_ON_CATALOG) {
    overrides[entry.code] = { enabled: true };
  }
  return {
    coreFee: {
      indemnificationBps: 100, // 1.00%
      minCents: 50_000_00,
      maxCents: 500_000_00,
    },
    addOnOverrides: overrides,
    updatedAtUtc: new Date().toISOString(),
  };
}

/* ---------- Selected Add-On ---------- */

export interface SelectedAddOn {
  code: string;
  /** Vendor quote in cents (required for pass_through_plus_fee). */
  vendorQuoteCents?: number | null;
}

/* ---------- Fee Line Item ---------- */

export interface FeeLineItem {
  code: string;
  label: string;
  /** Whether this is a platform fee or vendor pass-through. */
  type: "platform_fee" | "vendor_pass_through";
  pricingModel: PricingModel;
  amountCents: number;
  metadata: {
    percentBps?: number;
    minCents?: number;
    maxCents?: number;
    vendorName?: string;
    platformCoordinationFeeCents?: number;
    vendorQuoteCents?: number;
  };
}

/* ---------- Fee Quote ---------- */

export interface FeeQuote {
  coreIndemnificationFeeCents: number;
  addOnFeesCents: number;
  vendorPassThroughCents: number;
  totalDueCents: number;
  lineItems: FeeLineItem[];
  calculatedAtUtc: string;
  /** If true, this quote is frozen and must not be recalculated. */
  frozen: boolean;
}

/* ---------- Calculation Helpers ---------- */

/** Round half-up: Math.round handles this correctly for non-negative values. */
function roundHalfUp(value: number): number {
  return Math.round(value);
}

/** Clamp value between min and max (inclusive). */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Compute fee from basis points with clamp. */
function computePercentFee(
  notionalCents: number,
  bps: number,
  minCents: number,
  maxCents: number,
): number {
  // bps / 10000 gives the decimal rate
  // E.g. 100 bps = 1% = notionalCents * 100 / 10000
  const raw = roundHalfUp((notionalCents * bps) / 10_000);
  return clamp(raw, minCents, maxCents);
}

/* ---------- Resolve effective add-on config ---------- */

interface ResolvedAddOn {
  entry: AddOnCatalogEntry;
  bps: number;
  flatCents: number;
  platformFeeFlatCents: number;
  minCents: number;
  maxCents: number;
  requiresManualApproval: boolean;
}

function resolveAddOn(
  entry: AddOnCatalogEntry,
  config: PricingConfig,
): ResolvedAddOn {
  const ov = config.addOnOverrides[entry.code];
  return {
    entry,
    bps: ov?.bps ?? entry.defaultBps ?? 0,
    flatCents: ov?.flatCents ?? entry.defaultFlatCents ?? 0,
    platformFeeFlatCents:
      ov?.platformFeeFlatCents ?? entry.defaultPlatformFeeFlatCents ?? 0,
    minCents: ov?.minCents ?? entry.defaultMinCents ?? 0,
    maxCents: ov?.maxCents ?? entry.defaultMaxCents ?? Number.MAX_SAFE_INTEGER,
    requiresManualApproval:
      ov?.requiresManualApproval ?? entry.requiresManualApproval,
  };
}

/* ================================================================
   computeFeeQuote — The single source of truth
   
   Input:  notionalCents + selectedAddOns + vendorQuotes + PricingConfig
   Output: FeeQuote (line items + totals)
   
   Rules:
   - Always includes indemnification fee
   - Percent items: integer math using basis points, round half-up
   - Apply clamps
   - Armored transport = vendor pass-through + platform coordination fee
   - requiresManualApproval if ANY selected add-on requiresManualApproval
     OR if a pass_through vendor quote is missing
   - totalDueCents = platform fees + vendor pass-through (tax = 0)
   ================================================================ */

export interface ComputeFeeQuoteInput {
  notionalCents: number;
  selectedAddOns: SelectedAddOn[];
  config: PricingConfig;
  now: string;
}

export interface ComputeFeeQuoteResult {
  feeQuote: FeeQuote;
  requiresManualApproval: boolean;
}

export function computeFeeQuote(
  input: ComputeFeeQuoteInput,
): ComputeFeeQuoteResult {
  const { notionalCents, selectedAddOns, config, now } = input;
  const lineItems: FeeLineItem[] = [];
  let requiresManualApproval = false;

  // 1. Core indemnification fee — always included
  const coreFee = computePercentFee(
    notionalCents,
    config.coreFee.indemnificationBps,
    config.coreFee.minCents,
    config.coreFee.maxCents,
  );

  lineItems.push({
    code: "indemnification_fee",
    label: "Indemnification Fee (Fraud Protection)",
    type: "platform_fee",
    pricingModel: "percent",
    amountCents: coreFee,
    metadata: {
      percentBps: config.coreFee.indemnificationBps,
      minCents: config.coreFee.minCents,
      maxCents: config.coreFee.maxCents,
    },
  });

  // 2. Selected add-ons
  for (const sel of selectedAddOns) {
    const catalogEntry = ADD_ON_CATALOG.find((e) => e.code === sel.code);
    if (!catalogEntry) continue;

    // Check if enabled in config
    const override = config.addOnOverrides[sel.code];
    if (override && !override.enabled) continue;

    const resolved = resolveAddOn(catalogEntry, config);

    if (resolved.requiresManualApproval) {
      requiresManualApproval = true;
    }

    switch (catalogEntry.pricingModel) {
      case "percent": {
        const fee = computePercentFee(
          notionalCents,
          resolved.bps,
          resolved.minCents,
          resolved.maxCents,
        );
        lineItems.push({
          code: catalogEntry.code,
          label: catalogEntry.label,
          type: "platform_fee",
          pricingModel: "percent",
          amountCents: fee,
          metadata: {
            percentBps: resolved.bps,
            minCents: resolved.minCents,
            maxCents: resolved.maxCents,
          },
        });
        break;
      }

      case "flat": {
        lineItems.push({
          code: catalogEntry.code,
          label: catalogEntry.label,
          type: "platform_fee",
          pricingModel: "flat",
          amountCents: resolved.flatCents,
          metadata: {},
        });
        break;
      }

      case "pass_through_plus_fee": {
        const vendorQuoteCents = sel.vendorQuoteCents ?? null;

        if (vendorQuoteCents === null || vendorQuoteCents === undefined) {
          // Missing vendor quote → flag manual approval
          requiresManualApproval = true;
        }

        // Platform coordination fee
        lineItems.push({
          code: `${catalogEntry.code}_platform`,
          label: `${catalogEntry.label} — Platform Fee`,
          type: "platform_fee",
          pricingModel: "pass_through",
          amountCents: resolved.platformFeeFlatCents,
          metadata: {
            platformCoordinationFeeCents: resolved.platformFeeFlatCents,
          },
        });

        // Vendor pass-through (0 if quote not yet supplied)
        if (vendorQuoteCents !== null && vendorQuoteCents !== undefined) {
          lineItems.push({
            code: `${catalogEntry.code}_vendor`,
            label: `${catalogEntry.label} — Vendor Pass-Through`,
            type: "vendor_pass_through",
            pricingModel: "pass_through",
            amountCents: vendorQuoteCents,
            metadata: {
              vendorQuoteCents,
              vendorName: "Carrier (via Vault Ops)",
            },
          });
        }
        break;
      }
    }
  }

  // 3. Compute totals
  let platformFees = 0;
  let vendorPassThrough = 0;
  for (const li of lineItems) {
    if (li.type === "vendor_pass_through") {
      vendorPassThrough += li.amountCents;
    } else {
      platformFees += li.amountCents;
    }
  }

  const feeQuote: FeeQuote = {
    coreIndemnificationFeeCents: coreFee,
    addOnFeesCents: platformFees - coreFee,
    vendorPassThroughCents: vendorPassThrough,
    totalDueCents: platformFees + vendorPassThrough,
    lineItems,
    calculatedAtUtc: now,
    frozen: false,
  };

  return { feeQuote, requiresManualApproval };
}

/* ---------- Freeze / Recalculate helpers ---------- */

/**
 * Recalculate fee quote for a settlement that is NOT yet paid.
 * Returns null if the quote is frozen (payment already processed).
 */
export function recalculateFeeQuote(
  currentQuote: FeeQuote | undefined,
  input: ComputeFeeQuoteInput,
): ComputeFeeQuoteResult | null {
  if (currentQuote?.frozen) return null;
  return computeFeeQuote(input);
}

/**
 * Freeze a fee quote — called when payment is captured.
 * Returns a new FeeQuote with frozen=true. Original is not mutated.
 */
export function freezeFeeQuoteOnPayment(quote: FeeQuote): FeeQuote {
  return { ...quote, frozen: true };
}

/* ---------- Formatting Utilities ---------- */

/** Format cents as USD string: $1,234.56 */
export function formatCentsUsd(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/** Format basis points as percentage string: 1.00% */
export function formatBpsPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/** Dollars to cents (integer). */
export function dollarsToCents(dollars: number): number {
  return roundHalfUp(dollars * 100);
}

/** Cents to dollars (float). */
export function centsToDollars(cents: number): number {
  return cents / 100;
}
