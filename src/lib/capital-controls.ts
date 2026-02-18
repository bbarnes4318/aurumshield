/* ================================================================
   CAPITAL CONTROLS — Deterministic intraday guardrails & throttles
   No side effects. No randomness. No persistence.
   All inputs passed explicitly; all outputs derived.
   ================================================================ */

import type { IntradayCapitalSnapshot } from "./capital-engine";
import { TARGET_ECR, computeIntradayCapitalSnapshot } from "./capital-engine";
import type { BreachEvent } from "./breach-store";
import { loadBreachState } from "./breach-store";
import { loadMarketplaceState } from "./marketplace-store";
import { loadSettlementState } from "./settlement-store";
import { mockCapitalPhase1 } from "./mock-data";
import { expireReservations } from "./marketplace-engine";

/* ================================================================
   ControlActionKey — canonical enum for gated actions
   ================================================================ */

export type ControlActionKey =
  | "CREATE_RESERVATION"
  | "CONVERT_RESERVATION"
  | "PUBLISH_LISTING"
  | "OPEN_SETTLEMENT"
  | "EXECUTE_DVP";

export const ALL_ACTION_KEYS: ControlActionKey[] = [
  "CREATE_RESERVATION",
  "CONVERT_RESERVATION",
  "PUBLISH_LISTING",
  "OPEN_SETTLEMENT",
  "EXECUTE_DVP",
];

export const ACTION_KEY_LABELS: Record<ControlActionKey, string> = {
  CREATE_RESERVATION: "Create Reservation",
  CONVERT_RESERVATION: "Convert → Order",
  PUBLISH_LISTING: "Publish Listing",
  OPEN_SETTLEMENT: "Open Settlement",
  EXECUTE_DVP: "Execute DvP",
};

/* ================================================================
   ControlMode — Escalating severity levels
   ================================================================ */

export type ControlMode =
  | "NORMAL"
  | "THROTTLE_RESERVATIONS"
  | "FREEZE_CONVERSIONS"
  | "FREEZE_MARKETPLACE"
  | "EMERGENCY_HALT";

export const CONTROL_MODE_SEVERITY: Record<ControlMode, number> = {
  NORMAL: 0,
  THROTTLE_RESERVATIONS: 1,
  FREEZE_CONVERSIONS: 2,
  FREEZE_MARKETPLACE: 3,
  EMERGENCY_HALT: 4,
};

/** Modes that may be globally overridden (max one level downgrade) */
export const GLOBALLY_OVERRIDABLE_MODES: ControlMode[] = [
  "THROTTLE_RESERVATIONS",
  "FREEZE_CONVERSIONS",
];

/* ================================================================
   CapitalControlDecision — Output of policy evaluation
   ================================================================ */

export interface CapitalControlDecision {
  asOf: string;
  mode: ControlMode;
  reasons: string[];
  /** Explicit block map keyed by ControlActionKey */
  blocks: Record<ControlActionKey, boolean>;
  /** Advisory limits (only relevant in THROTTLE mode) */
  limits: {
    maxReservationNotional?: number;
    maxReservationWeightOz?: number;
  };
  /** FNV-1a hash of snapshot key metrics for override validation */
  snapshotHash: string;
}

/* ================================================================
   Snapshot hash — deterministic FNV-1a fingerprint
   ================================================================ */

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function computeSnapshotHash(snap: IntradayCapitalSnapshot): string {
  const raw = [
    snap.asOf.slice(0, 16),
    snap.ecr.toFixed(4),
    snap.hardstopUtilization.toFixed(4),
    snap.breachLevel,
    snap.grossExposureNotional.toFixed(2),
    snap.capitalBase.toFixed(2),
  ].join("|");
  return fnv1a(raw);
}

/* ================================================================
   Deterministic thresholds
   ================================================================ */

/** HU threshold where reservation blocking kicks in under CAUTION */
const HU_THROTTLE_THRESHOLD = 0.90;

/** HU threshold where conversions freeze */
const HU_FREEZE_THRESHOLD = 0.93;

/** ECR multiplier over target to trigger conversion freeze */
const ECR_FREEZE_MULTIPLIER = 1.05;

/** Buffer-negative lookback window (ms) */
const BUFFER_NEGATIVE_LOOKBACK_MS = 60 * 60 * 1000; // 60 minutes

/* ================================================================
   evaluateCapitalControls — Main entry point
   Pure function: snapshot + breach events → control decision
   ================================================================ */

export function evaluateCapitalControls(
  snapshot: IntradayCapitalSnapshot,
  recentBreachEvents: BreachEvent[],
): CapitalControlDecision {
  const now = snapshot.asOf;
  const reasons: string[] = [];

  /* ── 1. Check for EMERGENCY_HALT conditions ── */

  // HU ≥ 1.0
  if (snapshot.hardstopUtilization >= 1.0) {
    reasons.push(
      `Hardstop utilization ${(snapshot.hardstopUtilization * 100).toFixed(2)}% ≥ 100% — EMERGENCY_HALT`,
    );
    return buildDecision(now, "EMERGENCY_HALT", reasons, snapshot);
  }

  // BUFFER_NEGATIVE event in last 60 minutes
  const cutoffTime = new Date(new Date(now).getTime() - BUFFER_NEGATIVE_LOOKBACK_MS).toISOString();
  const hasRecentBufferNegative = recentBreachEvents.some(
    (e) => e.type === "BUFFER_NEGATIVE" && e.occurredAt >= cutoffTime,
  );
  if (hasRecentBufferNegative) {
    reasons.push(
      `BUFFER_NEGATIVE breach event detected within last 60 minutes — EMERGENCY_HALT`,
    );
    return buildDecision(now, "EMERGENCY_HALT", reasons, snapshot);
  }

  /* ── 2. Check for FREEZE_MARKETPLACE (BREACH but < 1.0 HU) ── */

  if (snapshot.breachLevel === "BREACH") {
    reasons.push(
      `Breach level BREACH with HU ${(snapshot.hardstopUtilization * 100).toFixed(2)}% — FREEZE_MARKETPLACE`,
    );
    return buildDecision(now, "FREEZE_MARKETPLACE", reasons, snapshot);
  }

  /* ── 3. Check CAUTION-level conditions ── */

  if (snapshot.breachLevel === "CAUTION") {
    // Check FREEZE_CONVERSIONS first (higher severity)
    const ecrExceedsFreeze = snapshot.ecr >= TARGET_ECR * ECR_FREEZE_MULTIPLIER;
    const huExceedsFreeze = snapshot.hardstopUtilization >= HU_FREEZE_THRESHOLD;

    if (ecrExceedsFreeze || huExceedsFreeze) {
      if (ecrExceedsFreeze) {
        reasons.push(
          `ECR ${snapshot.ecr.toFixed(2)}x ≥ ${(TARGET_ECR * ECR_FREEZE_MULTIPLIER).toFixed(1)}x (target × 1.05) — FREEZE_CONVERSIONS`,
        );
      }
      if (huExceedsFreeze) {
        reasons.push(
          `Hardstop utilization ${(snapshot.hardstopUtilization * 100).toFixed(2)}% ≥ ${(HU_FREEZE_THRESHOLD * 100).toFixed(0)}% — FREEZE_CONVERSIONS`,
        );
      }
      return buildDecision(now, "FREEZE_CONVERSIONS", reasons, snapshot);
    }

    // Check THROTTLE_RESERVATIONS
    const reservedIsTopDriver =
      snapshot.topDrivers.length > 0 &&
      snapshot.topDrivers[0].label.toLowerCase().includes("reservation");
    const huExceedsThrottle = snapshot.hardstopUtilization >= HU_THROTTLE_THRESHOLD;

    if (reservedIsTopDriver || huExceedsThrottle) {
      if (reservedIsTopDriver) {
        reasons.push(
          `Reserved notional is top exposure driver — THROTTLE_RESERVATIONS`,
        );
      }
      if (huExceedsThrottle) {
        reasons.push(
          `Hardstop utilization ${(snapshot.hardstopUtilization * 100).toFixed(2)}% ≥ ${(HU_THROTTLE_THRESHOLD * 100).toFixed(0)}% — THROTTLE_RESERVATIONS`,
        );
      }
      return buildDecision(now, "THROTTLE_RESERVATIONS", reasons, snapshot, {
        // Advisory limits: cap at 50% of remaining capacity
        maxReservationNotional: Math.max(
          0,
          (snapshot.hardstopLimit - snapshot.grossExposureNotional) * 0.5,
        ),
        maxReservationWeightOz: undefined,
      });
    }

    // CAUTION but no specific throttle condition → still NORMAL but with CAUTION reasons
    reasons.push(
      `Breach level CAUTION — no specific throttle triggers met. Mode remains NORMAL.`,
    );
    return buildDecision(now, "NORMAL", reasons, snapshot);
  }

  /* ── 4. CLEAR → NORMAL ── */
  return buildDecision(now, "NORMAL", [], snapshot);
}

/* ================================================================
   Block matrix builder — deterministic per mode
   ================================================================ */

function buildBlockMatrix(mode: ControlMode): Record<ControlActionKey, boolean> {
  switch (mode) {
    case "NORMAL":
      return {
        CREATE_RESERVATION: false,
        CONVERT_RESERVATION: false,
        PUBLISH_LISTING: false,
        OPEN_SETTLEMENT: false,
        EXECUTE_DVP: false,
      };
    case "THROTTLE_RESERVATIONS":
      return {
        CREATE_RESERVATION: true,
        CONVERT_RESERVATION: false,
        PUBLISH_LISTING: false,
        OPEN_SETTLEMENT: false,
        EXECUTE_DVP: false,
      };
    case "FREEZE_CONVERSIONS":
      return {
        CREATE_RESERVATION: true,
        CONVERT_RESERVATION: true,
        PUBLISH_LISTING: false,
        OPEN_SETTLEMENT: false,
        EXECUTE_DVP: false,
      };
    case "FREEZE_MARKETPLACE":
      return {
        CREATE_RESERVATION: true,
        CONVERT_RESERVATION: true,
        PUBLISH_LISTING: true,
        OPEN_SETTLEMENT: false,
        EXECUTE_DVP: false,
      };
    case "EMERGENCY_HALT":
      return {
        CREATE_RESERVATION: true,
        CONVERT_RESERVATION: true,
        PUBLISH_LISTING: true,
        OPEN_SETTLEMENT: true,
        EXECUTE_DVP: true,
      };
  }
}

function buildDecision(
  asOf: string,
  mode: ControlMode,
  reasons: string[],
  snapshot: IntradayCapitalSnapshot,
  limits?: CapitalControlDecision["limits"],
): CapitalControlDecision {
  return {
    asOf,
    mode,
    reasons,
    blocks: buildBlockMatrix(mode),
    limits: limits ?? {},
    snapshotHash: computeSnapshotHash(snapshot),
  };
}

/* ================================================================
   Canonical Snapshot — single source of truth
   Ensures no drift between intraday console, dashboard, and gates
   ================================================================ */

export function getCanonicalCapitalSnapshot(nowIso: string): IntradayCapitalSnapshot {
  const rawMktState = loadMarketplaceState();
  const mktState = expireReservations(rawMktState, new Date(nowIso).getTime());
  const stlState = loadSettlementState();

  return computeIntradayCapitalSnapshot({
    capital: mockCapitalPhase1,
    reservations: mktState.reservations,
    orders: mktState.orders,
    inventory: mktState.inventory,
    settlements: stlState.settlements,
    now: nowIso,
  });
}

/** Canonical control decision derived from canonical snapshot + stored breaches */
export function getCanonicalControlDecision(nowIso: string): {
  snapshot: IntradayCapitalSnapshot;
  decision: CapitalControlDecision;
  breachEvents: BreachEvent[];
} {
  const snapshot = getCanonicalCapitalSnapshot(nowIso);
  const breachEvents = loadBreachState().events;
  const decision = evaluateCapitalControls(snapshot, breachEvents);
  return { snapshot, decision, breachEvents };
}
