/* ================================================================
   CAPITAL ENGINE — Pure deterministic intraday capital computation
   No side effects. No randomness. No persistence.
   All inputs are passed explicitly; all outputs are derived.
   ================================================================ */

import type {
  DashboardCapital,
  Reservation,
  Order,
  InventoryPosition,
  SettlementCase,
} from "./mock-data";

/* ---------- Constants (documented, deterministic) ---------- */

/** Phase 1 charter ECR threshold. Exposure-to-capital ratio target. */
export const TARGET_ECR = 8.0;

/**
 * Policy haircut applied to ACTIVE (not yet converted) reservation notional.
 * Rationale: reservations may expire, so only 35% of their notional counts
 * toward gross exposure for capital purposes.
 */
export const RESERVE_HAIRCUT = 0.35;

/**
 * Deterministic add-on factor applied to gross exposure when computing
 * the buffer vs TVaR₉₉. Represents a simplified tail-risk surcharge.
 */
const TVAR_ADDON_FACTOR = 0.12;

/* ---------- Output Types ---------- */

export type CapitalBreachLevel = "CLEAR" | "CAUTION" | "BREACH";

export interface IntradayCapitalSnapshot {
  asOf: string;
  calculationMode: "LIVE";

  capitalBase: number;
  hardstopLimit: number;

  grossExposureNotional: number;
  reservedNotional: number;
  allocatedNotional: number;
  settlementNotionalOpen: number;
  settledNotionalToday: number;

  ecr: number;
  hardstopUtilization: number;

  bufferVsTvar99: number;

  breachLevel: CapitalBreachLevel;
  breachReasons: string[];

  topDrivers: { label: string; value: number; id?: string }[];
}

/* ---------- Input aggregate ---------- */

export interface CapitalEngineInputs {
  capital: DashboardCapital;
  reservations: Reservation[];
  orders: Order[];
  inventory: InventoryPosition[];
  settlements: SettlementCase[];
  now: string; // ISO timestamp
}

/* ---------- Settlement statuses that count as "open" ---------- */

const OPEN_SETTLEMENT_STATUSES = new Set([
  "ESCROW_OPEN",
  "AWAITING_FUNDS",
  "AWAITING_GOLD",
  "AWAITING_VERIFICATION",
  "READY_TO_SETTLE",
  "AUTHORIZED",
]);

/* ---------- Date boundary helper ---------- */

function isSameDay(iso1: string, iso2: string): boolean {
  return iso1.slice(0, 10) === iso2.slice(0, 10);
}

/* ---------- Top driver type ---------- */

interface DriverCandidate {
  label: string;
  value: number;
  id?: string;
}

/* ================================================================
   computeIntradayCapitalSnapshot — Main entry point
   ================================================================ */

export function computeIntradayCapitalSnapshot(
  inputs: CapitalEngineInputs,
): IntradayCapitalSnapshot {
  const { capital, reservations, orders, inventory, settlements, now } = inputs;
  const todayDate = now.slice(0, 10);

  /* ── 1. Reserved Notional (ACTIVE reservations) ── */
  let reservedNotional = 0;
  for (const res of reservations) {
    if (res.state === "ACTIVE") {
      reservedNotional += res.weightOz * res.pricePerOzLocked;
    }
  }

  /* ── 2. Allocated Notional ── */
  // From CONVERTED reservations (their notional is now allocated)
  let allocatedNotional = 0;
  for (const res of reservations) {
    if (res.state === "CONVERTED") {
      allocatedNotional += res.weightOz * res.pricePerOzLocked;
    }
  }

  // Also count allocated inventory weight not already captured by reservations.
  // Each inventory position tracks allocatedWeightOz independently.
  // We approximate value using the average listing price from orders on that listing.
  for (const inv of inventory) {
    if (inv.allocatedWeightOz > 0) {
      // Find the price from orders on this listing
      const matchingOrders = orders.filter(
        (o) => o.listingId === inv.listingId,
      );
      if (matchingOrders.length > 0) {
        const avgPrice =
          matchingOrders.reduce((sum, o) => sum + o.pricePerOz, 0) /
          matchingOrders.length;
        // Only add the portion not already covered by CONVERTED reservations
        const convertedOnListing = reservations.filter(
          (r) => r.state === "CONVERTED" && r.listingId === inv.listingId,
        );
        const convertedOz = convertedOnListing.reduce(
          (s, r) => s + r.weightOz,
          0,
        );
        const uncoveredOz = Math.max(0, inv.allocatedWeightOz - convertedOz);
        allocatedNotional += uncoveredOz * avgPrice;
      }
    }
  }

  /* ── 3. Settlement Notional Open ── */
  let settlementNotionalOpen = 0;
  let settledNotionalToday = 0;
  for (const stl of settlements) {
    if (OPEN_SETTLEMENT_STATUSES.has(stl.status)) {
      settlementNotionalOpen += stl.notionalUsd;
    }
    if (stl.status === "SETTLED" && isSameDay(stl.updatedAt, todayDate)) {
      settledNotionalToday += stl.notionalUsd;
    }
  }

  /* ── 4. Gross Exposure Notional ── */
  const grossExposureNotional =
    allocatedNotional +
    settlementNotionalOpen +
    reservedNotional * RESERVE_HAIRCUT;

  /* ── 5. Ratios ── */
  const capitalBase = capital.capitalBase;
  const hardstopLimit = capital.hardstopLimit;

  const ecr = capitalBase > 0 ? grossExposureNotional / capitalBase : 0;
  const hardstopUtilization =
    hardstopLimit > 0 ? grossExposureNotional / hardstopLimit : 0;

  /* ── 6. Buffer vs TVaR₉₉ ── */
  const bufferVsTvar99 =
    capitalBase - capital.tvar99 - grossExposureNotional * TVAR_ADDON_FACTOR;

  /* ── 7. Breach Classification ── */
  const breachReasons: string[] = [];
  let breachLevel: CapitalBreachLevel = "CLEAR";

  // BREACH conditions (checked first — most severe)
  if (hardstopUtilization >= 0.95) {
    breachLevel = "BREACH";
    breachReasons.push(
      `Hardstop utilization ${(hardstopUtilization * 100).toFixed(2)}% ≥ 95% threshold`,
    );
  }
  if (hardstopUtilization >= 1.0) {
    if (breachLevel !== "BREACH") breachLevel = "BREACH";
    if (
      !breachReasons.some((r) => r.includes("Hardstop utilization"))
    ) {
      breachReasons.push(
        `Hardstop utilization ${(hardstopUtilization * 100).toFixed(2)}% ≥ 100% — EXCEEDED`,
      );
    }
  }

  // CAUTION conditions (only if not already BREACH)
  if (breachLevel === "CLEAR") {
    if (hardstopUtilization >= 0.8) {
      breachLevel = "CAUTION";
      breachReasons.push(
        `Hardstop utilization ${(hardstopUtilization * 100).toFixed(2)}% in 80–95% caution band`,
      );
    }
    if (ecr >= TARGET_ECR) {
      breachLevel = breachLevel === "CLEAR" ? "CAUTION" : breachLevel;
      breachReasons.push(
        `ECR ${ecr.toFixed(4)}x exceeds target ${TARGET_ECR.toFixed(1)}x`,
      );
    }
  }

  // Buffer negative is informational but contributes to caution
  if (bufferVsTvar99 < 0 && breachLevel === "CLEAR") {
    breachLevel = "CAUTION";
    breachReasons.push(
      `Buffer vs TVaR₉₉ is negative: $${Math.abs(bufferVsTvar99).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    );
  }

  /* ── 8. Top Drivers (top 5 by exposure contribution) ── */
  const drivers: DriverCandidate[] = [];

  // Reservations (active)
  for (const res of reservations) {
    if (res.state === "ACTIVE") {
      drivers.push({
        label: `Reservation ${res.id} (${res.weightOz} oz ACTIVE)`,
        value: res.weightOz * res.pricePerOzLocked * RESERVE_HAIRCUT,
        id: res.id,
      });
    }
  }

  // Orders (contributing to allocated)
  for (const ord of orders) {
    if (
      ord.status !== "cancelled" &&
      ord.status !== "completed"
    ) {
      drivers.push({
        label: `Order ${ord.id} (${ord.weightOz} oz ${ord.status})`,
        value: ord.notional,
        id: ord.id,
      });
    }
  }

  // Settlements (open)
  for (const stl of settlements) {
    if (OPEN_SETTLEMENT_STATUSES.has(stl.status)) {
      drivers.push({
        label: `Settlement ${stl.id} (${stl.weightOz} oz ${stl.status})`,
        value: stl.notionalUsd,
        id: stl.id,
      });
    }
  }

  // Sort descending by value, take top 5
  drivers.sort((a, b) => b.value - a.value);
  const topDrivers = drivers.slice(0, 5);

  return {
    asOf: now,
    calculationMode: "LIVE",
    capitalBase,
    hardstopLimit,
    grossExposureNotional,
    reservedNotional,
    allocatedNotional,
    settlementNotionalOpen,
    settledNotionalToday,
    ecr,
    hardstopUtilization,
    bufferVsTvar99,
    breachLevel,
    breachReasons,
    topDrivers,
  };
}
