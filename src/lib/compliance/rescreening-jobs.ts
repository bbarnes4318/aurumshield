/* ================================================================
   PERIODIC RE-SCREENING JOB SCAFFOLD
   ================================================================
   Phase WS5.2: Background job entry point for periodic compliance
   re-screening and stale-check detection.

   PRODUCTION WIRING:
     This module exports pure async functions that should be triggered
     by your job scheduler of choice:
       - AWS Lambda + EventBridge (scheduled rule)
       - Vercel Cron (vercel.json cron config)
       - BullMQ / pg-boss (worker queue)
       - Simple cron (node-cron, crontab)

     The functions are scheduler-agnostic. They accept no HTTP-specific
     inputs and return structured results for logging.

   JOB TYPES:
     1. runStaleCheckSweep()
        Scans all ACTIVE subjects. For each subject, evaluates check
        freshness. Marks expired checks and opens PERIODIC_REVIEW
        cases where policy requires.

     2. runSanctionsRefresh()
        Re-screens all ACTIVE subjects whose SANCTIONS/PEP checks
        are approaching expiry (within 30 days).

   SCHEDULE RECOMMENDATIONS:
     - staleCheckSweep:   daily at 02:00 UTC
     - sanctionsRefresh:  weekly on Mondays at 03:00 UTC

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq, and, desc, inArray } from "drizzle-orm";
import { coSubjects, coCases, coChecks, coPolicySnapshots } from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";
import { evaluateSubjectCheckFreshness } from "./check-freshness-service";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export interface SweepResult {
  jobType: string;
  startedAt: string;
  completedAt: string;
  subjectsScanned: number;
  subjectsWithExpiredChecks: number;
  totalChecksMarkedExpired: number;
  casesOpened: number;
  errors: SweepError[];
}

export interface SweepError {
  subjectId: string;
  error: string;
}

export interface RefreshResult {
  jobType: string;
  startedAt: string;
  completedAt: string;
  subjectsEvaluated: number;
  checksApproachingExpiry: number;
  reScreeningsTriggered: number;
  errors: SweepError[];
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

/**
 * Check types that require periodic re-screening — these are the
 * high-risk screening types where stale data is dangerous.
 */
const HIGH_RISK_RESCREEN_TYPES = [
  "SANCTIONS",
  "PEP",
  "ADVERSE_MEDIA",
  "SANCTIONS_ORIGIN",
] as const;

/**
 * Days before expiry at which a re-screening should be proactively triggered.
 * Default: 30 days before TTL expires.
 */
const RESCREEN_BUFFER_DAYS = parseInt(
  process.env.RESCREEN_BUFFER_DAYS || "30",
  10,
);

// ─── JOB 1: STALE CHECK SWEEP ─────────────────────────────────────────────────

/**
 * Scan all ACTIVE subjects and evaluate check freshness.
 *
 * For each subject with expired checks:
 *   1. Mark expired checks with EXPIRED verdict (via check-freshness-service)
 *   2. Open a PERIODIC_REVIEW case if one doesn't already exist
 *   3. Log STALE_CHECK_SWEEP audit event
 *
 * @param userId - The system actor (e.g., "system-cron")
 * @returns SweepResult with statistics
 */
export async function runStaleCheckSweep(
  userId: string = "system-cron",
): Promise<SweepResult> {
  const startedAt = new Date().toISOString();
  const db = await getDb();
  const errors: SweepError[] = [];
  let casesOpened = 0;
  let totalChecksMarkedExpired = 0;
  let subjectsWithExpiredChecks = 0;

  // Fetch all ACTIVE subjects
  const subjects = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.status, "ACTIVE"));

  for (const subject of subjects) {
    try {
      const report = await evaluateSubjectCheckFreshness(subject.id, userId);

      if (report.hasExpiredChecks) {
        subjectsWithExpiredChecks++;
        totalChecksMarkedExpired += report.checksMarkedExpired;

        // Check if a PERIODIC_REVIEW case already exists and is open
        const existingCases = await db
          .select()
          .from(coCases)
          .where(
            and(
              eq(coCases.subjectId, subject.id),
              eq(coCases.caseType, "PERIODIC_REVIEW"),
              inArray(coCases.status, [
                "DRAFT",
                "OPEN",
                "AWAITING_SUBJECT",
                "AWAITING_PROVIDER",
                "AWAITING_INTERNAL_REVIEW",
                "ESCALATED",
              ]),
            ),
          );

        if (existingCases.length === 0) {
          // Open a new PERIODIC_REVIEW case
          const [policySnapshot] = await db
            .select()
            .from(coPolicySnapshots)
            .orderBy(desc(coPolicySnapshots.effectiveAt))
            .limit(1);

          if (policySnapshot) {
            await db.insert(coCases).values({
              subjectId: subject.id,
              caseType: "PERIODIC_REVIEW",
              status: "OPEN",
              priority: 60, // Medium — periodic, not emergency
              policySnapshotId: policySnapshot.id,
              closedReason: null,
            });

            casesOpened++;

            await appendEvent(
              "COMPLIANCE_SUBJECT",
              subject.id,
              "PERIODIC_REVIEW_OPENED",
              {
                subjectId: subject.id,
                subjectName: subject.legalName,
                expiredCheckTypes: report.expiredChecks.map((c) => c.checkType),
                expiredCount: report.expiredChecks.length,
                reason: "Stale check sweep detected expired checks",
              },
              userId,
            );

            console.log(
              `[RE-SCREENING] 📋 PERIODIC_REVIEW opened: subject="${subject.legalName}", ` +
                `expired=[${report.expiredChecks.map((c) => c.checkType).join(",")}]`,
            );
          }
        }
      }
    } catch (err) {
      errors.push({
        subjectId: subject.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const completedAt = new Date().toISOString();

  // Audit the sweep itself
  await appendEvent(
    "SYSTEM",
    "stale-check-sweep",
    "STALE_CHECK_SWEEP_COMPLETED",
    {
      startedAt,
      completedAt,
      subjectsScanned: subjects.length,
      subjectsWithExpiredChecks,
      totalChecksMarkedExpired,
      casesOpened,
      errorCount: errors.length,
    },
    userId,
  );

  return {
    jobType: "STALE_CHECK_SWEEP",
    startedAt,
    completedAt,
    subjectsScanned: subjects.length,
    subjectsWithExpiredChecks,
    totalChecksMarkedExpired,
    casesOpened,
    errors,
  };
}

// ─── JOB 2: SANCTIONS REFRESH ─────────────────────────────────────────────────

/**
 * Proactively identify subjects whose high-risk checks are
 * approaching expiry and flag them for re-screening.
 *
 * This job runs BEFORE checks expire to ensure continuous coverage.
 * It opens PERIODIC_REVIEW cases for subjects whose SANCTIONS,
 * PEP, or ADVERSE_MEDIA checks will expire within RESCREEN_BUFFER_DAYS.
 *
 * @param userId - The system actor
 * @returns RefreshResult with statistics
 */
export async function runSanctionsRefresh(
  userId: string = "system-cron",
): Promise<RefreshResult> {
  const startedAt = new Date().toISOString();
  const db = await getDb();
  const errors: SweepError[] = [];
  let checksApproachingExpiry = 0;
  let reScreeningsTriggered = 0;

  // Fetch all ACTIVE subjects
  const subjects = await db
    .select()
    .from(coSubjects)
    .where(eq(coSubjects.status, "ACTIVE"));

  for (const subject of subjects) {
    try {
      // Check for approaching-expiry on high-risk check types
      const cases = await db
        .select()
        .from(coCases)
        .where(eq(coCases.subjectId, subject.id));

      if (cases.length === 0) continue;

      const caseIds = cases.map((c) => c.id);
      const checks = await db
        .select()
        .from(coChecks)
        .where(
          and(
            inArray(coChecks.caseId, caseIds),
            inArray(coChecks.checkType, [...HIGH_RISK_RESCREEN_TYPES]),
            eq(coChecks.status, "COMPLETED"),
          ),
        );

      const now = new Date();
      let hasApproachingExpiry = false;

      for (const check of checks) {
        if (!check.completedAt || check.normalizedVerdict === "EXPIRED") continue;

        const ageMs = now.getTime() - new Date(check.completedAt).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        // For SANCTIONS/PEP: TTL is 180 days
        const ttlDays = 180;
        const daysUntilExpiry = ttlDays - ageDays;

        if (daysUntilExpiry <= RESCREEN_BUFFER_DAYS && daysUntilExpiry > 0) {
          checksApproachingExpiry++;
          hasApproachingExpiry = true;
        }
      }

      if (hasApproachingExpiry) {
        // Check if PERIODIC_REVIEW already exists
        const existingReview = await db
          .select()
          .from(coCases)
          .where(
            and(
              eq(coCases.subjectId, subject.id),
              eq(coCases.caseType, "PERIODIC_REVIEW"),
              inArray(coCases.status, ["DRAFT", "OPEN", "AWAITING_INTERNAL_REVIEW"]),
            ),
          );

        if (existingReview.length === 0) {
          const [policySnapshot] = await db
            .select()
            .from(coPolicySnapshots)
            .orderBy(desc(coPolicySnapshots.effectiveAt))
            .limit(1);

          if (policySnapshot) {
            await db.insert(coCases).values({
              subjectId: subject.id,
              caseType: "PERIODIC_REVIEW",
              status: "OPEN",
              priority: 50, // Proactive — not yet expired
              policySnapshotId: policySnapshot.id,
              closedReason: null,
            });

            reScreeningsTriggered++;

            await appendEvent(
              "COMPLIANCE_SUBJECT",
              subject.id,
              "PROACTIVE_RESCREEN_TRIGGERED",
              {
                subjectId: subject.id,
                subjectName: subject.legalName,
                reason: "High-risk checks approaching expiry",
                bufferDays: RESCREEN_BUFFER_DAYS,
              },
              userId,
            );
          }
        }
      }
    } catch (err) {
      errors.push({
        subjectId: subject.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const completedAt = new Date().toISOString();

  await appendEvent(
    "SYSTEM",
    "sanctions-refresh",
    "SANCTIONS_REFRESH_COMPLETED",
    {
      startedAt,
      completedAt,
      subjectsEvaluated: subjects.length,
      checksApproachingExpiry,
      reScreeningsTriggered,
      errorCount: errors.length,
    },
    userId,
  );

  return {
    jobType: "SANCTIONS_REFRESH",
    startedAt,
    completedAt,
    subjectsEvaluated: subjects.length,
    checksApproachingExpiry,
    reScreeningsTriggered,
    errors,
  };
}
