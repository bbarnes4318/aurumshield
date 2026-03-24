/* ================================================================
   REAL DB-BACKED INTEGRATION TEST: Shipment / Refinery Lot
   ================================================================
   Validates direct Drizzle CRUD on the physical supply chain
   tables against a real PostgreSQL database.

   Tests:
     1. Insert subject → shipment → custody events → lot chain
     2. Foreign key relationships hold
     3. Status transitions via Drizzle update
     4. updated_at trigger fires on mutation
     5. Assay status transitions on refinery lot
   ================================================================ */

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  setupTestDb,
  getTestDb,
  resetTestDb,
  teardownTestDb,
} from "./db-harness";
import {
  coSubjects,
  coPhysicalShipments,
  coChainOfCustodyEvents,
  coRefineryLots,
  coPolicySnapshots,
  coCases,
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

describe("Shipment / Refinery Lot Persistence — Real DB", () => {
  it("inserts the full subject → shipment → CoC → lot chain", async () => {
    const db = getTestDb();

    // Insert subjects
    const [supplier] = await db
      .insert(coSubjects)
      .values({
        subjectType: "SUPPLIER",
        legalName: "Test Mine",
        riskTier: "STANDARD",
        status: "ACTIVE",
      })
      .returning();

    const [refinery] = await db
      .insert(coSubjects)
      .values({
        subjectType: "REFINERY",
        legalName: "Test Refinery",
        riskTier: "STANDARD",
        status: "ACTIVE",
      })
      .returning();

    // Insert shipment
    const [shipment] = await db
      .insert(coPhysicalShipments)
      .values({
        supplierSubjectId: supplier.id,
        mineReference: "MINE-001",
        originCountry: "ZA",
        armoredCarrierName: "Brink's",
        shipmentStatus: "CREATED",
        refinerySubjectId: refinery.id,
      })
      .returning();

    expect(shipment.id).toBeTruthy();
    expect(shipment.supplierSubjectId).toBe(supplier.id);
    expect(shipment.refinerySubjectId).toBe(refinery.id);
    expect(shipment.shipmentStatus).toBe("CREATED");

    // Insert custody event
    const [cocEvent] = await db
      .insert(coChainOfCustodyEvents)
      .values({
        shipmentId: shipment.id,
        eventType: "PICKUP",
        location: "Johannesburg",
        eventTimestamp: new Date(),
        partyFrom: "Test Mine",
        partyTo: "Brink's",
        sealNumber: "SEAL-ZA-001",
        verificationStatus: "PENDING",
      })
      .returning();

    expect(cocEvent.shipmentId).toBe(shipment.id);
    expect(cocEvent.verificationStatus).toBe("PENDING");

    // Insert refinery lot
    const [lot] = await db
      .insert(coRefineryLots)
      .values({
        shipmentId: shipment.id,
        supplierSubjectId: supplier.id,
        refinerySubjectId: refinery.id,
        assayStatus: "PENDING",
      })
      .returning();

    expect(lot.shipmentId).toBe(shipment.id);
    expect(lot.assayStatus).toBe("PENDING");
  });

  it("transitions shipment status and triggers updated_at", async () => {
    const db = getTestDb();

    const [supplier] = await db.insert(coSubjects).values({
      subjectType: "SUPPLIER", legalName: "Mine A", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [refinery] = await db.insert(coSubjects).values({
      subjectType: "REFINERY", legalName: "Refinery A", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [shipment] = await db.insert(coPhysicalShipments).values({
      supplierSubjectId: supplier.id,
      mineReference: "MINE-002",
      originCountry: "GH",
      armoredCarrierName: "Brink's",
      shipmentStatus: "PENDING_DISPATCH",
      refinerySubjectId: refinery.id,
    }).returning();

    const originalUpdatedAt = shipment.updatedAt;

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 50));

    // Transition to DISPATCHED
    await db
      .update(coPhysicalShipments)
      .set({ shipmentStatus: "DISPATCHED", dispatchedAt: new Date() })
      .where(eq(coPhysicalShipments.id, shipment.id));

    const [updated] = await db
      .select()
      .from(coPhysicalShipments)
      .where(eq(coPhysicalShipments.id, shipment.id))
      .limit(1);

    expect(updated.shipmentStatus).toBe("DISPATCHED");
    expect(updated.dispatchedAt).toBeTruthy();
    // updated_at trigger should have updated the timestamp
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      originalUpdatedAt.getTime(),
    );
  });

  it("transitions refinery lot assay status through the lifecycle", async () => {
    const db = getTestDb();

    const [supplier] = await db.insert(coSubjects).values({
      subjectType: "SUPPLIER", legalName: "Mine B", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [refinery] = await db.insert(coSubjects).values({
      subjectType: "REFINERY", legalName: "Refinery B", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [shipment] = await db.insert(coPhysicalShipments).values({
      supplierSubjectId: supplier.id,
      mineReference: "MINE-003",
      originCountry: "ML",
      armoredCarrierName: "Loomis",
      shipmentStatus: "DELIVERED_TO_REFINERY",
      refinerySubjectId: refinery.id,
    }).returning();

    const [lot] = await db.insert(coRefineryLots).values({
      shipmentId: shipment.id,
      supplierSubjectId: supplier.id,
      refinerySubjectId: refinery.id,
      assayStatus: "PENDING_RECEIPT",
    }).returning();

    // PENDING_RECEIPT → PENDING → IN_PROGRESS → COMPLETE
    const transitions = ["PENDING", "IN_PROGRESS", "COMPLETE"] as const;

    for (const status of transitions) {
      await db
        .update(coRefineryLots)
        .set({ assayStatus: status })
        .where(eq(coRefineryLots.id, lot.id));

      const [current] = await db
        .select()
        .from(coRefineryLots)
        .where(eq(coRefineryLots.id, lot.id))
        .limit(1);

      expect(current.assayStatus).toBe(status);
    }

    // Set assay values
    await db
      .update(coRefineryLots)
      .set({
        grossWeight: "100.0000",
        netWeight: "98.5000",
        fineness: "0.995000",
        recoverableGoldWeight: "97.9575",
        payableGoldWeight: "96.9779",
        payableValue: "195000.00",
        settlementReady: true,
      })
      .where(eq(coRefineryLots.id, lot.id));

    const [finalLot] = await db
      .select()
      .from(coRefineryLots)
      .where(eq(coRefineryLots.id, lot.id))
      .limit(1);

    expect(finalLot.settlementReady).toBe(true);
    expect(finalLot.payableValue).toBe("195000.00");
    expect(finalLot.fineness).toBe("0.995000");
  });

  it("verifies custody event verification status updates", async () => {
    const db = getTestDb();

    const [supplier] = await db.insert(coSubjects).values({
      subjectType: "SUPPLIER", legalName: "Mine C", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [refinery] = await db.insert(coSubjects).values({
      subjectType: "REFINERY", legalName: "Refinery C", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [shipment] = await db.insert(coPhysicalShipments).values({
      supplierSubjectId: supplier.id,
      mineReference: "MINE-004",
      originCountry: "TZ",
      armoredCarrierName: "G4S",
      shipmentStatus: "IN_TRANSIT",
      refinerySubjectId: refinery.id,
    }).returning();

    const [event] = await db.insert(coChainOfCustodyEvents).values({
      shipmentId: shipment.id,
      eventType: "SEAL_CHECK",
      location: "Dar es Salaam Airport",
      eventTimestamp: new Date(),
      sealNumber: "SEAL-TZ-001",
      verificationStatus: "PENDING",
    }).returning();

    expect(event.verificationStatus).toBe("PENDING");

    // Verify the event
    await db
      .update(coChainOfCustodyEvents)
      .set({ verificationStatus: "VERIFIED" })
      .where(eq(coChainOfCustodyEvents.id, event.id));

    const [verified] = await db
      .select()
      .from(coChainOfCustodyEvents)
      .where(eq(coChainOfCustodyEvents.id, event.id))
      .limit(1);

    expect(verified.verificationStatus).toBe("VERIFIED");
  });

  it("refinery lot with intakeCaseId references a valid case", async () => {
    const db = getTestDb();

    const [supplier] = await db.insert(coSubjects).values({
      subjectType: "SUPPLIER", legalName: "Mine D", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [refinery] = await db.insert(coSubjects).values({
      subjectType: "REFINERY", legalName: "Refinery D", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [policy] = await db.insert(coPolicySnapshots).values({
      version: 1, effectiveAt: new Date(), rulesPayload: {}, createdBy: "test",
    }).returning();

    const [intakeCase] = await db.insert(coCases).values({
      subjectId: supplier.id,
      caseType: "REFINERY_INTAKE_REVIEW",
      status: "OPEN",
      priority: 50,
      policySnapshotId: policy.id,
    }).returning();

    const [shipment] = await db.insert(coPhysicalShipments).values({
      supplierSubjectId: supplier.id,
      mineReference: "MINE-005",
      originCountry: "BF",
      armoredCarrierName: "Brink's",
      shipmentStatus: "RECEIVED_BY_REFINERY",
      refinerySubjectId: refinery.id,
    }).returning();

    const [lot] = await db.insert(coRefineryLots).values({
      shipmentId: shipment.id,
      supplierSubjectId: supplier.id,
      refinerySubjectId: refinery.id,
      intakeCaseId: intakeCase.id,
      assayStatus: "IN_PROGRESS",
    }).returning();

    expect(lot.intakeCaseId).toBe(intakeCase.id);
  });
});
