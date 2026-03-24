/* ================================================================
   REAL DB-BACKED INTEGRATION TEST HARNESS
   ================================================================
   Provides a real PostgreSQL-backed test environment for integration
   tests. Connects to the ephemeral test container, runs all SQL
   migrations, and provides seed factories for deterministic data.

   This is NOT a mock. Services under test use real Drizzle ORM
   queries against a real PostgreSQL database.

   STRATEGY:
     - Connect to test DB via DATABASE_URL env var
     - Run all SQL migrations from src/db/migrations/
     - Patch getDb() and getPoolClient() to use the test pool
     - Truncate all co_* tables between test runs
     - Drop pool on teardown

   USAGE (in test files):
     import { setupTestDb, getTestDb, resetTestDb, teardownTestDb, seedSettlementScenario } from './db-harness';

     beforeAll(() => setupTestDb());
     afterEach(() => resetTestDb());
     afterAll(() => teardownTestDb());
   ================================================================ */

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import * as complianceSchema from "@/db/schema/compliance";

const {
  coSubjects,
  coPolicySnapshots,
  coCases,
  coChecks,
  coPhysicalShipments,
  coChainOfCustodyEvents,
  coRefineryLots,
} = complianceSchema;

// ─── STATE ─────────────────────────────────────────────────────────────────────

let _pool: pg.Pool | null = null;
let _db: NodePgDatabase<typeof complianceSchema> | null = null;

// ─── SETUP ─────────────────────────────────────────────────────────────────────

/**
 * Initialize the test database:
 *  1. Connect to the test Postgres container
 *  2. Run all SQL migrations
 *  3. Patch getDb() and getPoolClient() to use the test pool
 */
export async function setupTestDb(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Start the test container: npm run test:integration:up",
    );
  }

  // Create pool
  _pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // Verify connectivity
  const client = await _pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }

  // Run migrations
  await runMigrations();

  // Create Drizzle instance
  _db = drizzle(_pool, { schema: complianceSchema });

  // Patch the production getDb() and getPoolClient() to use test pool
  await patchDbModules();
}

/**
 * Run all SQL migrations from src/db/migrations/ in order.
 */
async function runMigrations(): Promise<void> {
  if (!_pool) throw new Error("Pool not initialized");

  const client = await _pool.connect();
  try {
    // Create migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Load executed migrations
    const { rows: executed } = await client.query(
      "SELECT filename FROM _migrations ORDER BY id",
    );
    const executedSet = new Set(
      executed.map((r: { filename: string }) => r.filename),
    );

    // Find migrations directory
    const migrationsDir = join(process.cwd(), "src", "db", "migrations");
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (executedSet.has(file)) continue;

      const sql = readFileSync(join(migrationsDir, file), "utf-8");

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO _migrations (filename) VALUES ($1)",
          [file],
        );
        await client.query("COMMIT");
      } catch (err: unknown) {
        await client.query("ROLLBACK");

        const pgErr = err as { code?: string };
        if (pgErr.code === "42P07" || pgErr.code === "23505") {
          // Objects already exist — record as applied
          await client.query(
            "INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
            [file],
          );
          continue;
        }
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

/**
 * Patch the production DB modules to use the test pool.
 *
 * We dynamically import the modules and override their exports
 * so that real service code (settlement-authorization-service, etc.)
 * hits the test DB instead of production.
 */
async function patchDbModules(): Promise<void> {
  // Patch @/db/drizzle → getDb()
  const drizzleModule = await import("@/db/drizzle");
  (drizzleModule as { getDb: () => Promise<NodePgDatabase<typeof complianceSchema>> }).getDb = async () => {
    if (!_db) throw new Error("Test DB not initialized");
    return _db;
  };

  // Patch @/lib/db → getPoolClient() and getDbPool()
  const dbModule = await import("@/lib/db");
  (dbModule as { getPoolClient: () => Promise<pg.PoolClient> }).getPoolClient = async () => {
    if (!_pool) throw new Error("Test pool not initialized");
    return _pool.connect();
  };
  (dbModule as { getDbPool: () => Promise<pg.Pool> }).getDbPool = async () => {
    if (!_pool) throw new Error("Test pool not initialized");
    return _pool;
  };
}

// ─── ACCESSORS ─────────────────────────────────────────────────────────────────

/**
 * Get the test Drizzle ORM instance (for direct queries in tests).
 */
export function getTestDb(): NodePgDatabase<typeof complianceSchema> {
  if (!_db) throw new Error("Test DB not initialized. Call setupTestDb() first.");
  return _db;
}

/**
 * Get the raw test pool (for raw SQL queries in tests).
 */
export function getTestPool(): pg.Pool {
  if (!_pool) throw new Error("Test pool not initialized. Call setupTestDb() first.");
  return _pool;
}

// ─── RESET ─────────────────────────────────────────────────────────────────────

/**
 * Truncate all co_* tables between test runs.
 * Uses CASCADE to handle foreign key dependencies.
 * Preserves the schema — only data is removed.
 */
export async function resetTestDb(): Promise<void> {
  if (!_pool) return;

  const client = await _pool.connect();
  try {
    await client.query(`
      TRUNCATE TABLE
        co_settlement_gates,
        co_settlement_authorizations,
        co_wallet_screenings,
        co_wallet_addresses,
        co_case_tasks,
        co_refinery_lots,
        co_chain_of_custody_events,
        co_physical_shipments,
        co_decisions,
        co_checks,
        co_cases,
        co_audit_events,
        co_policy_snapshots,
        co_subjects
      CASCADE;
    `);
  } finally {
    client.release();
  }
}

// ─── TEARDOWN ──────────────────────────────────────────────────────────────────

/**
 * End the test pool connection.
 */
export async function teardownTestDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

// ─── SEED FACTORIES ────────────────────────────────────────────────────────────

export interface SeededSettlementScenario {
  buyerSubjectId: string;
  supplierSubjectId: string;
  refinerySubjectId: string;
  policySnapshotId: string;
  buyerCaseId: string;
  supplierCaseId: string;
  shipmentId: string;
  cocEventIds: string[];
  refineryLotId: string;
  fundingCheckId: string;
  sanctionsCheckId: string;
}

/**
 * Seed a complete settlement scenario with all prerequisites
 * for the 6-gate pipeline to pass.
 *
 * Creates:
 *   - 3 subjects: buyer (INDIVIDUAL/ACTIVE), supplier (SUPPLIER/ACTIVE), refinery (REFINERY/ACTIVE)
 *   - 1 policy snapshot
 *   - 2 cases: buyer APPROVED, supplier APPROVED
 *   - 2 checks: buyer SOURCE_OF_FUNDS PASS, supplier SANCTIONS PASS
 *   - 1 shipment: DELIVERED_TO_REFINERY
 *   - 3 custody events: PICKUP, TRANSPORT, DELIVERY — all VERIFIED
 *   - 1 refinery lot: assay COMPLETE, payable values set
 */
export async function seedSettlementScenario(): Promise<SeededSettlementScenario> {
  const db = getTestDb();

  // ── Subjects ──
  const [buyer] = await db.insert(coSubjects).values({
    subjectType: "INDIVIDUAL",
    legalName: "Test Buyer Corp",
    riskTier: "STANDARD",
    status: "ACTIVE",
  }).returning();

  const [supplier] = await db.insert(coSubjects).values({
    subjectType: "SUPPLIER",
    legalName: "Gold Mine International",
    riskTier: "STANDARD",
    status: "ACTIVE",
  }).returning();

  const [refinery] = await db.insert(coSubjects).values({
    subjectType: "REFINERY",
    legalName: "Metalor Technologies",
    riskTier: "STANDARD",
    status: "ACTIVE",
  }).returning();

  // ── Policy Snapshot ──
  const [policy] = await db.insert(coPolicySnapshots).values({
    version: 1,
    effectiveAt: new Date(),
    rulesPayload: { checkMatrix: "standard", version: "1.0" },
    createdBy: "system-test",
  }).returning();

  // ── Cases ──
  const [buyerCase] = await db.insert(coCases).values({
    subjectId: buyer.id,
    caseType: "ONBOARDING",
    status: "APPROVED",
    priority: 10,
    policySnapshotId: policy.id,
    closedAt: new Date(),
    closedReason: "All checks passed — buyer approved.",
  }).returning();

  const [supplierCase] = await db.insert(coCases).values({
    subjectId: supplier.id,
    caseType: "ONBOARDING",
    status: "APPROVED",
    priority: 10,
    policySnapshotId: policy.id,
    closedAt: new Date(),
    closedReason: "Supplier onboarding approved.",
  }).returning();

  // ── Checks ──
  const [fundingCheck] = await db.insert(coChecks).values({
    caseId: buyerCase.id,
    checkType: "SOURCE_OF_FUNDS",
    provider: "internal",
    status: "COMPLETED",
    normalizedVerdict: "PASS",
    resultCode: "VERIFIED",
    completedAt: new Date(),
  }).returning();

  const [sanctionsCheck] = await db.insert(coChecks).values({
    caseId: supplierCase.id,
    checkType: "SANCTIONS",
    provider: "OpenSanctions",
    status: "COMPLETED",
    normalizedVerdict: "PASS",
    resultCode: "CLEAR",
    completedAt: new Date(),
  }).returning();

  // ── Shipment ──
  const [shipment] = await db.insert(coPhysicalShipments).values({
    supplierSubjectId: supplier.id,
    mineReference: "MINE-GH-2024-001",
    originCountry: "GH",
    brinksReference: "BRK-TEST-001",
    armoredCarrierName: "Brink's",
    shipmentStatus: "DELIVERED_TO_REFINERY",
    refinerySubjectId: refinery.id,
    dispatchedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  }).returning();

  // ── Custody Events ──
  const cocEventIds: string[] = [];

  const [pickup] = await db.insert(coChainOfCustodyEvents).values({
    shipmentId: shipment.id,
    eventType: "PICKUP",
    location: "Obuasi Gold Mine, Ghana",
    eventTimestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    partyFrom: "Gold Mine International",
    partyTo: "Brink's Ghana",
    sealNumber: "SEAL-001",
    verificationStatus: "VERIFIED",
  }).returning();
  cocEventIds.push(pickup.id);

  const [transport] = await db.insert(coChainOfCustodyEvents).values({
    shipmentId: shipment.id,
    eventType: "TRANSPORT",
    location: "In Transit — GH → CH",
    eventTimestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    partyFrom: "Brink's Ghana",
    partyTo: "Brink's Switzerland",
    sealNumber: "SEAL-001",
    verificationStatus: "VERIFIED",
  }).returning();
  cocEventIds.push(transport.id);

  const [delivery] = await db.insert(coChainOfCustodyEvents).values({
    shipmentId: shipment.id,
    eventType: "DELIVERY",
    location: "Metalor Technologies, Marin, Switzerland",
    eventTimestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    partyFrom: "Brink's Switzerland",
    partyTo: "Metalor Technologies",
    sealNumber: "SEAL-001",
    verificationStatus: "VERIFIED",
  }).returning();
  cocEventIds.push(delivery.id);

  // ── Refinery Lot ──
  const [lot] = await db.insert(coRefineryLots).values({
    shipmentId: shipment.id,
    supplierSubjectId: supplier.id,
    refinerySubjectId: refinery.id,
    receivedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    assayStatus: "COMPLETE",
    grossWeight: "100.0000",
    netWeight: "98.5000",
    fineness: "0.995000",
    recoverableGoldWeight: "97.9575",
    payableGoldWeight: "96.9779",
    payableValue: "195000.00",
    assayCertificateRef: "s3://assay/cert-test-001.pdf",
    settlementReady: true,
  }).returning();

  return {
    buyerSubjectId: buyer.id,
    supplierSubjectId: supplier.id,
    refinerySubjectId: refinery.id,
    policySnapshotId: policy.id,
    buyerCaseId: buyerCase.id,
    supplierCaseId: supplierCase.id,
    shipmentId: shipment.id,
    cocEventIds,
    refineryLotId: lot.id,
    fundingCheckId: fundingCheck.id,
    sanctionsCheckId: sanctionsCheck.id,
  };
}

/**
 * Seed a subject with cases and checks that have old completedAt dates
 * for freshness testing.
 */
export async function seedStaleChecksScenario(): Promise<{
  subjectId: string;
  caseId: string;
  sanctionsCheckId: string;
  kycCheckId: string;
  emailCheckId: string;
  policySnapshotId: string;
}> {
  const db = getTestDb();

  const [subject] = await db.insert(coSubjects).values({
    subjectType: "INDIVIDUAL",
    legalName: "Stale Check Test Subject",
    riskTier: "STANDARD",
    status: "ACTIVE",
  }).returning();

  const [policy] = await db.insert(coPolicySnapshots).values({
    version: 1,
    effectiveAt: new Date(),
    rulesPayload: {},
    createdBy: "system-test",
  }).returning();

  const [complianceCase] = await db.insert(coCases).values({
    subjectId: subject.id,
    caseType: "ONBOARDING",
    status: "APPROVED",
    priority: 10,
    policySnapshotId: policy.id,
  }).returning();

  // SANCTIONS check completed 200 days ago (TTL = 180 days → EXPIRED)
  const [sanctionsCheck] = await db.insert(coChecks).values({
    caseId: complianceCase.id,
    checkType: "SANCTIONS",
    provider: "OpenSanctions",
    status: "COMPLETED",
    normalizedVerdict: "PASS",
    resultCode: "CLEAR",
    completedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
  }).returning();

  // KYC_ID check completed 400 days ago (TTL = 365 days → EXPIRED)
  const [kycCheck] = await db.insert(coChecks).values({
    caseId: complianceCase.id,
    checkType: "KYC_ID",
    provider: "iDenfy",
    status: "COMPLETED",
    normalizedVerdict: "PASS",
    resultCode: "VERIFIED",
    completedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
  }).returning();

  // EMAIL check completed 500 days ago (TTL = 0 → never expires)
  const [emailCheck] = await db.insert(coChecks).values({
    caseId: complianceCase.id,
    checkType: "EMAIL",
    provider: "internal",
    status: "COMPLETED",
    normalizedVerdict: "PASS",
    resultCode: "VERIFIED",
    completedAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000),
  }).returning();

  return {
    subjectId: subject.id,
    caseId: complianceCase.id,
    sanctionsCheckId: sanctionsCheck.id,
    kycCheckId: kycCheck.id,
    emailCheckId: emailCheck.id,
    policySnapshotId: policy.id,
  };
}

/**
 * Seed a case with tasks for disposition testing.
 */
export async function seedCaseWithTasksScenario(): Promise<{
  subjectId: string;
  caseId: string;
  policySnapshotId: string;
  sanctionsCheckId: string;
  adverseMediaCheckId: string;
}> {
  const db = getTestDb();

  const [subject] = await db.insert(coSubjects).values({
    subjectType: "INDIVIDUAL",
    legalName: "Review Case Subject",
    riskTier: "HIGH",
    status: "ACTIVE",
  }).returning();

  const [policy] = await db.insert(coPolicySnapshots).values({
    version: 1,
    effectiveAt: new Date(),
    rulesPayload: {},
    createdBy: "system-test",
  }).returning();

  const [complianceCase] = await db.insert(coCases).values({
    subjectId: subject.id,
    caseType: "ONBOARDING",
    status: "OPEN",
    priority: 50,
    policySnapshotId: policy.id,
  }).returning();

  // SANCTIONS check with REVIEW verdict (triggers CLEAR_FALSE_POSITIVE task)
  const [sanctionsCheck] = await db.insert(coChecks).values({
    caseId: complianceCase.id,
    checkType: "SANCTIONS",
    provider: "OpenSanctions",
    status: "COMPLETED",
    normalizedVerdict: "REVIEW",
    resultCode: "POSSIBLE_MATCH",
    completedAt: new Date(),
  }).returning();

  // ADVERSE_MEDIA check with FAIL verdict (triggers REVIEW_ADVERSE_MEDIA task)
  const [adverseMediaCheck] = await db.insert(coChecks).values({
    caseId: complianceCase.id,
    checkType: "ADVERSE_MEDIA",
    provider: "internal",
    status: "COMPLETED",
    normalizedVerdict: "FAIL",
    resultCode: "NEGATIVE_MEDIA_FOUND",
    completedAt: new Date(),
  }).returning();

  return {
    subjectId: subject.id,
    caseId: complianceCase.id,
    policySnapshotId: policy.id,
    sanctionsCheckId: sanctionsCheck.id,
    adverseMediaCheckId: adverseMediaCheck.id,
  };
}
