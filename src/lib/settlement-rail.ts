/* ================================================================
   SETTLEMENT RAIL — Dual-Rail Router
   ================================================================
   Defines the SettlementRail interface and the routeSettlement()
   router that enforces the $250k threshold logic:

     - notionalCents ≤ SETTLEMENT_ENTERPRISE_THRESHOLD → Moov
     - notionalCents > SETTLEMENT_ENTERPRISE_THRESHOLD → Modern Treasury
     - Moov failures automatically retry on Modern Treasury

   The SETTLEMENT_RAIL env var controls the behaviour:
     "auto"             — threshold-based routing (default)
     "moov"             — force Moov for all amounts
     "modern_treasury"  — force Modern Treasury for all amounts

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

/* ---------- Types ---------- */

/** Payout instruction passed to any settlement rail. */
export interface SettlementPayoutRequest {
  /** AurumShield settlement ID (for idempotency & ledger reference) */
  settlementId: string;
  /** Seller external account identifier (varies by rail implementation) */
  sellerAccountId: string;
  /** Total settlement value in cents (smallest USD denomination) */
  totalAmountCents: number;
  /** Platform fee in cents */
  platformFeeCents: number;
  /** Optional metadata to attach to the payment order */
  metadata?: Record<string, string>;
}

/** Result returned by any settlement rail after executing a payout. */
export interface SettlementPayoutResult {
  /** Whether the payout was executed successfully */
  success: boolean;
  /** Rail that was ultimately used */
  railUsed: "modern_treasury" | "moov";
  /** External IDs from the rail (payment order IDs, transfer IDs, etc.) */
  externalIds: string[];
  /** Seller payout amount in cents */
  sellerPayoutCents: number;
  /** Platform fee in cents */
  platformFeeCents: number;
  /** Whether this result came from a fallback retry */
  isFallback: boolean;
  /** Error message if the payout failed */
  error?: string;
}

/**
 * Settlement rail interface.
 * Each rail implementation (Modern Treasury, Moov) must implement this.
 */
export interface ISettlementRail {
  /** Human-readable rail name */
  readonly name: string;
  /** Execute a payout and fee sweep */
  executePayout(request: SettlementPayoutRequest): Promise<SettlementPayoutResult>;
  /** Check if the rail is configured (API keys present) */
  isConfigured(): boolean;
}

/* ---------- Rail Selection ---------- */

export type RailMode = "auto" | "moov" | "modern_treasury";

/**
 * Read the settlement rail mode from environment.
 * Defaults to "auto" if not set.
 */
function getRailMode(): RailMode {
  const mode = process.env.SETTLEMENT_RAIL ?? "auto";
  const valid: RailMode[] = ["auto", "moov", "modern_treasury"];
  return valid.includes(mode as RailMode) ? (mode as RailMode) : "auto";
}

/**
 * Read the enterprise threshold from environment.
 * Defaults to 25_000_000 ($250,000 in cents).
 */
function getEnterpriseThreshold(): number {
  const raw = process.env.SETTLEMENT_ENTERPRISE_THRESHOLD;
  if (!raw) return 25_000_000; // $250k in cents
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? 25_000_000 : parsed;
}

/* ---------- Registry ---------- */

let _moovRail: ISettlementRail | null = null;
let _modernTreasuryRail: ISettlementRail | null = null;

/**
 * Register rail implementations. Call this at app startup or lazily
 * before the first payout. Each rail registers itself via this function.
 */
export function registerSettlementRail(
  railName: "moov" | "modern_treasury",
  rail: ISettlementRail,
): void {
  if (railName === "moov") {
    _moovRail = rail;
  } else {
    _modernTreasuryRail = rail;
  }
}

/* ---------- Router ---------- */

/**
 * Route a settlement payout through the appropriate rail.
 *
 * Routing logic:
 *   1. If SETTLEMENT_RAIL === "moov", use Moov exclusively.
 *   2. If SETTLEMENT_RAIL === "modern_treasury", use Modern Treasury exclusively.
 *   3. If SETTLEMENT_RAIL === "auto":
 *      a. notionalCents ≤ threshold → Moov (with MT fallback)
 *      b. notionalCents > threshold → Modern Treasury
 *
 * Fallback: If Moov fails in auto mode, automatically retry on Modern Treasury.
 */
export async function routeSettlement(
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  const mode = getRailMode();
  const threshold = getEnterpriseThreshold();

  /* ── Force Moov ── */
  if (mode === "moov") {
    return executeOnRail("moov", request);
  }

  /* ── Force Modern Treasury ── */
  if (mode === "modern_treasury") {
    return executeOnRail("modern_treasury", request);
  }

  /* ── Auto mode: threshold-based routing ── */
  if (request.totalAmountCents <= threshold) {
    // Moov primary, Modern Treasury fallback
    const moovResult = await executeMoovWithFallback(request);
    return moovResult;
  }

  // Above threshold → Modern Treasury (no fallback to Moov for large amounts)
  return executeOnRail("modern_treasury", request);
}

/**
 * Execute on a specific rail. Returns a structured error if the rail
 * is not registered or not configured.
 */
async function executeMoovWithFallback(
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  // Try Moov first
  if (_moovRail && _moovRail.isConfigured()) {
    try {
      const result = await _moovRail.executePayout(request);
      if (result.success) return result;

      // Moov failed — fall through to Modern Treasury
      console.warn(
        `[AurumShield] Moov payout failed for ${request.settlementId}: ${result.error}. Falling back to Modern Treasury.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[AurumShield] Moov payout exception for ${request.settlementId}: ${message}. Falling back to Modern Treasury.`,
      );
    }
  } else {
    console.warn(
      `[AurumShield] Moov rail not configured — falling back to Modern Treasury for ${request.settlementId}`,
    );
  }

  // Fallback to Modern Treasury
  const fallbackResult = await executeFallback(request);
  return fallbackResult;
}

/**
 * Execute on a fallback rail (Modern Treasury) and mark the result accordingly.
 */
async function executeFallback(
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  const result = await executOnRailDirect("modern_treasury", request);
  return {
    ...result,
    isFallback: true,
  };
}

/**
 * Execute a payout on a named rail with no fallback.
 */
async function executOnRailDirect(
  railName: "moov" | "modern_treasury",
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  const rail = railName === "moov" ? _moovRail : _modernTreasuryRail;

  if (!rail) {
    return {
      success: false,
      railUsed: railName,
      externalIds: [],
      sellerPayoutCents: 0,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      error: `${railName} rail not registered. Call registerSettlementRail() at startup.`,
    };
  }

  if (!rail.isConfigured()) {
    return {
      success: false,
      railUsed: railName,
      externalIds: [],
      sellerPayoutCents: 0,
      platformFeeCents: request.platformFeeCents,
      isFallback: false,
      error: `${railName} rail is not configured (missing API keys).`,
    };
  }

  return rail.executePayout(request);
}

/**
 * Execute on a specific rail. In auto mode with Moov, failures
 * trigger an automatic Modern Treasury fallback.
 */
async function executOnRailSingle(
  railName: "moov" | "modern_treasury",
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  return executOnRailDirect(railName, request);
}

// Alias for cleaner public API
const executOnRail = executOnRailSingle;

/**
 * Public-facing rail execution (no fallback).
 */
async function executeOnRail(
  railName: "moov" | "modern_treasury",
  request: SettlementPayoutRequest,
): Promise<SettlementPayoutResult> {
  return executOnRail(railName, request);
}

/* ---------- Logistics Threshold ---------- */

/** Logistics threshold: $50,000 notional in cents */
export const LOGISTICS_THRESHOLD_CENTS = 50_000_00; // 5,000,000 cents = $50k

/**
 * Determine which logistics carrier to route to based on notional value.
 *
 * @param notionalCents Total notional USD value in cents
 * @returns "easypost" for ≤$50k, "brinks" for >$50k
 */
export function routeLogistics(
  notionalCents: number,
): "easypost" | "brinks" {
  return notionalCents <= LOGISTICS_THRESHOLD_CENTS ? "easypost" : "brinks";
}
