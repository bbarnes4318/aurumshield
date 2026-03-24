/* ================================================================
   REAL DB-BACKED INTEGRATION TEST: Schema Constraints
   ================================================================
   Validates that the PostgreSQL schema enforces its constraints
   correctly: enum types, foreign keys, NOT NULL, ON DELETE RESTRICT.

   These tests validate the MIGRATION output, not application
   logic — they prove the database itself rejects invalid data.

   Tests:
     1. Enum columns accept valid values
     2. Invalid enum values are rejected
     3. FK constraints prevent orphan rows
     4. ON DELETE RESTRICT prevents cascade deletion
     5. NOT NULL constraints enforced
     6. Settlement gates table exists with correct columns
   ================================================================ */

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import {
  setupTestDb,
  getTestDb,
  getTestPool,
  resetTestDb,
  teardownTestDb,
} from "./db-harness";
import {
  coSubjects,
  coPolicySnapshots,
  coCases,
  coPhysicalShipments,
  coChainOfCustodyEvents,
} from "@/db/schema/compliance";
import { eq } from "drizzle-orm";

beforeAll(async () => {
  await setupTestDb();
});

afterEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("Schema Constraints — Real DB", () => {
  // ── Enum Acceptance ──────────────────────────────────────────────

  it("accepts all valid co_settlement_verdict enum values", async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      // Test casting — valid values should not throw
      for (const value of ["AUTHORIZED", "DENIED", "PENDING_REVIEW", "EXPIRED"]) {
        const result = await client.query(
          `SELECT $1::co_settlement_verdict AS val`,
          [value],
        );
        expect(result.rows[0].val).toBe(value);
      }
    } finally {
      client.release();
    }
  });

  it("accepts all valid co_case_status enum values", async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      const validStatuses = [
        "DRAFT", "OPEN", "AWAITING_SUBJECT", "AWAITING_PROVIDER",
        "AWAITING_INTERNAL_REVIEW", "ESCALATED", "READY_FOR_DISPOSITION",
        "APPROVED", "REJECTED", "SUSPENDED", "EXPIRED", "CLOSED",
      ];

      for (const status of validStatuses) {
        const result = await client.query(
          `SELECT $1::co_case_status AS val`,
          [status],
        );
        expect(result.rows[0].val).toBe(status);
      }
    } finally {
      client.release();
    }
  });

  it("accepts all valid co_payment_rail enum values", async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      for (const value of ["WIRE", "USDC", "USDT", "FEDWIRE", "TURNKEY_MPC"]) {
        const result = await client.query(
          `SELECT $1::co_payment_rail AS val`,
          [value],
        );
        expect(result.rows[0].val).toBe(value);
      }
    } finally {
      client.release();
    }
  });

  it("accepts all valid co_settlement_gate_type enum values", async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      for (const value of [
        "BUYER_APPROVED", "SUPPLIER_APPROVED", "SHIPMENT_INTEGRITY",
        "REFINERY_ASSAY_TRUTH", "PAYMENT_READINESS", "SANCTIONS_CLEAR",
        "WALLET_RISK_CLEAR", "FINAL_POLICY_GATE",
      ]) {
        const result = await client.query(
          `SELECT $1::co_settlement_gate_type AS val`,
          [value],
        );
        expect(result.rows[0].val).toBe(value);
      }
    } finally {
      client.release();
    }
  });

  // ── Invalid Enum Rejection ───────────────────────────────────────

  it("rejects invalid co_settlement_verdict values", async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await expect(
        client.query(`SELECT 'BOGUS'::co_settlement_verdict`),
      ).rejects.toThrow();
    } finally {
      client.release();
    }
  });

  it("rejects invalid co_subject_type values", async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await expect(
        client.query(`SELECT 'ALIEN'::co_subject_type`),
      ).rejects.toThrow();
    } finally {
      client.release();
    }
  });

  it("rejects invalid co_assay_status values", async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await expect(
        client.query(`SELECT 'MAGIC'::co_assay_status`),
      ).rejects.toThrow();
    } finally {
      client.release();
    }
  });

  // ── Foreign Key Constraints ──────────────────────────────────────

  it("rejects co_cases insert with nonexistent subject_id", async () => {
    const db = getTestDb();

    const [policy] = await db.insert(coPolicySnapshots).values({
      version: 1, effectiveAt: new Date(), rulesPayload: {}, createdBy: "test",
    }).returning();

    await expect(
      db.insert(coCases).values({
        subjectId: "00000000-0000-0000-0000-000000000000",
        caseType: "ONBOARDING",
        status: "OPEN",
        priority: 10,
        policySnapshotId: policy.id,
      }),
    ).rejects.toThrow();
  });

  it("rejects co_physical_shipments insert with nonexistent supplier_subject_id", async () => {
    const db = getTestDb();

    const [refinery] = await db.insert(coSubjects).values({
      subjectType: "REFINERY", legalName: "Refinery", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    await expect(
      db.insert(coPhysicalShipments).values({
        supplierSubjectId: "00000000-0000-0000-0000-000000000000",
        mineReference: "MINE-FK-TEST",
        originCountry: "GH",
        armoredCarrierName: "Brink's",
        shipmentStatus: "CREATED",
        refinerySubjectId: refinery.id,
      }),
    ).rejects.toThrow();
  });

  // ── ON DELETE RESTRICT ───────────────────────────────────────────

  it("prevents deleting a subject that has cases (ON DELETE RESTRICT)", async () => {
    const db = getTestDb();

    const [subject] = await db.insert(coSubjects).values({
      subjectType: "INDIVIDUAL", legalName: "Protected Subject", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [policy] = await db.insert(coPolicySnapshots).values({
      version: 1, effectiveAt: new Date(), rulesPayload: {}, createdBy: "test",
    }).returning();

    await db.insert(coCases).values({
      subjectId: subject.id,
      caseType: "ONBOARDING",
      status: "OPEN",
      priority: 10,
      policySnapshotId: policy.id,
    });

    // Attempting to delete the subject should fail
    await expect(
      db.delete(coSubjects).where(eq(coSubjects.id, subject.id)),
    ).rejects.toThrow();
  });

  it("prevents deleting a shipment that has custody events (ON DELETE RESTRICT)", async () => {
    const db = getTestDb();

    const [supplier] = await db.insert(coSubjects).values({
      subjectType: "SUPPLIER", legalName: "Mine", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [refinery] = await db.insert(coSubjects).values({
      subjectType: "REFINERY", legalName: "Refinery", riskTier: "STANDARD", status: "ACTIVE",
    }).returning();

    const [shipment] = await db.insert(coPhysicalShipments).values({
      supplierSubjectId: supplier.id,
      mineReference: "MINE-DEL-TEST",
      originCountry: "GH",
      armoredCarrierName: "Brink's",
      shipmentStatus: "CREATED",
      refinerySubjectId: refinery.id,
    }).returning();

    await db.insert(coChainOfCustodyEvents).values({
      shipmentId: shipment.id,
      eventType: "PICKUP",
      eventTimestamp: new Date(),
      verificationStatus: "PENDING",
    });

    await expect(
      db.delete(coPhysicalShipments).where(eq(coPhysicalShipments.id, shipment.id)),
    ).rejects.toThrow();
  });

  // ── Settlement Gates Table Verification ──────────────────────────

  it("co_settlement_gates table exists with expected columns", async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'co_settlement_gates'
        ORDER BY ordinal_position;
      `);

      const columns = result.rows.map((r: { column_name: string }) => r.column_name);

      expect(columns).toContain("id");
      expect(columns).toContain("settlement_authorization_id");
      expect(columns).toContain("gate_type");
      expect(columns).toContain("result");
      expect(columns).toContain("detail");
      expect(columns).toContain("evidence_ref");
      expect(columns).toContain("evaluated_at");
      expect(columns).toContain("created_at");
    } finally {
      client.release();
    }
  });

  it("verifies co_settlement_gate_result enum values are correct", async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT enum_range(NULL::co_settlement_gate_result) AS values;
      `);

      const values = result.rows[0].values;
      expect(values).toContain("PASS");
      expect(values).toContain("FAIL");
      expect(values).toContain("BLOCKED");
      expect(values).toContain("SKIPPED");
      expect(values).toContain("PENDING");
    } finally {
      client.release();
    }
  });

  // ── NOT NULL Constraints ─────────────────────────────────────────

  it("rejects co_subjects insert without required legal_name", async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await expect(
        client.query(`
          INSERT INTO co_subjects (subject_type)
          VALUES ('INDIVIDUAL')
        `),
      ).rejects.toThrow();
    } finally {
      client.release();
    }
  });
});
