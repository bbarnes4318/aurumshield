/* ================================================================
   WALLET RISK SERVICE — Crypto Settlement Rail Evaluation
   ================================================================
   Phase 3.2: Evaluates wallet risk for settlement Gate 5.

   EVALUATION RULES (sequential, fail-closed):
     1. FRESHNESS — screening must be < 24 hours old
     2. HARD-STOP — sanctions_exposure OR risk_tier = SEVERE
     3. HIGH RISK — risk_tier = HIGH → allowed with enhanced review
     4. PASS     — risk_tier = LOW or MEDIUM → allowed

   If the wallet has sanctions exposure or SEVERE risk, the owner
   subject is automatically flagged for EVENT_DRIVEN_REVIEW via
   a new compliance case.

   Exported for consumption by Gate 5 of the
   SettlementAuthorizationService.

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq, and, desc } from "drizzle-orm";
import {
  coWalletAddresses,
  coWalletScreenings,
  coSubjects,
  coCases,
  coPolicySnapshots,
  type CoWalletAddress,
  type CoWalletScreening,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";
import { generateEvidenceHash } from "./evidence-hashing";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

/**
 * Maximum age (in hours) of a wallet screening before it is
 * considered stale and must be re-triggered.
 *
 * Default: 24 hours. Configurable via WALLET_SCREENING_MAX_AGE_HOURS.
 */
const SCREENING_MAX_AGE_HOURS = parseInt(
  process.env.WALLET_SCREENING_MAX_AGE_HOURS || "24",
  10,
);

/**
 * Risk score threshold for HIGH risk. Scores above this value
 * with risk_tier = HIGH require enhanced due diligence.
 *
 * Default: 70.0. Configurable via WALLET_HIGH_RISK_THRESHOLD.
 */
const HIGH_RISK_SCORE_THRESHOLD = parseFloat(
  process.env.WALLET_HIGH_RISK_THRESHOLD || "70.0",
);

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export interface WalletEvaluationResult {
  allowed: boolean;
  walletAddress: string;
  chain: string;
  asset: string;
  ownerSubjectId: string;
  reason: string;
  riskTier: string;
  riskScore: string | null;
  sanctionsExposure: boolean;
  screeningId: string;
  screeningRef: string;
  screenedAt: string;
  screeningAgeHours: number;
  evaluationHash: string;
  flaggedForReview: boolean;
}

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

/**
 * Thrown when the most recent wallet screening is older than the
 * configured freshness threshold (default 24 hours).
 *
 * The caller MUST re-trigger a screening via Elliptic/Chainalysis
 * before retrying settlement.
 */
export class StaleScreeningError extends Error {
  public readonly walletAddress: string;
  public readonly screeningId: string;
  public readonly screenedAt: string;
  public readonly ageHours: number;
  public readonly maxAgeHours: number;

  constructor(
    walletAddress: string,
    screeningId: string,
    screenedAt: string,
    ageHours: number,
  ) {
    super(
      `STALE_SCREENING: Wallet ${walletAddress} last screened at ${screenedAt} ` +
        `(${ageHours.toFixed(1)}h ago). Exceeds ${SCREENING_MAX_AGE_HOURS}h freshness ` +
        `requirement. Re-trigger screening before settlement.`,
    );
    this.name = "StaleScreeningError";
    this.walletAddress = walletAddress;
    this.screeningId = screeningId;
    this.screenedAt = screenedAt;
    this.ageHours = ageHours;
    this.maxAgeHours = SCREENING_MAX_AGE_HOURS;
  }
}

/**
 * Thrown when no wallet address record is found for the given address.
 */
export class WalletNotFoundError extends Error {
  public readonly walletAddress: string;

  constructor(walletAddress: string) {
    super(
      `WALLET_NOT_FOUND: No registered wallet with address "${walletAddress}". ` +
        `Wallet must be registered and linked to a subject before settlement.`,
    );
    this.name = "WalletNotFoundError";
    this.walletAddress = walletAddress;
  }
}

/**
 * Thrown when no screening records exist for the wallet.
 */
export class NoScreeningFoundError extends Error {
  public readonly walletAddress: string;

  constructor(walletAddress: string) {
    super(
      `NO_SCREENING: Wallet ${walletAddress} has never been screened. ` +
        `Trigger an initial screening before settlement.`,
    );
    this.name = "NoScreeningFoundError";
    this.walletAddress = walletAddress;
  }
}

/**
 * Thrown when the wallet is not in ACTIVE status.
 */
export class WalletNotActiveError extends Error {
  public readonly walletAddress: string;
  public readonly currentStatus: string;

  constructor(walletAddress: string, currentStatus: string) {
    super(
      `WALLET_NOT_ACTIVE: Wallet ${walletAddress} has status "${currentStatus}" — ` +
        `must be "ACTIVE" for settlement.`,
    );
    this.name = "WalletNotActiveError";
    this.walletAddress = walletAddress;
    this.currentStatus = currentStatus;
  }
}

// ─── SERVICE FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Evaluate a wallet address for settlement readiness.
 *
 * EVALUATION PIPELINE:
 *   1. Look up wallet address record → verify registered and ACTIVE
 *   2. Fetch most recent screening → verify exists
 *   3. FRESHNESS RULE → screening must be < 24h old (StaleScreeningError)
 *   4. HARD-STOP RULE → sanctions_exposure OR SEVERE → block + flag
 *   5. HIGH RISK → allowed but flagged for enhanced review
 *   6. PASS → LOW or MEDIUM risk → allowed
 *
 * @param walletAddress   - The blockchain address to evaluate
 * @param expectedAmount  - The expected settlement amount (for audit)
 * @param userId          - The operator/system actor
 * @returns WalletEvaluationResult with allowed/denied and full context
 *
 * @throws WalletNotFoundError if wallet address not registered
 * @throws WalletNotActiveError if wallet is FROZEN/BLOCKED
 * @throws NoScreeningFoundError if wallet has never been screened
 * @throws StaleScreeningError if latest screening > 24h old
 */
export async function evaluateWalletForSettlement(
  walletAddress: string,
  expectedAmount: number,
  userId: string,
): Promise<WalletEvaluationResult> {
  const db = await getDb();

  // ── Step 1: Look up the wallet address record ──

  const [wallet] = await db
    .select()
    .from(coWalletAddresses)
    .where(eq(coWalletAddresses.address, walletAddress))
    .limit(1);

  if (!wallet) {
    throw new WalletNotFoundError(walletAddress);
  }

  if (wallet.status !== "ACTIVE") {
    throw new WalletNotActiveError(walletAddress, wallet.status);
  }

  // ── Step 2: Fetch the most recent screening ──

  const [latestScreening] = await db
    .select()
    .from(coWalletScreenings)
    .where(eq(coWalletScreenings.walletAddressId, wallet.id))
    .orderBy(desc(coWalletScreenings.screenedAt))
    .limit(1);

  if (!latestScreening) {
    throw new NoScreeningFoundError(walletAddress);
  }

  const screenedAtDate = new Date(latestScreening.screenedAt);
  const ageMs = Date.now() - screenedAtDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  // ── Step 3: FRESHNESS RULE ──

  if (ageHours > SCREENING_MAX_AGE_HOURS) {
    throw new StaleScreeningError(
      walletAddress,
      latestScreening.id,
      screenedAtDate.toISOString(),
      ageHours,
    );
  }

  // ── Step 4: HARD-STOP RULE — Sanctions / SEVERE ──

  const isSanctionsExposed = latestScreening.sanctionsExposure === true;
  const isSevere = latestScreening.riskTier === "SEVERE";

  if (isSanctionsExposed || isSevere) {
    // Auto-freeze the wallet
    await db
      .update(coWalletAddresses)
      .set({ status: "FROZEN" })
      .where(eq(coWalletAddresses.id, wallet.id));

    // Flag the owner subject for EVENT_DRIVEN_REVIEW
    await flagSubjectForReview(
      wallet.ownerSubjectId,
      walletAddress,
      latestScreening,
      userId,
    );

    const evaluationHash = generateEvidenceHash({
      walletAddress,
      screeningId: latestScreening.id,
      riskTier: latestScreening.riskTier,
      sanctionsExposure: latestScreening.sanctionsExposure,
      expectedAmount,
      decision: "BLOCKED",
      evaluatedAt: new Date().toISOString(),
    });

    console.error(
      `[WALLET] ⛔ BLOCKED: ${walletAddress} — ` +
        `sanctions_exposure=${isSanctionsExposed}, risk_tier=${latestScreening.riskTier}, ` +
        `owner=${wallet.ownerSubjectId} flagged for EVENT_DRIVEN_REVIEW`,
    );

    return {
      allowed: false,
      walletAddress,
      chain: wallet.chain,
      asset: wallet.asset,
      ownerSubjectId: wallet.ownerSubjectId,
      reason: isSanctionsExposed ? "ILLICIT_EXPOSURE" : "SEVERE_RISK",
      riskTier: latestScreening.riskTier,
      riskScore: latestScreening.riskScore,
      sanctionsExposure: isSanctionsExposed,
      screeningId: latestScreening.id,
      screeningRef: latestScreening.id,
      screenedAt: screenedAtDate.toISOString(),
      screeningAgeHours: ageHours,
      evaluationHash,
      flaggedForReview: true,
    };
  }

  // ── Step 5: HIGH RISK — Allowed with enhanced review flag ──

  const isHighRisk = latestScreening.riskTier === "HIGH";
  const riskScore = latestScreening.riskScore
    ? parseFloat(latestScreening.riskScore)
    : 0;

  if (isHighRisk || riskScore >= HIGH_RISK_SCORE_THRESHOLD) {
    const evaluationHash = generateEvidenceHash({
      walletAddress,
      screeningId: latestScreening.id,
      riskTier: latestScreening.riskTier,
      riskScore: latestScreening.riskScore,
      expectedAmount,
      decision: "ALLOWED_WITH_REVIEW",
      evaluatedAt: new Date().toISOString(),
    });

    console.log(
      `[WALLET] ⚠️ HIGH RISK (allowed): ${walletAddress} — ` +
        `risk_tier=${latestScreening.riskTier}, score=${latestScreening.riskScore}, ` +
        `amount=${expectedAmount}`,
    );

    return {
      allowed: true,
      walletAddress,
      chain: wallet.chain,
      asset: wallet.asset,
      ownerSubjectId: wallet.ownerSubjectId,
      reason: "ALLOWED_HIGH_RISK",
      riskTier: latestScreening.riskTier,
      riskScore: latestScreening.riskScore,
      sanctionsExposure: false,
      screeningId: latestScreening.id,
      screeningRef: latestScreening.id,
      screenedAt: screenedAtDate.toISOString(),
      screeningAgeHours: ageHours,
      evaluationHash,
      flaggedForReview: true,
    };
  }

  // ── Step 6: PASS — LOW or MEDIUM risk ──

  const evaluationHash = generateEvidenceHash({
    walletAddress,
    screeningId: latestScreening.id,
    riskTier: latestScreening.riskTier,
    riskScore: latestScreening.riskScore,
    expectedAmount,
    decision: "ALLOWED",
    evaluatedAt: new Date().toISOString(),
  });

  console.log(
    `[WALLET] ✅ PASSED: ${walletAddress} — ` +
      `risk_tier=${latestScreening.riskTier}, score=${latestScreening.riskScore}, ` +
      `amount=${expectedAmount}`,
  );

  return {
    allowed: true,
    walletAddress,
    chain: wallet.chain,
    asset: wallet.asset,
    ownerSubjectId: wallet.ownerSubjectId,
    reason: "ALLOWED",
    riskTier: latestScreening.riskTier,
    riskScore: latestScreening.riskScore,
    sanctionsExposure: false,
    screeningId: latestScreening.id,
    screeningRef: latestScreening.id,
    screenedAt: screenedAtDate.toISOString(),
    screeningAgeHours: ageHours,
    evaluationHash,
    flaggedForReview: false,
  };
}

// ─── INTERNAL HELPERS ──────────────────────────────────────────────────────────

/**
 * Flag a subject for EVENT_DRIVEN_REVIEW when their wallet is
 * blocked due to sanctions exposure or severe risk.
 *
 * Creates a new compliance case of type EVENT_DRIVEN_REVIEW with
 * high priority, and logs the action to the audit trail.
 */
async function flagSubjectForReview(
  subjectId: string,
  walletAddress: string,
  screening: CoWalletScreening,
  userId: string,
): Promise<void> {
  const db = await getDb();

  // Check if a review case already exists and is open
  const existingCases = await db
    .select()
    .from(coCases)
    .where(
      and(
        eq(coCases.subjectId, subjectId),
        eq(coCases.caseType, "EVENT_DRIVEN_REVIEW"),
        eq(coCases.status, "OPEN"),
      ),
    )
    .limit(1);

  if (existingCases.length > 0) {
    // Already flagged — do not duplicate
    console.log(
      `[WALLET] Subject ${subjectId} already has open EVENT_DRIVEN_REVIEW case ${existingCases[0].id}`,
    );
    return;
  }

  // Fetch latest policy snapshot for the case
  const [policySnapshot] = await db
    .select()
    .from(coPolicySnapshots)
    .orderBy(desc(coPolicySnapshots.effectiveAt))
    .limit(1);

  if (!policySnapshot) {
    console.error(
      `[WALLET] Cannot flag subject ${subjectId} — no policy snapshot found.`,
    );
    return;
  }

  // Create the EVENT_DRIVEN_REVIEW case
  const [reviewCase] = await db
    .insert(coCases)
    .values({
      subjectId,
      caseType: "EVENT_DRIVEN_REVIEW",
      status: "OPEN",
      priority: 100, // Highest priority — sanctions exposure
      policySnapshotId: policySnapshot.id,
      closedReason: null,
    })
    .returning();

  // Update subject status to signal review needed
  await db
    .update(coSubjects)
    .set({ status: "SUSPENDED" })
    .where(eq(coSubjects.id, subjectId));

  // Audit trail
  await appendEvent(
    "SUBJECT",
    subjectId,
    "COMPLIANCE_DECISION_RENDERED",
    {
      decisionId: reviewCase.id,
      caseId: reviewCase.id,
      subjectId,
      decisionType: "INTERIM" as const,
      decision: "EVENT_DRIVEN_REVIEW_TRIGGERED",
      reasonCodes: [
        `WALLET_${screening.riskTier}_RISK`,
        screening.sanctionsExposure ? "SANCTIONS_EXPOSURE" : "NO_SANCTIONS",
        `WALLET_ADDRESS_${walletAddress}`,
      ],
      decisionHash: generateEvidenceHash({
        subjectId,
        walletAddress,
        screeningId: screening.id,
        riskTier: screening.riskTier,
        sanctionsExposure: screening.sanctionsExposure,
        triggeredAt: new Date().toISOString(),
      }),
    },
    userId,
  );

  console.log(
    `[WALLET] Created EVENT_DRIVEN_REVIEW case ${reviewCase.id} for subject ${subjectId} ` +
      `(wallet=${walletAddress}, risk=${screening.riskTier})`,
  );
}

// ─── QUERY HELPERS ─────────────────────────────────────────────────────────────

/**
 * Get all wallet addresses for a subject.
 */
export async function getWalletsBySubject(
  subjectId: string,
): Promise<CoWalletAddress[]> {
  const db = await getDb();
  return db
    .select()
    .from(coWalletAddresses)
    .where(eq(coWalletAddresses.ownerSubjectId, subjectId));
}

/**
 * Get the most recent screening for a wallet address.
 */
export async function getLatestScreening(
  walletAddressId: string,
): Promise<CoWalletScreening | null> {
  const db = await getDb();
  const [screening] = await db
    .select()
    .from(coWalletScreenings)
    .where(eq(coWalletScreenings.walletAddressId, walletAddressId))
    .orderBy(desc(coWalletScreenings.screenedAt))
    .limit(1);
  return screening ?? null;
}

/**
 * Get all screenings for a wallet address, ordered by most recent first.
 */
export async function getScreeningHistory(
  walletAddressId: string,
): Promise<CoWalletScreening[]> {
  const db = await getDb();
  return db
    .select()
    .from(coWalletScreenings)
    .where(eq(coWalletScreenings.walletAddressId, walletAddressId))
    .orderBy(desc(coWalletScreenings.screenedAt));
}
