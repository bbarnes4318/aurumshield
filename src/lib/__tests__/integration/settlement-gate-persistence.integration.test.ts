/* ================================================================
   REAL DB-BACKED INTEGRATION TEST: Settlement Gate Persistence
   ================================================================
   Validates the full 6-gate settlement authorization pipeline
   against a real PostgreSQL database.

   Tests:
     1. Happy path: all gates pass → AUTHORIZED written
     2. Gate rows written to co_settlement_gates
     3. Audit event written with SETTLEMENT_AUTHORIZATION_DECIDED
     4. Re-authorization creates new row (no collision)
     5. Supplier sanctions FAIL → REJECTED verdict
   ================================================================ */

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  setupTestDb,
  getTestDb,
  resetTestDb,
  teardownTestDb,
  seedSettlementScenario,
} from "./db-harness";
import {
  coSettlementAuthorizations,
  coSettlementGates,
  coAuditEvents,
  coChecks,
} from "@/db/schema/compliance";

beforeAll(async () => {
  await setupTestDb();
});

afterEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("Settlement Gate Persistence — Real DB", () => {
  it("authorizes settlement and persists authorization + gate rows on full pass", async () => {
    const scenario = await seedSettlementScenario();

    const { authorizeSettlement } = await import(
      "@/lib/compliance/settlement-authorization-service"
    );

    const result = await authorizeSettlement(
      scenario.refineryLotId,
      scenario.buyerSubjectId,
      "WIRE",
      "system-test",
    );

    // ── Verify verdict ──
    expect(result.verdict).toBe("APPROVED");
    expect(result.settlementAuthorizationId).toBeTruthy();
    expect(result.decisionHash).toBeTruthy();
    expect(result.payableValue).toBeTruthy();
    expect(result.policySnapshotId).toBe(scenario.policySnapshotId);

    // ── Verify co_settlement_authorizations row ──
    const db = getTestDb();
    const [authRow] = await db
      .select()
      .from(coSettlementAuthorizations)
      .where(eq(coSettlementAuthorizations.id, result.settlementAuthorizationId!))
      .limit(1);

    expect(authRow).toBeDefined();
    expect(authRow.verdict).toBe("AUTHORIZED");
    expect(authRow.refineryLotId).toBe(scenario.refineryLotId);
    expect(authRow.buyerSubjectId).toBe(scenario.buyerSubjectId);
    expect(authRow.paymentRail).toBe("WIRE");
    expect(authRow.decisionHash).toBe(result.decisionHash);
    expect(authRow.authorizedAt).toBeTruthy();
    expect(authRow.expiresAt).toBeTruthy();

    // ── Verify co_settlement_gates rows ──
    const gates = await db
      .select()
      .from(coSettlementGates)
      .where(eq(coSettlementGates.settlementAuthorizationId, result.settlementAuthorizationId!));

    expect(gates.length).toBe(6); // One per gate
    const gateTypes = gates.map((g) => g.gateType).sort();
    expect(gateTypes).toEqual([
      "BUYER_APPROVED",
      "FINAL_POLICY_GATE",
      "PAYMENT_READINESS",
      "REFINERY_ASSAY_TRUTH",
      "SHIPMENT_INTEGRITY",
      "SUPPLIER_APPROVED",
    ]);

    // All gates should be PASS
    expect(gates.every((g) => g.result === "PASS")).toBe(true);

    // All gates should have evidence references
    expect(gates.every((g) => g.evidenceRef !== null)).toBe(true);
  });

  it("persists audit event for SETTLEMENT_AUTHORIZATION_DECIDED", async () => {
    const scenario = await seedSettlementScenario();

    const { authorizeSettlement } = await import(
      "@/lib/compliance/settlement-authorization-service"
    );

    const result = await authorizeSettlement(
      scenario.refineryLotId,
      scenario.buyerSubjectId,
      "USDC",
      "system-test",
    );

    const db = getTestDb();
    const auditEvents = await db
      .select()
      .from(coAuditEvents)
      .where(eq(coAuditEvents.aggregateId, result.settlementAuthorizationId!));

    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
    const settlementEvent = auditEvents.find(
      (e) => e.eventType === "SETTLEMENT_AUTHORIZATION_DECIDED",
    );
    expect(settlementEvent).toBeDefined();
    expect(settlementEvent!.aggregateType).toBe("SETTLEMENT_AUTHORIZATION");
    expect(settlementEvent!.hash).toBeTruthy();
  });

  it("re-authorization creates a new row (idempotent — no collision)", async () => {
    const scenario = await seedSettlementScenario();

    const { authorizeSettlement } = await import(
      "@/lib/compliance/settlement-authorization-service"
    );

    const result1 = await authorizeSettlement(
      scenario.refineryLotId,
      scenario.buyerSubjectId,
      "WIRE",
      "system-test",
    );

    const result2 = await authorizeSettlement(
      scenario.refineryLotId,
      scenario.buyerSubjectId,
      "WIRE",
      "system-test",
    );

    expect(result1.settlementAuthorizationId).toBeTruthy();
    expect(result2.settlementAuthorizationId).toBeTruthy();
    // Two different authorization rows should exist
    expect(result1.settlementAuthorizationId).not.toBe(
      result2.settlementAuthorizationId,
    );

    const db = getTestDb();
    const rows = await db
      .select()
      .from(coSettlementAuthorizations)
      .where(eq(coSettlementAuthorizations.refineryLotId, scenario.refineryLotId));

    expect(rows.length).toBe(2);
  });

  it("rejects settlement when supplier sanctions FAIL", async () => {
    const scenario = await seedSettlementScenario();

    // Overwrite the supplier's sanctions check to FAIL
    const db = getTestDb();
    await db
      .update(coChecks)
      .set({
        normalizedVerdict: "FAIL",
        resultCode: "CONFIRMED_MATCH",
      })
      .where(eq(coChecks.id, scenario.sanctionsCheckId));

    const { authorizeSettlement } = await import(
      "@/lib/compliance/settlement-authorization-service"
    );

    const result = await authorizeSettlement(
      scenario.refineryLotId,
      scenario.buyerSubjectId,
      "WIRE",
      "system-test",
    );

    expect(result.verdict).toBe("REJECTED");
    expect(result.settlementAuthorizationId).toBeNull();

    // Gate 2 (SUPPLIER_APPROVAL) should have failed
    const failedGate = result.gateResults.find(
      (g) => g.gate === "SUPPLIER_APPROVAL",
    );
    expect(failedGate).toBeDefined();
    expect(failedGate!.passed).toBe(false);
  });

  it("holds settlement when buyer has no APPROVED compliance case", async () => {
    const scenario = await seedSettlementScenario();

    // Remove the buyer's approved case status
    const db = getTestDb();
    const { coCases } = await import("@/db/schema/compliance");
    await db
      .update(coCases)
      .set({ status: "OPEN" })
      .where(eq(coCases.id, scenario.buyerCaseId));

    const { authorizeSettlement } = await import(
      "@/lib/compliance/settlement-authorization-service"
    );

    const result = await authorizeSettlement(
      scenario.refineryLotId,
      scenario.buyerSubjectId,
      "WIRE",
      "system-test",
    );

    expect(result.verdict).toBe("COMPLIANCE_HOLD");
    expect(result.settlementAuthorizationId).toBeNull();
  });
});
