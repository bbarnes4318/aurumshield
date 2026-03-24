# Prompt 5 — Real DB-Backed Integration Harness

## 1. Test DB Strategy

**Approach**: Ephemeral Docker PostgreSQL 16 container on port `5433`.

- **No volume mount** — fully destroyed on `docker compose -f docker-compose.test.yml down`
- **Isolated** — separate DB name (`aurumshield_test`), user (`test_user`), port (`5433`)
- **Deterministic** — tables truncated between tests, migrations re-run on setup
- **Compatible** — all 29 SQL migrations run in order via the same runner pattern as production

```
DATABASE_URL=postgresql://test_user:test_pass@localhost:5433/aurumshield_test
```

## 2. Setup / Bootstrap

### Files

| File | Purpose |
|------|---------|
| `docker-compose.test.yml` | Ephemeral Postgres container |
| `vitest.config.integration.ts` | Separate Vitest config for `*.integration.test.ts` |
| `src/lib/__tests__/integration/db-harness.ts` | DB lifecycle: setup, migrate, seed, reset, teardown |

### How It Works

1. `setupTestDb()` connects to the test Postgres via `DATABASE_URL`
2. Runs all 29 SQL migrations from `src/db/migrations/` in order
3. Creates a real Drizzle ORM instance with the compliance schema
4. **Patches** `getDb()` and `getPoolClient()` so that real service code (settlement engine, case service, etc.) hits the test database — no mocks
5. `resetTestDb()` truncates all `co_*` tables between tests (CASCADE)
6. `teardownTestDb()` ends the pool connection

### Seed Factories

| Factory | Creates |
|---------|---------|
| `seedSettlementScenario()` | Full pipeline: 3 subjects, policy, 2 cases, 2 checks, shipment, 3 CoC events, lot |
| `seedStaleChecksScenario()` | Subject with checks at various ages for TTL testing |
| `seedCaseWithTasksScenario()` | Case with REVIEW/FAIL checks for task generation |

## 3. Migrations Used

All 29 migrations run in sequence:
- `001` through `027`: Pre-existing schema (buyer journey, onboarding, quotes, DVP, clearing, etc.)
- `028_compliance_os_foundation.sql`: Full Compliance OS schema (14 tables, 14 enums)
- `029_type_enum_hardening.sql`: VARCHAR → enum promotion for 6 columns

## 4. Tests Added

### 6 integration test files, 39 tests total

| File | Tests | Flow |
|------|-------|------|
| `settlement-gate-persistence.integration.test.ts` | 5 | Full 6-gate pipeline, gate rows, audit events, idempotency, rejection |
| `check-freshness-persistence.integration.test.ts` | 6 | TTL expiry, EXPIRED verdict write, audit events, idempotent re-eval |
| `case-task-disposition.integration.test.ts` | 6 | Assignment, task generation, completion gating, READY_FOR_DISPOSITION |
| `shipment-lot-persistence.integration.test.ts` | 5 | Supply chain CRUD, status transitions, updated_at triggers |
| `audit-chain-integrity.integration.test.ts` | 5 | Hash chain linkage, verifyAuditChain(), chronological ordering |
| `schema-constraints.integration.test.ts` | 12 | Enum acceptance/rejection, FK enforcement, ON DELETE RESTRICT, NOT NULL |

## 5. What These Tests Prove

- **Settlement authorization pipeline** correctly writes `co_settlement_authorizations` and `co_settlement_gates` rows when all 6 gates pass
- **Gate-level persistence** is explainable — each gate has its own row with result and evidence reference
- **Check freshness service** correctly marks expired checks with `EXPIRED` verdict in the database and generates `CHECK_EXPIRED` audit events
- **Case/task lifecycle** correctly transitions through assignment → task generation → completion → READY_FOR_DISPOSITION
- **Audit hash chain** maintains cryptographic integrity — `verifyAuditChain()` detects valid chains
- **Schema constraints** enforce data integrity at the database level (enums, FKs, NOT NULL, ON DELETE RESTRICT)
- **Migrations execute cleanly** against a fresh PostgreSQL instance

## 6. What These Tests Do NOT Prove

> [!WARNING]
> These are real DB-backed integration tests, NOT full production E2E tests.

They do **not** validate:
- Live external provider APIs (Elliptic, iDenfy, OpenSanctions live endpoints)
- Real AWS infrastructure (RDS, Secrets Manager, ECS, S3)
- Production webhook delivery (Clerk, Svix)
- Real Clerk authentication or session management
- Real blockchain/wallet interactions (Turnkey MPC, on-chain verification)
- Network-level security (VPC, security groups, TLS termination)
- Concurrent multi-user access patterns under production load

## 7. How to Run

### Locally

```bash
# 1. Start the ephemeral test Postgres container
npm run test:integration:up

# 2. Run integration tests
npm run test:integration

# 3. Tear down (destroys all data)
npm run test:integration:down
```

### In CI

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_DB: aurumshield_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    ports:
      - 5433:5432

steps:
  - run: npm run test:integration
    env:
      DATABASE_URL: postgresql://test_user:test_pass@localhost:5433/aurumshield_test
```

### Prerequisites

- Docker Desktop running (for `docker compose`)
- Node.js 20+ with dependencies installed (`npm install`)

## 8. Remaining Persistence-Layer Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| No concurrent write testing | Medium | Add load tests in a future prompt |
| No real Clerk session in auth-protected action tests | Medium | Auth boundary tested via mocked tests; real DB validates data layer |
| No production-scale data volume tests | Low | Seed factories use minimal data; index performance not validated |
| Updated_at triggers are DB-level, not application-level | Low | Trigger existence validated; correctness proven by DB engine |
| No cross-migration rollback testing | Low | Migrations are forward-only; rollback is a manual operational procedure |

## 9. Standard vs Integration Test Isolation

The test system uses two **completely separate** Vitest configurations to ensure standard unit tests and real DB-backed integration tests never interfere.

### Boundary Mechanism

| Config | Includes | Excludes |
|--------|----------|----------|
| `vitest.config.ts` (default) | `src/**/*.test.ts` | `src/**/*.integration.test.ts` |
| `vitest.config.integration.ts` | `src/**/*.integration.test.ts` | — |

**Naming convention**: integration test files MUST use the `.integration.test.ts` suffix. This is the single discriminator.

### Command Matrix

| Command | What Runs | Requires DB |
|---------|-----------|-------------|
| `npx vitest run` | Standard/unit tests only (394 tests) | No |
| `npm run test:integration` | Integration tests only (39 tests) | Yes — Docker |
| `npm run test:integration:up` | Starts ephemeral Postgres container | Docker |
| `npm run test:integration:down` | Tears down the container | Docker |

### What Was Fixed (Prompt 5B)

The original Prompt 5 delivery had `vitest.config.ts` without an `exclude` rule, causing the 6 `*.integration.test.ts` files to be picked up by `npx vitest run`. This was fixed by adding `exclude: ["src/**/*.integration.test.ts"]` to the default config.

