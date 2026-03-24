/* ================================================================
   CHECK FRESHNESS SERVICE — TTL Gating for Compliance Checks
   ================================================================
   Phase WS5.1: Enforces time-based freshness requirements for
   all non-wallet compliance checks.

   CHECK TTL MATRIX (configurable via env or policy snapshot):
     SANCTIONS         → 180 days  (re-screen every 6 months)
     PEP               → 180 days
     ADVERSE_MEDIA     → 180 days
     KYC_ID            → 365 days  (annual re-verification)
     KYB_REGISTRATION  → 365 days
     UBO               → 365 days
     LEI               → 365 days
     LIVENESS          → 730 days  (biennial)
     SOURCE_OF_FUNDS   → 365 days
     SOURCE_OF_WEALTH  → 365 days
     PROOF_OF_ADDRESS  → 365 days
     WALLET_KYT        → 1 day    (existing — wallet-risk-service handles)

   EVALUATION RULES (fail-closed, server-authoritative):
     1. If a check has no completedAt → treated as PENDING (not stale)
     2. If completedAt + TTL < now → check is EXPIRED
     3. Expired checks cause the decision engine to treat them as MISSING
     4. The decision engine already handles EXPIRED verdict (Phase 3.1)

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq, and, inArray } from "drizzle-orm";
import { coChecks, coCases, type CoCheck } from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";

// ─── CHECK TTL CONSTANTS (days) ────────────────────────────────────────────────

/**
 * Default TTL for each check type in DAYS.
 * These are the maximum allowed age for a check before it is
 * considered expired and must be re-performed.
 *
 * Override with env: CHECK_TTL_<TYPE>_DAYS (e.g. CHECK_TTL_SANCTIONS_DAYS=90)
 */
const DEFAULT_CHECK_TTL_DAYS: Record<string, number> = {
  SANCTIONS:             180,
  PEP:                   180,
  ADVERSE_MEDIA:         180,
  KYC_ID:                365,
  KYB_REGISTRATION:      365,
  UBO:                   365,
  LEI:                   365,
  LIVENESS:              730,
  SOURCE_OF_FUNDS:       365,
  SOURCE_OF_WEALTH:      365,
  PROOF_OF_ADDRESS:      365,
  AUTHORIZED_SIGNATORY:  365,
  TRAINING_COMPLETION:   365,
  // Physical checks — no TTL (single-use per shipment/lot)
  CHAIN_OF_CUSTODY:      0,
  TRANSPORT_INTEGRITY:   0,
  SANCTIONS_ORIGIN:      180,
  REFINERY_ELIGIBILITY:  365,
  REFINERY_LOT_MATCH:    0,
  REFINERY_ASSAY_CONFIRMATION: 0,
  // Wallet KYT handled by wallet-risk-service (1 day)
  WALLET_KYT:            1,
  // Basic identity — no TTL (validated once)
  EMAIL:                 0,
  PHONE:                 0,
};

/**
 * Resolve the TTL in days for a check type, with env override support.
 */
function getTTLDays(checkType: string): number {
  const envKey = `CHECK_TTL_${checkType}_DAYS`;
  const envVal = process.env[envKey];
  if (envVal && !isNaN(parseInt(envVal, 10))) {
    return parseInt(envVal, 10);
  }
  return DEFAULT_CHECK_TTL_DAYS[checkType] ?? 365; // Default: 1 year
}

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export interface CheckFreshnessResult {
  checkId: string;
  checkType: string;
  isExpired: boolean;
  completedAt: string | null;
  ageHours: number | null;
  ttlDays: number;
  ttlHours: number;
  expiresAt: string | null;
}

export interface SubjectFreshnessReport {
  subjectId: string;
  totalChecksEvaluated: number;
  expiredChecks: CheckFreshnessResult[];
  validChecks: CheckFreshnessResult[];
  hasExpiredChecks: boolean;
  checksMarkedExpired: number;
  evaluatedAt: string;
}

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

export class StaleChecksDetectedError extends Error {
  public readonly subjectId: string;
  public readonly expiredCheckTypes: string[];
  public readonly expiredCount: number;

  constructor(subjectId: string, expiredCheckTypes: string[]) {
    super(
      `STALE_CHECKS: Subject ${subjectId} has ${expiredCheckTypes.length} expired ` +
        `check(s): [${expiredCheckTypes.join(", ")}]. Re-screening required.`,
    );
    this.name = "StaleChecksDetectedError";
    this.subjectId = subjectId;
    this.expiredCheckTypes = expiredCheckTypes;
    this.expiredCount = expiredCheckTypes.length;
  }
}

// ─── SERVICE FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Evaluate the freshness of a single compliance check.
 *
 * @param check - The compliance check record from co_checks
 * @param now   - Current timestamp (defaults to now)
 * @returns CheckFreshnessResult with expiry status
 */
export function evaluateCheckFreshness(
  check: Pick<CoCheck, "id" | "checkType" | "completedAt">,
  now: Date = new Date(),
): CheckFreshnessResult {
  const ttlDays = getTTLDays(check.checkType);
  const ttlHours = ttlDays * 24;

  // TTL of 0 means no expiry (single-use or perpetual)
  if (ttlDays === 0) {
    return {
      checkId: check.id,
      checkType: check.checkType,
      isExpired: false,
      completedAt: check.completedAt?.toISOString() ?? null,
      ageHours: null,
      ttlDays,
      ttlHours,
      expiresAt: null,
    };
  }

  // No completedAt → still pending, not expired
  if (!check.completedAt) {
    return {
      checkId: check.id,
      checkType: check.checkType,
      isExpired: false,
      completedAt: null,
      ageHours: null,
      ttlDays,
      ttlHours,
      expiresAt: null,
    };
  }

  const completedAt = new Date(check.completedAt);
  const ageMs = now.getTime() - completedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const expiresAt = new Date(completedAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  const isExpired = ageHours > ttlHours;

  return {
    checkId: check.id,
    checkType: check.checkType,
    isExpired,
    completedAt: check.completedAt.toISOString(),
    ageHours: Math.round(ageHours * 10) / 10,
    ttlDays,
    ttlHours,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Evaluate freshness for ALL completed checks on a subject's most recent case.
 *
 * For each expired check:
 *   - Updates normalizedVerdict to EXPIRED in co_checks
 *   - Logs CHECK_EXPIRED audit event
 *
 * @param subjectId - UUID of the compliance subject
 * @param userId    - The system/operator actor
 * @returns SubjectFreshnessReport with expired vs valid breakdown
 */
export async function evaluateSubjectCheckFreshness(
  subjectId: string,
  userId: string,
): Promise<SubjectFreshnessReport> {
  const db = await getDb();
  const now = new Date();
  const evaluatedAt = now.toISOString();

  // Fetch all completed checks for this subject's cases
  const cases = await db
    .select()
    .from(coCases)
    .where(eq(coCases.subjectId, subjectId));

  if (cases.length === 0) {
    return {
      subjectId,
      totalChecksEvaluated: 0,
      expiredChecks: [],
      validChecks: [],
      hasExpiredChecks: false,
      checksMarkedExpired: 0,
      evaluatedAt,
    };
  }

  const caseIds = cases.map((c) => c.id);

  const checks = await db
    .select()
    .from(coChecks)
    .where(
      and(
        inArray(coChecks.caseId, caseIds),
        eq(coChecks.status, "COMPLETED"),
      ),
    );

  const expiredChecks: CheckFreshnessResult[] = [];
  const validChecks: CheckFreshnessResult[] = [];
  let checksMarkedExpired = 0;

  for (const check of checks) {
    // Skip checks already marked EXPIRED
    if (check.normalizedVerdict === "EXPIRED") {
      const result = evaluateCheckFreshness(check, now);
      expiredChecks.push(result);
      continue;
    }

    const result = evaluateCheckFreshness(check, now);

    if (result.isExpired) {
      expiredChecks.push(result);

      // Mark the check as EXPIRED in the database
      await db
        .update(coChecks)
        .set({
          normalizedVerdict: "EXPIRED",
          updatedAt: now,
        })
        .where(eq(coChecks.id, check.id));

      checksMarkedExpired++;

      // Audit event
      await appendEvent(
        "COMPLIANCE_CHECK",
        check.id,
        "CHECK_EXPIRED",
        {
          checkId: check.id,
          checkType: check.checkType,
          subjectId,
          completedAt: check.completedAt?.toISOString(),
          ageHours: result.ageHours,
          ttlDays: result.ttlDays,
          expiresAt: result.expiresAt,
          previousVerdict: check.normalizedVerdict,
          newVerdict: "EXPIRED",
        },
        userId,
      );

      console.warn(
        `[CHECK_FRESHNESS] ⏰ EXPIRED: check=${check.id}, type=${check.checkType}, ` +
          `subject=${subjectId}, age=${result.ageHours}h (TTL=${result.ttlHours}h)`,
      );
    } else {
      validChecks.push(result);
    }
  }

  return {
    subjectId,
    totalChecksEvaluated: checks.length,
    expiredChecks,
    validChecks,
    hasExpiredChecks: expiredChecks.length > 0,
    checksMarkedExpired,
    evaluatedAt,
  };
}
