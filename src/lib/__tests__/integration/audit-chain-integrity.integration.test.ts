/* ================================================================
   REAL DB-BACKED INTEGRATION TEST: Audit Chain Integrity
   ================================================================
   Validates the hash-chained audit log against a real PostgreSQL
   database. Tests that appendEvent() and verifyAuditChain() produce
   correct, verifiable, tamper-evident chains.

   Tests:
     1. Single event has genesis hash
     2. Multiple events form a valid chain
     3. verifyAuditChain() validates the chain
     4. getAuditTrail() returns events in order
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
import { coAuditEvents } from "@/db/schema/compliance";

beforeAll(async () => {
  await setupTestDb();
});

afterEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("Audit Chain Integrity — Real DB", () => {
  it("appendEvent() creates a genesis event with a valid hash", async () => {
    const scenario = await seedSettlementScenario();

    const { appendEvent } = await import("@/lib/compliance/audit-log");

    const result = await appendEvent(
      "SHIPMENT",
      scenario.shipmentId,
      "SHIPMENT_CREATED",
      {
        shipmentId: scenario.shipmentId,
        supplierSubjectId: scenario.supplierSubjectId,
        refinerySubjectId: scenario.refinerySubjectId,
        mineReference: "MINE-GH-2024-001",
        originCountry: "GH",
        armoredCarrierName: "Brink's",
        brinksReference: "BRK-TEST-001",
      },
      "system-test",
    );

    expect(result.id).toBeTruthy();
    expect(result.hash).toBeTruthy();
    expect(result.hash.length).toBe(64); // SHA-256 hex length

    // Verify in DB
    const db = getTestDb();
    const [event] = await db
      .select()
      .from(coAuditEvents)
      .where(eq(coAuditEvents.id, result.id))
      .limit(1);

    expect(event.aggregateType).toBe("SHIPMENT");
    expect(event.aggregateId).toBe(scenario.shipmentId);
    expect(event.eventType).toBe("SHIPMENT_CREATED");
    expect(event.previousHash).toBeNull(); // Genesis
    expect(event.hash).toBe(result.hash);
  });

  it("multiple events form a correctly linked hash chain", async () => {
    const scenario = await seedSettlementScenario();

    const { appendEvent } = await import("@/lib/compliance/audit-log");

    // Event 1 — genesis
    const event1 = await appendEvent(
      "SHIPMENT",
      scenario.shipmentId,
      "SHIPMENT_CREATED",
      {
        shipmentId: scenario.shipmentId,
        supplierSubjectId: scenario.supplierSubjectId,
        refinerySubjectId: scenario.refinerySubjectId,
        mineReference: "MINE-001",
        originCountry: "GH",
        armoredCarrierName: "Brink's",
        brinksReference: null,
      },
      "system-test",
    );

    // Event 2 — chained to event 1
    const event2 = await appendEvent(
      "SHIPMENT",
      scenario.shipmentId,
      "CUSTODY_EVENT_ADDED",
      {
        shipmentId: scenario.shipmentId,
        custodyEventId: scenario.cocEventIds[0],
        eventType: "PICKUP",
        location: "Mine site",
        partyFrom: "Mine",
        partyTo: "Brink's",
        sealNumber: "SEAL-001",
        verificationStatus: "VERIFIED",
      },
      "system-test",
    );

    // Event 3 — chained to event 2
    const event3 = await appendEvent(
      "SHIPMENT",
      scenario.shipmentId,
      "BRINKS_HANDOFF_VERIFIED",
      {
        shipmentId: scenario.shipmentId,
        brinksReference: "BRK-001",
        sealNumber: "SEAL-001",
        handoffTimestamp: new Date().toISOString(),
        verifiedBy: "system-test",
      },
      "system-test",
    );

    // All hashes should be unique
    expect(new Set([event1.hash, event2.hash, event3.hash]).size).toBe(3);

    // Verify chain linkage in DB
    const db = getTestDb();
    const events = await db
      .select()
      .from(coAuditEvents)
      .where(eq(coAuditEvents.aggregateId, scenario.shipmentId));

    // Sort by created_at
    events.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    expect(events.length).toBe(3);
    expect(events[0].previousHash).toBeNull(); // Genesis
    expect(events[1].previousHash).toBe(events[0].hash); // Chain link
    expect(events[2].previousHash).toBe(events[1].hash); // Chain link
  });

  it("verifyAuditChain() validates a correct chain", async () => {
    const scenario = await seedSettlementScenario();

    const { appendEvent, verifyAuditChain } = await import(
      "@/lib/compliance/audit-log"
    );

    // Build a 3-event chain
    await appendEvent(
      "REFINERY_LOT",
      scenario.refineryLotId,
      "ASSAY_COMPLETED",
      {
        refineryLotId: scenario.refineryLotId,
        grossWeight: "100.0000",
        netWeight: "98.5000",
        fineness: "0.995000",
        recoverableGoldWeight: "97.9575",
        assayCertificateRef: "s3://assay/cert-001.pdf",
      },
      "system-test",
    );

    await appendEvent(
      "REFINERY_LOT",
      scenario.refineryLotId,
      "PAYABLE_VALUE_CALCULATED",
      {
        refineryLotId: scenario.refineryLotId,
        payableGoldWeight: "96.9779",
        payableValue: "195000.00",
        spotPriceAtCalculation: "2010.50",
        calculationMethod: "standard-discount",
      },
      "system-test",
    );

    await appendEvent(
      "REFINERY_LOT",
      scenario.refineryLotId,
      "REFINERY_LOT_APPROVED",
      {
        lotId: scenario.refineryLotId,
        verdict: "APPROVED",
        previousAssayStatus: "IN_PROGRESS",
        newAssayStatus: "SETTLEMENT_READY",
      },
      "system-test",
    );

    // Verify the chain
    const verification = await verifyAuditChain(scenario.refineryLotId);

    expect(verification.valid).toBe(true);
    expect(verification.totalEvents).toBe(3);
    expect(verification.verifiedEvents).toBe(3);
    expect(verification.brokenAt).toBeNull();
    expect(verification.brokenEventId).toBeNull();
  });

  it("getAuditTrail() returns events in chronological order", async () => {
    const scenario = await seedSettlementScenario();

    const { appendEvent, getAuditTrail } = await import(
      "@/lib/compliance/audit-log"
    );

    await appendEvent(
      "CUSTODY_CHAIN",
      scenario.shipmentId,
      "CUSTODY_EVENT_ADDED",
      {
        shipmentId: scenario.shipmentId,
        custodyEventId: scenario.cocEventIds[0],
        eventType: "PICKUP",
        location: null,
        partyFrom: null,
        partyTo: null,
        sealNumber: null,
        verificationStatus: "PENDING",
      },
      "system-test",
    );

    await appendEvent(
      "CUSTODY_CHAIN",
      scenario.shipmentId,
      "CUSTODY_EVENT_ADDED",
      {
        shipmentId: scenario.shipmentId,
        custodyEventId: scenario.cocEventIds[1],
        eventType: "TRANSPORT",
        location: null,
        partyFrom: null,
        partyTo: null,
        sealNumber: null,
        verificationStatus: "VERIFIED",
      },
      "system-test",
    );

    const trail = await getAuditTrail(scenario.shipmentId);

    expect(trail.length).toBe(2);
    // Should be in chronological order
    expect(
      new Date(trail[0].created_at).getTime(),
    ).toBeLessThanOrEqual(new Date(trail[1].created_at).getTime());
  });

  it("verifyAuditChain() returns valid for empty aggregate", async () => {
    await seedSettlementScenario();

    const { verifyAuditChain } = await import("@/lib/compliance/audit-log");

    const result = await verifyAuditChain(
      "00000000-0000-0000-0000-000000000000",
    );

    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(0);
    expect(result.verifiedEvents).toBe(0);
  });
});
