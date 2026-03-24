/* ================================================================
   PHYSICAL VALIDATION ENGINE — Gate 3 & Gate 4 Rule Engines
   ================================================================
   Phase 3.3: Mathematical and logical validation rules that feed
   the Settlement Authorization Service.

   GATE 3 — SHIPMENT INTEGRITY:
     1. Unbroken CoC timeline (PICKUP → TRANSPORT → DELIVERY → RECEIPT)
     2. No FAILED verification events
     3. Seal number continuity (PICKUP seal === REFINERY_RECEIPT seal)

   GATE 4 — ASSAY ECONOMICS:
     1. Gross weight > 0
     2. Recoverable gold weight ≤ gross weight
     3. Fineness ∈ (0, 999.99]
     4. Assay certificate reference is non-null
     5. Payable value matches recalculation within 0.01% tolerance

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq, asc } from "drizzle-orm";
import {
  coPhysicalShipments,
  coChainOfCustodyEvents,
  coRefineryLots,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

/**
 * Expected chain-of-custody event sequence.
 * A valid shipment must progress through these event types in order.
 * Not every stage is required, but they MUST appear in this order
 * if present (`timeline[i].eventTimestamp < timeline[i+1].eventTimestamp`).
 */
const EXPECTED_EVENT_ORDER: readonly string[] = [
  "PICKUP",
  "SEAL_CHECK",
  "TRANSPORT",
  "TRANSFER",
  "DELIVERY",
  "REFINERY_RECEIPT",
] as const;

/**
 * Tolerance for payable value recalculation match.
 * Default: 0.0001 (0.01%).
 * Configurable via ASSAY_VALUE_TOLERANCE_PCT.
 */
const VALUE_TOLERANCE_PCT = parseFloat(
  process.env.ASSAY_VALUE_TOLERANCE_PCT || "0.0001",
);

/**
 * Default gold oracle price per troy ounce (USD).
 * In production, this would be fetched from a live price feed.
 * Configurable via GOLD_ORACLE_PRICE_USD.
 *
 * TODO: Replace with live oracle integration (LBMA/COMEX feed).
 */
const GOLD_ORACLE_PRICE_USD = parseFloat(
  process.env.GOLD_ORACLE_PRICE_USD || "2350.00",
);

/**
 * Default treaty discount rate applied to payable gold.
 * Accounts for refining costs, logistics, and margin.
 * Configurable via TREATY_DISCOUNT_RATE.
 *
 * Default: 0.98 (2% discount from spot).
 */
const TREATY_DISCOUNT_RATE = parseFloat(
  process.env.TREATY_DISCOUNT_RATE || "0.98",
);

// ─── RESULT TYPES ──────────────────────────────────────────────────────────────

export interface ShipmentIntegrityResult {
  intact: boolean;
  shipmentId: string;
  totalEvents: number;
  verifiedEvents: number;
  failedEvents: number;
  sealMatch: boolean;
  timelineValid: boolean;
  breakReason?: string;
  details: EventDetail[];
}

export interface EventDetail {
  eventId: string;
  eventType: string;
  eventTimestamp: string;
  verificationStatus: string;
  sealNumber: string | null;
  location: string | null;
}

export interface AssayEconomicsResult {
  valid: boolean;
  lotId: string;
  grossWeight: number;
  netWeight: number;
  fineness: number;
  recoverableGoldWeight: number;
  payableGoldWeight: number;
  storedPayableValue: number | null;
  calculatedPayableValue: number;
  oraclePrice: number;
  discountRate: number;
  valueDeltaPct: number | null;
  assayCertificateRef: string | null;
  exceptionReason?: string;
  assertions: AssayAssertion[];
}

export interface AssayAssertion {
  rule: string;
  passed: boolean;
  expected: string;
  actual: string;
}

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

export class ShipmentNotFoundError extends Error {
  constructor(shipmentId: string) {
    super(`NOT_FOUND: Physical Shipment ${shipmentId} does not exist.`);
    this.name = "ShipmentNotFoundError";
  }
}

export class LotNotFoundError extends Error {
  constructor(lotId: string) {
    super(`NOT_FOUND: Refinery Lot ${lotId} does not exist.`);
    this.name = "LotNotFoundError";
  }
}

// ─── GATE 3: SHIPMENT INTEGRITY ────────────────────────────────────────────────

/**
 * Validate the physical integrity of a shipment's chain of custody.
 *
 * ASSERTIONS:
 *   1. TIMELINE — Events must appear in the expected order
 *      (PICKUP before TRANSPORT before DELIVERY before REFINERY_RECEIPT).
 *      Timestamps must be monotonically increasing.
 *
 *   2. NO FAILURES — No event has verification_status = "FAILED".
 *
 *   3. SEAL CONTINUITY — The seal_number recorded at PICKUP must
 *      identically match the seal_number at REFINERY_RECEIPT.
 *      A broken seal indicates potential tampering.
 *
 * @param shipmentId - UUID of the physical shipment to validate
 * @returns ShipmentIntegrityResult with integrity assessment
 * @throws ShipmentNotFoundError if shipment does not exist
 */
export async function validateShipmentIntegrity(
  shipmentId: string,
): Promise<ShipmentIntegrityResult> {
  const db = await getDb();

  // ── Verify shipment exists ──
  const [shipment] = await db
    .select()
    .from(coPhysicalShipments)
    .where(eq(coPhysicalShipments.id, shipmentId))
    .limit(1);

  if (!shipment) {
    throw new ShipmentNotFoundError(shipmentId);
  }

  // ── Fetch all CoC events ordered by timestamp ──
  const events = await db
    .select()
    .from(coChainOfCustodyEvents)
    .where(eq(coChainOfCustodyEvents.shipmentId, shipmentId))
    .orderBy(asc(coChainOfCustodyEvents.eventTimestamp));

  const details: EventDetail[] = events.map((e) => ({
    eventId: e.id,
    eventType: e.eventType,
    eventTimestamp: new Date(e.eventTimestamp).toISOString(),
    verificationStatus: e.verificationStatus,
    sealNumber: e.sealNumber,
    location: e.location,
  }));

  if (events.length === 0) {
    return {
      intact: false,
      shipmentId,
      totalEvents: 0,
      verifiedEvents: 0,
      failedEvents: 0,
      sealMatch: false,
      timelineValid: false,
      breakReason: "No chain-of-custody events recorded for this shipment.",
      details,
    };
  }

  // ── ASSERTION 1: No FAILED events ──
  const failedEvents = events.filter(
    (e) => e.verificationStatus === "FAILED",
  );

  if (failedEvents.length > 0) {
    return {
      intact: false,
      shipmentId,
      totalEvents: events.length,
      verifiedEvents: events.filter((e) => e.verificationStatus === "VERIFIED").length,
      failedEvents: failedEvents.length,
      sealMatch: false,
      timelineValid: false,
      breakReason:
        `${failedEvents.length} custody event(s) have FAILED verification: ` +
        failedEvents
          .map((e) => `${e.eventType}@${e.location ?? "unknown"} (${e.id})`)
          .join(", "),
      details,
    };
  }

  // ── ASSERTION 2: Timeline order ──
  // Map each event to its position in the expected order
  const timelineValid = validateTimelineOrder(events);

  if (!timelineValid.valid) {
    return {
      intact: false,
      shipmentId,
      totalEvents: events.length,
      verifiedEvents: events.filter((e) => e.verificationStatus === "VERIFIED").length,
      failedEvents: 0,
      sealMatch: false,
      timelineValid: false,
      breakReason: timelineValid.reason,
      details,
    };
  }

  // ── ASSERTION 3: Seal number continuity ──
  const pickupEvent = events.find((e) => e.eventType === "PICKUP");
  const receiptEvent = events.find((e) => e.eventType === "REFINERY_RECEIPT");

  let sealMatch = true;
  let sealBreakReason: string | undefined;

  if (pickupEvent && receiptEvent) {
    if (!pickupEvent.sealNumber) {
      sealMatch = false;
      sealBreakReason = "PICKUP event is missing seal_number.";
    } else if (!receiptEvent.sealNumber) {
      sealMatch = false;
      sealBreakReason = "REFINERY_RECEIPT event is missing seal_number.";
    } else if (pickupEvent.sealNumber !== receiptEvent.sealNumber) {
      sealMatch = false;
      sealBreakReason =
        `Seal mismatch: PICKUP seal="${pickupEvent.sealNumber}" ≠ ` +
        `REFINERY_RECEIPT seal="${receiptEvent.sealNumber}". ` +
        `Possible tampering detected.`;
    }
  } else if (pickupEvent && !receiptEvent) {
    // No receipt yet — not necessarily a break, shipment may still be in transit
    sealMatch = false;
    sealBreakReason =
      "No REFINERY_RECEIPT event recorded — cannot verify seal continuity.";
  }

  if (!sealMatch) {
    return {
      intact: false,
      shipmentId,
      totalEvents: events.length,
      verifiedEvents: events.filter((e) => e.verificationStatus === "VERIFIED").length,
      failedEvents: 0,
      sealMatch: false,
      timelineValid: true,
      breakReason: sealBreakReason,
      details,
    };
  }

  // ── ALL ASSERTIONS PASSED ──
  return {
    intact: true,
    shipmentId,
    totalEvents: events.length,
    verifiedEvents: events.filter((e) => e.verificationStatus === "VERIFIED").length,
    failedEvents: 0,
    sealMatch: true,
    timelineValid: true,
    details,
  };
}

/**
 * Validate that CoC events appear in the expected logical order.
 * Events must respect the EXPECTED_EVENT_ORDER sequence.
 * Timestamps must be monotonically non-decreasing.
 */
function validateTimelineOrder(
  events: { eventType: string; eventTimestamp: Date | string }[],
): { valid: boolean; reason: string } {
  // Check monotonically increasing timestamps
  for (let i = 1; i < events.length; i++) {
    const prev = new Date(events[i - 1].eventTimestamp).getTime();
    const curr = new Date(events[i].eventTimestamp).getTime();

    if (curr < prev) {
      return {
        valid: false,
        reason:
          `Timeline violation: event[${i}] (${events[i].eventType}) at ` +
          `${new Date(events[i].eventTimestamp).toISOString()} occurs BEFORE ` +
          `event[${i - 1}] (${events[i - 1].eventType}) at ` +
          `${new Date(events[i - 1].eventTimestamp).toISOString()}.`,
      };
    }
  }

  // Check logical ordering against expected sequence
  let lastOrderIndex = -1;
  for (const event of events) {
    const orderIndex = EXPECTED_EVENT_ORDER.indexOf(event.eventType);
    if (orderIndex === -1) {
      // Unknown event type — skip (don't fail on forward-compatible types)
      continue;
    }

    if (orderIndex < lastOrderIndex) {
      return {
        valid: false,
        reason:
          `Logical sequence violation: "${event.eventType}" appeared after a ` +
          `later-stage event type "${EXPECTED_EVENT_ORDER[lastOrderIndex]}". ` +
          `Expected order: ${EXPECTED_EVENT_ORDER.join(" → ")}.`,
      };
    }

    lastOrderIndex = orderIndex;
  }

  return { valid: true, reason: "Timeline order verified." };
}

// ─── GATE 4: ASSAY ECONOMICS ───────────────────────────────────────────────────

/**
 * Validate the economic integrity of a refinery lot's assay results.
 *
 * MATHEMATICAL ASSERTIONS:
 *   1. gross_weight > 0
 *   2. net_weight > 0 AND net_weight ≤ gross_weight
 *   3. recoverable_gold_weight > 0 AND ≤ gross_weight
 *   4. fineness ∈ (0, 999.99]
 *   5. assay_certificate_ref IS NOT NULL
 *
 * VALUE VERIFICATION:
 *   Recalculate: payableValue = payable_gold_weight × oracle_price × discount_rate
 *   Assert: |storedValue - calculatedValue| / calculatedValue ≤ 0.01%
 *
 * @param lotId - UUID of the refinery lot to validate
 * @returns AssayEconomicsResult with validation details
 * @throws LotNotFoundError if lot does not exist
 */
export async function validateAssayEconomics(
  lotId: string,
): Promise<AssayEconomicsResult> {
  const db = await getDb();

  // ── Fetch the lot ──
  const [lot] = await db
    .select()
    .from(coRefineryLots)
    .where(eq(coRefineryLots.id, lotId))
    .limit(1);

  if (!lot) {
    throw new LotNotFoundError(lotId);
  }

  const assertions: AssayAssertion[] = [];
  const reasons: string[] = [];

  // Parse numeric values
  const grossWeight = lot.grossWeight ? parseFloat(lot.grossWeight) : 0;
  const netWeight = lot.netWeight ? parseFloat(lot.netWeight) : 0;
  const fineness = lot.fineness ? parseFloat(lot.fineness) : 0;
  const recoverableGoldWeight = lot.recoverableGoldWeight
    ? parseFloat(lot.recoverableGoldWeight)
    : 0;
  const payableGoldWeight = lot.payableGoldWeight
    ? parseFloat(lot.payableGoldWeight)
    : 0;
  const storedPayableValue = lot.payableValue
    ? parseFloat(lot.payableValue)
    : null;

  // ── Assertion 1: gross_weight > 0 ──
  const grossWeightValid = grossWeight > 0;
  assertions.push({
    rule: "GROSS_WEIGHT_POSITIVE",
    passed: grossWeightValid,
    expected: "> 0",
    actual: grossWeight.toString(),
  });
  if (!grossWeightValid) reasons.push("Gross weight must be > 0.");

  // ── Assertion 2: net_weight > 0 AND net_weight ≤ gross_weight ──
  const netWeightPositive = netWeight > 0;
  const netWeightBounded = netWeight <= grossWeight;
  assertions.push({
    rule: "NET_WEIGHT_POSITIVE",
    passed: netWeightPositive,
    expected: "> 0",
    actual: netWeight.toString(),
  });
  assertions.push({
    rule: "NET_WEIGHT_BOUNDED",
    passed: netWeightBounded,
    expected: `≤ ${grossWeight}`,
    actual: netWeight.toString(),
  });
  if (!netWeightPositive) reasons.push("Net weight must be > 0.");
  if (!netWeightBounded) reasons.push(`Net weight (${netWeight}) exceeds gross weight (${grossWeight}).`);

  // ── Assertion 3: recoverable_gold_weight > 0 AND ≤ gross_weight ──
  const recoverablePositive = recoverableGoldWeight > 0;
  const recoverableBounded = recoverableGoldWeight <= grossWeight;
  assertions.push({
    rule: "RECOVERABLE_WEIGHT_POSITIVE",
    passed: recoverablePositive,
    expected: "> 0",
    actual: recoverableGoldWeight.toString(),
  });
  assertions.push({
    rule: "RECOVERABLE_WEIGHT_BOUNDED",
    passed: recoverableBounded,
    expected: `≤ ${grossWeight}`,
    actual: recoverableGoldWeight.toString(),
  });
  if (!recoverablePositive) reasons.push("Recoverable gold weight must be > 0.");
  if (!recoverableBounded) reasons.push(`Recoverable gold weight (${recoverableGoldWeight}) exceeds gross weight (${grossWeight}).`);

  // ── Assertion 4: fineness ∈ (0, 999.99] ──
  const finenessValid = fineness > 0 && fineness <= 999.99;
  assertions.push({
    rule: "FINENESS_BOUNDED",
    passed: finenessValid,
    expected: "(0, 999.99]",
    actual: fineness.toString(),
  });
  if (!finenessValid) reasons.push(`Fineness (${fineness}) is outside valid range (0, 999.99].`);

  // ── Assertion 5: assay_certificate_ref IS NOT NULL ──
  const certRefPresent = lot.assayCertificateRef !== null && lot.assayCertificateRef !== "";
  assertions.push({
    rule: "ASSAY_CERTIFICATE_PRESENT",
    passed: certRefPresent,
    expected: "non-null, non-empty",
    actual: lot.assayCertificateRef ?? "NULL",
  });
  if (!certRefPresent) reasons.push("Assay certificate reference is missing.");

  // ── Value Verification: Recalculate payable value ──
  const calculatedPayableValue =
    payableGoldWeight * GOLD_ORACLE_PRICE_USD * TREATY_DISCOUNT_RATE;

  let valueDeltaPct: number | null = null;
  let valueMismatch = false;

  if (storedPayableValue !== null && calculatedPayableValue > 0) {
    valueDeltaPct =
      Math.abs(storedPayableValue - calculatedPayableValue) / calculatedPayableValue;

    const valueMatches = valueDeltaPct <= VALUE_TOLERANCE_PCT;
    assertions.push({
      rule: "PAYABLE_VALUE_MATCH",
      passed: valueMatches,
      expected: `within ${(VALUE_TOLERANCE_PCT * 100).toFixed(4)}% of ${calculatedPayableValue.toFixed(2)}`,
      actual: `${storedPayableValue.toFixed(2)} (delta=${(valueDeltaPct * 100).toFixed(4)}%)`,
    });
    if (!valueMatches) {
      valueMismatch = true;
      reasons.push(
        `Payable value mismatch: stored=${storedPayableValue.toFixed(2)}, ` +
          `calculated=${calculatedPayableValue.toFixed(2)} ` +
          `(delta=${(valueDeltaPct * 100).toFixed(4)}%, tolerance=${(VALUE_TOLERANCE_PCT * 100).toFixed(4)}%).`,
      );
    }
  } else if (storedPayableValue === null) {
    // No stored value — not an error if assay just completed and
    // value hasn't been persisted yet. Flag as informational.
    assertions.push({
      rule: "PAYABLE_VALUE_MATCH",
      passed: true,
      expected: "N/A (no stored value to compare)",
      actual: `calculated=${calculatedPayableValue.toFixed(2)}`,
    });
  }

  // ── Build result ──
  const allPassed =
    grossWeightValid &&
    netWeightPositive &&
    netWeightBounded &&
    recoverablePositive &&
    recoverableBounded &&
    finenessValid &&
    certRefPresent &&
    !valueMismatch;

  const result: AssayEconomicsResult = {
    valid: allPassed,
    lotId,
    grossWeight,
    netWeight,
    fineness,
    recoverableGoldWeight,
    payableGoldWeight,
    storedPayableValue,
    calculatedPayableValue: parseFloat(calculatedPayableValue.toFixed(2)),
    oraclePrice: GOLD_ORACLE_PRICE_USD,
    discountRate: TREATY_DISCOUNT_RATE,
    valueDeltaPct,
    assayCertificateRef: lot.assayCertificateRef,
    assertions,
  };

  if (!allPassed) {
    result.exceptionReason = reasons.join(" | ");
    console.error(
      `[VALIDATION] ❌ Assay economics FAILED for lot ${lotId}: ${result.exceptionReason}`,
    );
  } else {
    console.log(
      `[VALIDATION] ✅ Assay economics PASSED for lot ${lotId}: ` +
        `gross=${grossWeight}, net=${netWeight}, fineness=${fineness}, ` +
        `recoverable=${recoverableGoldWeight}, payable=$${calculatedPayableValue.toFixed(2)}`,
    );
  }

  return result;
}
