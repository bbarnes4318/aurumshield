/* ================================================================
   REAL DB-BACKED INTEGRATION TEST: Check Freshness / Expiry
   ================================================================
   Validates that the check-freshness-service correctly identifies
   and marks expired checks in the real database.

   Tests:
     1. Stale SANCTIONS check (200d, TTL=180d) → EXPIRED verdict
     2. Stale KYC_ID check (400d, TTL=365d) → EXPIRED verdict
     3. EMAIL check (500d, TTL=0) → NOT expired
     4. Audit event written for CHECK_EXPIRED
     5. Already-expired checks are not re-processed
   ================================================================ */

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  setupTestDb,
  getTestDb,
  resetTestDb,
  teardownTestDb,
  seedStaleChecksScenario,
} from "./db-harness";
import { coChecks, coAuditEvents } from "@/db/schema/compliance";

beforeAll(async () => {
  await setupTestDb();
});

afterEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("Check Freshness Persistence — Real DB", () => {
  it("marks expired SANCTIONS check (200d > 180d TTL) with EXPIRED verdict", async () => {
    const scenario = await seedStaleChecksScenario();

    const { evaluateSubjectCheckFreshness } = await import(
      "@/lib/compliance/check-freshness-service"
    );

    const report = await evaluateSubjectCheckFreshness(
      scenario.subjectId,
      "system-test",
    );

    expect(report.hasExpiredChecks).toBe(true);
    expect(report.checksMarkedExpired).toBeGreaterThanOrEqual(1);

    // Verify the SANCTIONS check is now EXPIRED in the DB
    const db = getTestDb();
    const [sanctionsCheck] = await db
      .select()
      .from(coChecks)
      .where(eq(coChecks.id, scenario.sanctionsCheckId))
      .limit(1);

    expect(sanctionsCheck.normalizedVerdict).toBe("EXPIRED");
  });

  it("marks expired KYC_ID check (400d > 365d TTL) with EXPIRED verdict", async () => {
    const scenario = await seedStaleChecksScenario();

    const { evaluateSubjectCheckFreshness } = await import(
      "@/lib/compliance/check-freshness-service"
    );

    const report = await evaluateSubjectCheckFreshness(
      scenario.subjectId,
      "system-test",
    );

    // Verify the KYC_ID check is EXPIRED in the DB
    const db = getTestDb();
    const [kycCheck] = await db
      .select()
      .from(coChecks)
      .where(eq(coChecks.id, scenario.kycCheckId))
      .limit(1);

    expect(kycCheck.normalizedVerdict).toBe("EXPIRED");

    // Both SANCTIONS and KYC_ID should be expired
    expect(report.expiredChecks.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT expire EMAIL check (TTL=0, never expires)", async () => {
    const scenario = await seedStaleChecksScenario();

    const { evaluateSubjectCheckFreshness } = await import(
      "@/lib/compliance/check-freshness-service"
    );

    await evaluateSubjectCheckFreshness(scenario.subjectId, "system-test");

    // The EMAIL check should still have PASS verdict
    const db = getTestDb();
    const [emailCheck] = await db
      .select()
      .from(coChecks)
      .where(eq(coChecks.id, scenario.emailCheckId))
      .limit(1);

    expect(emailCheck.normalizedVerdict).toBe("PASS");
  });

  it("generates CHECK_EXPIRED audit events for expired checks", async () => {
    const scenario = await seedStaleChecksScenario();

    const { evaluateSubjectCheckFreshness } = await import(
      "@/lib/compliance/check-freshness-service"
    );

    await evaluateSubjectCheckFreshness(scenario.subjectId, "system-test");

    // At least 2 CHECK_EXPIRED events (SANCTIONS + KYC_ID)
    const db = getTestDb();
    const auditEvents = await db
      .select()
      .from(coAuditEvents)
      .where(eq(coAuditEvents.eventType, "CHECK_EXPIRED"));

    expect(auditEvents.length).toBeGreaterThanOrEqual(2);

    // Verify one of them references the sanctions check
    const sanctionsEvent = auditEvents.find(
      (e) => e.aggregateId === scenario.sanctionsCheckId,
    );
    expect(sanctionsEvent).toBeDefined();
    expect(sanctionsEvent!.aggregateType).toBe("COMPLIANCE_CHECK");
  });

  it("does not re-process checks already marked EXPIRED", async () => {
    const scenario = await seedStaleChecksScenario();

    const { evaluateSubjectCheckFreshness } = await import(
      "@/lib/compliance/check-freshness-service"
    );

    // First pass — marks checks expired
    const report1 = await evaluateSubjectCheckFreshness(
      scenario.subjectId,
      "system-test",
    );

    // Second pass — should not re-mark them
    const report2 = await evaluateSubjectCheckFreshness(
      scenario.subjectId,
      "system-test",
    );

    // The checksMarkedExpired count on the second run should be 0
    // (they're already EXPIRED from the first pass)
    expect(report2.checksMarkedExpired).toBe(0);

    // But the report should still list them as expired
    expect(report2.hasExpiredChecks).toBe(true);
    expect(report2.expiredChecks.length).toBe(report1.expiredChecks.length);
  });

  it("returns correct freshness report structure", async () => {
    const scenario = await seedStaleChecksScenario();

    const { evaluateSubjectCheckFreshness } = await import(
      "@/lib/compliance/check-freshness-service"
    );

    const report = await evaluateSubjectCheckFreshness(
      scenario.subjectId,
      "system-test",
    );

    expect(report.subjectId).toBe(scenario.subjectId);
    expect(report.totalChecksEvaluated).toBe(3); // SANCTIONS, KYC_ID, EMAIL
    expect(report.evaluatedAt).toBeTruthy();
    expect(typeof report.hasExpiredChecks).toBe("boolean");
    expect(typeof report.checksMarkedExpired).toBe("number");
    expect(Array.isArray(report.expiredChecks)).toBe(true);
    expect(Array.isArray(report.validChecks)).toBe(true);
  });
});
