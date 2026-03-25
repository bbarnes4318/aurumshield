/* ================================================================
   WALLET COMPLIANCE STATUS — Read-Only Query Service
   ================================================================
   Returns the authoritative compliance state of a wallet address
   by querying co_wallet_addresses and co_wallet_screenings.

   This is a QUERY-ONLY service — it does NOT:
     - Freeze wallets
     - Create compliance cases
     - Trigger screenings
     - Modify any database state

   Designed for consumption by:
     - evaluateFundingReadiness() (funding stage gate)
     - Institutional UI (wallet screening truth display)
     - Future pre-settlement readiness checks

   Reuses SCREENING_MAX_AGE_HOURS from wallet-risk-service constants.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq, desc } from "drizzle-orm";
import {
  coWalletAddresses,
  coWalletScreenings,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

/**
 * Maximum age (in hours) of a wallet screening before it is
 * considered stale. Matches wallet-risk-service constant.
 */
const SCREENING_MAX_AGE_HOURS = parseInt(
  process.env.WALLET_SCREENING_MAX_AGE_HOURS || "24",
  10,
);

// ─── TYPES ─────────────────────────────────────────────────────────────────────

/**
 * Authoritative wallet screening truth — represents the
 * compliance state of a wallet address at query time.
 *
 * Ordered from most-blocking to least-blocking.
 */
export type WalletScreeningTruth =
  | "NOT_REGISTERED"        // Wallet not in co_wallet_addresses
  | "WALLET_FROZEN"         // Wallet status = FROZEN
  | "WALLET_BLOCKED"        // Wallet status = BLOCKED
  | "WALLET_PENDING_REVIEW" // Wallet status = PENDING_REVIEW
  | "NEVER_SCREENED"        // Wallet registered but zero screenings
  | "SCREENING_STALE"       // Latest screening > SCREENING_MAX_AGE_HOURS old
  | "SANCTIONS_FLAGGED"     // Latest screening shows sanctions exposure
  | "RISK_SEVERE"           // Latest screening risk_tier = SEVERE
  | "RISK_HIGH"             // Latest screening risk_tier = HIGH (allowed with review)
  | "SCREENING_CURRENT";    // Latest screening is fresh + LOW/MEDIUM risk

/**
 * Full wallet compliance status with context.
 */
export interface WalletComplianceStatus {
  /** The wallet address that was queried. */
  walletAddress: string;
  /** The authoritative screening truth. */
  truth: WalletScreeningTruth;
  /** Whether this state is a hard compliance blocker. */
  isHardBlocker: boolean;
  /** Whether this state represents a warning (not blocking, but not clean). */
  isWarning: boolean;
  /** Human-readable explanation of the current state. */
  detail: string;
  /** Wallet address record ID, if registered. */
  walletRecordId: string | null;
  /** Most recent screening ID, if any. */
  latestScreeningId: string | null;
  /** Most recent screening timestamp, if any. */
  screenedAt: string | null;
  /** Screening age in hours, if a screening exists. */
  screeningAgeHours: number | null;
  /** Risk tier from latest screening, if any. */
  riskTier: string | null;
  /** Sanctions exposure flag from latest screening. */
  sanctionsExposure: boolean | null;
  /** Query timestamp. */
  evaluatedAt: string;
}

// ─── HARD-BLOCKER STATES ───────────────────────────────────────────────────────

const HARD_BLOCKER_STATES: ReadonlySet<WalletScreeningTruth> = new Set([
  "SANCTIONS_FLAGGED",
  "RISK_SEVERE",
  "WALLET_FROZEN",
  "WALLET_BLOCKED",
]);

const WARNING_STATES: ReadonlySet<WalletScreeningTruth> = new Set([
  "NOT_REGISTERED",
  "NEVER_SCREENED",
  "SCREENING_STALE",
  "WALLET_PENDING_REVIEW",
  "RISK_HIGH",
]);

// ─── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * Query the authoritative compliance state of a wallet address.
 *
 * EVALUATION PIPELINE (sequential):
 *   1. Look up co_wallet_addresses by address string
 *   2. If not found → NOT_REGISTERED
 *   3. If found but status ≠ ACTIVE → WALLET_FROZEN / WALLET_BLOCKED / WALLET_PENDING_REVIEW
 *   4. Fetch most recent co_wallet_screenings
 *   5. If no screening → NEVER_SCREENED
 *   6. If screening > SCREENING_MAX_AGE_HOURS old → SCREENING_STALE
 *   7. If sanctions_exposure = true → SANCTIONS_FLAGGED
 *   8. If risk_tier = SEVERE → RISK_SEVERE
 *   9. If risk_tier = HIGH → RISK_HIGH (warning, not blocker)
 *  10. Otherwise → SCREENING_CURRENT
 *
 * @param walletAddress - The blockchain address to query
 * @returns WalletComplianceStatus with full context
 */
export async function getWalletComplianceStatus(
  walletAddress: string,
): Promise<WalletComplianceStatus> {
  const db = await getDb();
  const evaluatedAt = new Date().toISOString();

  // ── Step 1-2: Look up wallet address record ──

  const [wallet] = await db
    .select()
    .from(coWalletAddresses)
    .where(eq(coWalletAddresses.address, walletAddress.trim()))
    .limit(1);

  if (!wallet) {
    return buildStatus(walletAddress, "NOT_REGISTERED", {
      detail: `Wallet address "${walletAddress}" is not registered in the compliance system. It will be registered and screened when the Elliptic KYT pipeline processes it.`,
      evaluatedAt,
    });
  }

  // ── Step 3: Check wallet status ──

  if (wallet.status === "FROZEN") {
    return buildStatus(walletAddress, "WALLET_FROZEN", {
      detail: `Wallet has been FROZEN due to a previous compliance action. Contact compliance for remediation.`,
      walletRecordId: wallet.id,
      evaluatedAt,
    });
  }

  if (wallet.status === "BLOCKED") {
    return buildStatus(walletAddress, "WALLET_BLOCKED", {
      detail: `Wallet is permanently BLOCKED. This address cannot be used for settlement.`,
      walletRecordId: wallet.id,
      evaluatedAt,
    });
  }

  if (wallet.status === "PENDING_REVIEW") {
    return buildStatus(walletAddress, "WALLET_PENDING_REVIEW", {
      detail: `Wallet is under compliance review. Screening must complete before this wallet can be used.`,
      walletRecordId: wallet.id,
      evaluatedAt,
    });
  }

  // ── Step 4-5: Fetch most recent screening ──

  const [latestScreening] = await db
    .select()
    .from(coWalletScreenings)
    .where(eq(coWalletScreenings.walletAddressId, wallet.id))
    .orderBy(desc(coWalletScreenings.screenedAt))
    .limit(1);

  if (!latestScreening) {
    return buildStatus(walletAddress, "NEVER_SCREENED", {
      detail: `Wallet is registered but has never been screened. An initial Elliptic KYT screening is required before settlement.`,
      walletRecordId: wallet.id,
      evaluatedAt,
    });
  }

  // ── Step 6: Freshness check ──

  const screenedAtDate = new Date(latestScreening.screenedAt);
  const ageMs = Date.now() - screenedAtDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  const screeningContext = {
    walletRecordId: wallet.id,
    latestScreeningId: latestScreening.id,
    screenedAt: screenedAtDate.toISOString(),
    screeningAgeHours: Math.round(ageHours * 10) / 10,
    riskTier: latestScreening.riskTier,
    sanctionsExposure: latestScreening.sanctionsExposure,
    evaluatedAt,
  };

  if (ageHours > SCREENING_MAX_AGE_HOURS) {
    return buildStatus(walletAddress, "SCREENING_STALE", {
      ...screeningContext,
      detail: `Latest screening is ${Math.round(ageHours)}h old (max: ${SCREENING_MAX_AGE_HOURS}h). A fresh screening is required before settlement.`,
    });
  }

  // ── Step 7: Sanctions check ──

  if (latestScreening.sanctionsExposure === true) {
    return buildStatus(walletAddress, "SANCTIONS_FLAGGED", {
      ...screeningContext,
      detail: `Wallet has active sanctions exposure. This address is BLOCKED from settlement.`,
    });
  }

  // ── Step 8: SEVERE risk ──

  if (latestScreening.riskTier === "SEVERE") {
    return buildStatus(walletAddress, "RISK_SEVERE", {
      ...screeningContext,
      detail: `Wallet risk tier is SEVERE. This address is BLOCKED from settlement.`,
    });
  }

  // ── Step 9: HIGH risk (warning, not blocker) ──

  if (latestScreening.riskTier === "HIGH") {
    return buildStatus(walletAddress, "RISK_HIGH", {
      ...screeningContext,
      detail: `Wallet risk tier is HIGH. Settlement allowed with enhanced due diligence review.`,
    });
  }

  // ── Step 10: PASS ──

  return buildStatus(walletAddress, "SCREENING_CURRENT", {
    ...screeningContext,
    detail: `Wallet screening is current. Risk tier: ${latestScreening.riskTier}. No sanctions exposure.`,
  });
}

// ─── INTERNAL HELPERS ──────────────────────────────────────────────────────────

interface StatusOverrides {
  detail: string;
  walletRecordId?: string;
  latestScreeningId?: string;
  screenedAt?: string;
  screeningAgeHours?: number;
  riskTier?: string;
  sanctionsExposure?: boolean;
  evaluatedAt: string;
}

function buildStatus(
  walletAddress: string,
  truth: WalletScreeningTruth,
  overrides: StatusOverrides,
): WalletComplianceStatus {
  return {
    walletAddress,
    truth,
    isHardBlocker: HARD_BLOCKER_STATES.has(truth),
    isWarning: WARNING_STATES.has(truth),
    detail: overrides.detail,
    walletRecordId: overrides.walletRecordId ?? null,
    latestScreeningId: overrides.latestScreeningId ?? null,
    screenedAt: overrides.screenedAt ?? null,
    screeningAgeHours: overrides.screeningAgeHours ?? null,
    riskTier: overrides.riskTier ?? null,
    sanctionsExposure: overrides.sanctionsExposure ?? null,
    evaluatedAt: overrides.evaluatedAt,
  };
}

// ─── PURE HELPER (testable without DB) ─────────────────────────────────────────

/**
 * Derive WalletScreeningTruth from raw wallet + screening data.
 * This is the PURE function used internally — exported for unit testing.
 *
 * @param wallet  - Wallet record or null
 * @param screening - Latest screening record or null
 * @param now - Current timestamp for freshness calculation
 */
export function deriveWalletScreeningTruth(
  wallet: { status: string } | null,
  screening: {
    screenedAt: Date | string;
    sanctionsExposure: boolean;
    riskTier: string;
  } | null,
  now: Date = new Date(),
): WalletScreeningTruth {
  if (!wallet) return "NOT_REGISTERED";

  if (wallet.status === "FROZEN") return "WALLET_FROZEN";
  if (wallet.status === "BLOCKED") return "WALLET_BLOCKED";
  if (wallet.status === "PENDING_REVIEW") return "WALLET_PENDING_REVIEW";

  if (!screening) return "NEVER_SCREENED";

  const screenedAt = screening.screenedAt instanceof Date
    ? screening.screenedAt
    : new Date(screening.screenedAt);
  const ageHours = (now.getTime() - screenedAt.getTime()) / (1000 * 60 * 60);

  if (ageHours > SCREENING_MAX_AGE_HOURS) return "SCREENING_STALE";
  if (screening.sanctionsExposure === true) return "SANCTIONS_FLAGGED";
  if (screening.riskTier === "SEVERE") return "RISK_SEVERE";
  if (screening.riskTier === "HIGH") return "RISK_HIGH";

  return "SCREENING_CURRENT";
}

/**
 * Check if a WalletScreeningTruth represents a hard compliance blocker.
 */
export function isWalletHardBlocker(truth: WalletScreeningTruth): boolean {
  return HARD_BLOCKER_STATES.has(truth);
}

/**
 * Check if a WalletScreeningTruth represents a warning state.
 */
export function isWalletWarning(truth: WalletScreeningTruth): boolean {
  return WARNING_STATES.has(truth);
}
