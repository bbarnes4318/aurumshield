"use server";

/* ================================================================
   CHECKOUT ACTIONS — Server Actions for Checkout Flow
   ================================================================
   Next.js Server Actions that handle sensitive operations during
   the checkout process. These run on the server to keep API keys
   secure and never expose them to the client.

   Actions:
   1. fetchSpotPrice()     — Get live XAU/USD from OANDA adapter
   2. createBillOfSale()   — Create Dropbox Sign signature request
   3. getSigningUrl()      — Get embedded sign URL for iFrame
   4. getInsuranceQuote()  — Compute transit insurance premium
   5. getShippingQuote()   — Get USPS Registered Mail rate
   ================================================================ */

import { getSpotPrice } from "@/lib/oanda-adapter";
import {
  createBillOfSale as dropboxCreateBillOfSale,
  getEmbeddedSignUrl,
  type SignerInfo,
  type BillOfSaleData,
} from "@/lib/dropbox-sign-adapter";
import {
  computeTransitInsurance,
  resolveShippingZone,
  type CoverageLevel,
  type TransitInsuranceQuote,
} from "@/lib/insurance-engine";
import {
  createShipmentQuote,
  type EasyPostAddress,
  type EasyPostShipment,
} from "@/lib/easypost-adapter";

/* ---------- Spot Price ---------- */

export interface SpotPriceResult {
  pricePerOz: number;
  source: "oanda_live" | "mock";
  timestamp: string;
}

/**
 * Fetch the current XAU/USD spot price.
 * Calls the OANDA adapter on the server side.
 */
export async function fetchSpotPrice(): Promise<SpotPriceResult> {
  const spot = await getSpotPrice();
  return {
    pricePerOz: spot.pricePerOz,
    source: spot.source === "oanda_live" ? "oanda_live" : "mock",
    timestamp: spot.timestamp,
  };
}

/* ---------- Bill of Sale ---------- */

export interface CreateBillOfSaleInput {
  buyer: SignerInfo;
  seller: SignerInfo;
  billOfSale: BillOfSaleData;
}

export interface CreateBillOfSaleResult {
  signatureRequestId: string;
  buyerSignatureId: string;
  sellerSignatureId: string;
  isMock: boolean;
}

/**
 * Create a Bill of Sale signature request via Dropbox Sign.
 * Returns the signature request ID and signer IDs for embedding.
 */
export async function serverCreateBillOfSale(
  input: CreateBillOfSaleInput,
): Promise<CreateBillOfSaleResult> {
  const result = await dropboxCreateBillOfSale(
    input.buyer,
    input.seller,
    input.billOfSale,
  );

  const buyerSigner = result.signers.find(
    (s) => s.signerEmail === input.buyer.emailAddress,
  );
  const sellerSigner = result.signers.find(
    (s) => s.signerEmail === input.seller.emailAddress,
  );

  return {
    signatureRequestId: result.signatureRequestId,
    buyerSignatureId: buyerSigner?.signatureId ?? "",
    sellerSignatureId: sellerSigner?.signatureId ?? "",
    isMock: result.isMock,
  };
}

/* ---------- Embedded Sign URL ---------- */

export interface GetSigningUrlResult {
  signUrl: string;
  expiresAt: string;
}

/**
 * Get the embedded sign URL for iFrame rendering.
 * The buyer uses this to sign the Bill of Sale inline.
 */
export async function serverGetSigningUrl(
  signatureId: string,
): Promise<GetSigningUrlResult> {
  const result = await getEmbeddedSignUrl(signatureId);
  return {
    signUrl: result.signUrl,
    expiresAt: result.expiresAt,
  };
}

/* ---------- Insurance Quote ---------- */

export interface InsuranceQuoteInput {
  spotPricePerOz: number;
  weightOz: number;
  countryCode: string;
  coverageLevel?: CoverageLevel;
}

/**
 * Compute a transit insurance premium for a gold shipment.
 * Resolves the shipping zone from the country code automatically.
 */
export async function serverGetInsuranceQuote(
  input: InsuranceQuoteInput,
): Promise<TransitInsuranceQuote> {
  const zone = resolveShippingZone(input.countryCode);
  return computeTransitInsurance(
    input.spotPricePerOz,
    input.weightOz,
    zone,
    input.coverageLevel ?? "ALL_RISK",
  );
}

/* ---------- Shipping Quote ---------- */

export interface ShippingQuoteInput {
  toAddress: EasyPostAddress;
  weightOz: number;
}

/**
 * Get a USPS Registered Mail rate quote for a gold shipment.
 * Uses EasyPost native fetch adapter (no SDK).
 */
export async function serverGetShippingQuote(
  input: ShippingQuoteInput,
): Promise<EasyPostShipment> {
  return createShipmentQuote(input.toAddress, input.weightOz);
}

/* ---------- Brink's Delivery Quote (D3 Fix) ---------- */

export interface BrinksQuoteInput {
  weightOz: number;
  notionalUsd: number;
  /** Country code for the delivery address (e.g. "US"). */
  countryCode: string;
}

export interface BrinksQuoteResult {
  baseFee: number;
  insuranceFee: number;
  handlingFee: number;
  totalFee: number;
  estimatedDays: number;
  carrier: string;
  validForMinutes: number;
  quotedAt: string;
}

/**
 * Get a Brink's Global Services rate quote for high-value gold shipments.
 * Uses the brinks-service adapter (mock API client).
 */
export async function serverGetBrinksQuote(
  input: BrinksQuoteInput,
): Promise<BrinksQuoteResult> {
  const { fetchDeliveryRate } = await import("@/lib/delivery/brinks-service");
  // Address is required by the adapter signature but not used in the mock
  const placeholderAddress = {
    fullName: "",
    streetAddress: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: input.countryCode,
    phone: "",
  };
  const quote = await fetchDeliveryRate(placeholderAddress, input.weightOz, input.notionalUsd);
  return {
    baseFee: quote.baseFee,
    insuranceFee: quote.insuranceFee,
    handlingFee: quote.handlingFee,
    totalFee: quote.totalFee,
    estimatedDays: quote.estimatedDays,
    carrier: quote.carrier,
    validForMinutes: quote.validForMinutes,
    quotedAt: quote.quotedAt,
  };
}

/* ---------- Platform Fee Estimate (D4 Fix) ---------- */

export interface PlatformFeeEstimateInput {
  notionalCents: number;
}

export interface PlatformFeeEstimateResult {
  /** Core indemnification fee in cents. */
  feeCents: number;
  /** Basis points used. */
  bps: number;
  /** Human-readable display. */
  feeUsd: string;
}

/**
 * Compute the platform's core indemnification fee for a given notional.
 * This is the minimum fee displayed during checkout before add-ons.
 */
export async function serverGetPlatformFeeEstimate(
  input: PlatformFeeEstimateInput,
): Promise<PlatformFeeEstimateResult> {
  const { computeFeeQuote, defaultPricingConfig, formatCentsUsd } = await import("@/lib/fees/fee-engine");
  const config = defaultPricingConfig();
  const result = computeFeeQuote({
    notionalCents: input.notionalCents,
    selectedAddOns: [],
    config,
    now: new Date().toISOString(),
  });
  return {
    feeCents: result.feeQuote.coreIndemnificationFeeCents,
    bps: config.coreFee.indemnificationBps,
    feeUsd: formatCentsUsd(result.feeQuote.coreIndemnificationFeeCents),
  };
}

/* ---------- Server-Backed Quote (Price Lock) ---------- */

export interface CreateQuoteActionInput {
  listingId: string;
  weightOz: number;
  premiumBps?: number;
}

export interface QuoteActionResult {
  quoteId: string;
  lockedPrice: number;
  spotPrice: number;
  premiumBps: number;
  expiresAt: string;
  secondsRemaining: number;
  priceFeedSource: string;
  priceFeedTimestamp: string;
}

/**
 * Create a server-backed price-lock quote.
 *
 * Enforces:
 *   1. LOCK_PRICE compliance capability
 *   2. Step-up re-verification (recent session)
 *
 * Returns a StepUpResponse shape so the client's useReverification
 * hook can detect REVERIFICATION_REQUIRED and prompt re-auth.
 */
export async function serverCreateQuote(
  input: CreateQuoteActionInput,
): Promise<{ error?: string; data?: QuoteActionResult }> {
  try {
    // Enforce compliance capability
    const { requireComplianceCapability, requireReverification, AuthError } = await import("@/lib/authz");
    const session = await requireComplianceCapability("LOCK_PRICE");

    // Enforce step-up re-verification
    try {
      await requireReverification();
    } catch (err) {
      if (err instanceof AuthError && err.message === "REVERIFICATION_REQUIRED") {
        return { error: "REVERIFICATION_REQUIRED" };
      }
      throw err;
    }

    // Create the quote
    const { createQuote } = await import("@/lib/pricing/quote-engine");
    const result = await createQuote({
      userId: session.userId,
      listingId: input.listingId,
      weightOz: input.weightOz,
      premiumBps: input.premiumBps,
    });

    return {
      data: {
        quoteId: result.quote.id,
        lockedPrice: result.quote.lockedPrice,
        spotPrice: result.quote.spotPrice,
        premiumBps: result.quote.premiumBps,
        expiresAt: result.quote.expiresAt,
        secondsRemaining: result.secondsRemaining,
        priceFeedSource: result.quote.priceFeedSource,
        priceFeedTimestamp: result.quote.priceFeedTimestamp,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create quote";
    console.error("[CHECKOUT] serverCreateQuote failed:", message);
    return { error: message };
  }
}

/* ---------- Validate Quote ---------- */

export interface ValidateQuoteResult {
  valid: boolean;
  quoteId: string;
  lockedPrice: number;
  weightOz: number;
  secondsRemaining: number;
  priceFeedSource: string;
}

/**
 * Validate that a quote is still active and owned by the caller.
 * Used in StepTwo to verify the quote hasn't expired before settlement.
 */
export async function serverValidateQuote(
  quoteId: string,
): Promise<{ error?: string; data?: ValidateQuoteResult }> {
  try {
    const { requireSession } = await import("@/lib/authz");
    const session = await requireSession();

    const { validateQuote } = await import("@/lib/pricing/quote-engine");
    const quote = await validateQuote(quoteId, session.userId);

    if (!quote) {
      return {
        data: {
          valid: false,
          quoteId,
          lockedPrice: 0,
          weightOz: 0,
          secondsRemaining: 0,
          priceFeedSource: "",
        },
      };
    }

    const secondsRemaining = Math.max(
      0,
      Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 1000),
    );

    return {
      data: {
        valid: true,
        quoteId: quote.id,
        lockedPrice: quote.lockedPrice,
        weightOz: quote.weightOz,
        secondsRemaining,
        priceFeedSource: quote.priceFeedSource,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to validate quote";
    console.error("[CHECKOUT] serverValidateQuote failed:", message);
    return { error: message };
  }
}

