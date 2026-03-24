# AurumShield

Institutional, refinery-centered gold settlement and compliance platform.

AurumShield manages the full lifecycle of physical gold from mine origin through armored logistics, refinery assay, and final settlement. Gold is sourced directly from mines, transported via controlled armored logistics (Brink's, Malca-Amit), sent to a refinery for mandatory purity testing, and only after assay confirmation does the platform authorize settlement. The buyer pays exclusively for assay-confirmed payable output.

## Domain Architecture

| Domain | Purpose |
|---|---|
| `aurumshield.vip` | Marketing site, legal pages, investor materials |
| `app.aurumshield.vip` | Authenticated application (portals, settlement, compliance) |

The middleware layer enforces host-based routing — application routes accessed on the marketing domain are 307-redirected to the app domain where Clerk authentication is enforced.

---

## High-Level Architecture

- **Framework:** Next.js 16 (app router)
- **Auth:** [Clerk](https://clerk.com) (SOC 2 Type II) — session tokens, RBAC via org roles, MFA
- **Database:** PostgreSQL 15 via [Drizzle ORM](https://orm.drizzle.team) — 28 versioned migrations
- **Deployment:** AWS ECS Fargate (blue/green), ECR, ALB, RDS (private subnets only)
- **CI/CD:** GitHub Actions with OIDC federation (zero static AWS keys), tag-gated (`v*`) releases
- **Styling:** Tailwind CSS 4

### Core Pipeline

```
Mine → Armored Logistics → Refinery → Assay → Settlement Authorization → Payout
```

Every settlement must pass a 6-gate fail-closed compliance pipeline before funds move.

---

## Major Subsystems

### Marketing Shell
Public-facing pages: landing, investor briefs, legal/compliance disclosures, platform overview. No authentication required.

### App Shell
Authenticated application layout with sidebar navigation. Houses all portal UIs and compliance workflows. Clerk-gated.

### Compliance OS (`co_*` tables)
Refinery-centered compliance operating system built on a normalized PostgreSQL schema:
- **Subjects** — entities (individuals, companies, mines, refineries) with risk tiers and status tracking
- **Cases** — verification lifecycle containers (IDENTITY_VERIFICATION, SETTLEMENT_AUTHORIZATION, PERIODIC_REVIEW, etc.)
- **Checks** — individual screening results (SANCTIONS, PEP, KYC_ID, KYB, WALLET_KYT, etc.) with normalized verdicts (PASS/FAIL/REVIEW/EXPIRED)
- **Decisions** — algorithmic verdicts with cryptographic evidence hashes
- **Policy Snapshots** — immutable policy state captured at decision time

### Operator UI
Admin-facing supervisory interfaces for compliance case management, settlement operations, and audit review.

### Settlement Engine
Pure, deterministic state machine governing escrow lifecycle:
`ESCROW_OPEN → AUTHORIZED → PROCESSING_RAIL → SETTLED`
with dual-control DvP (Authorize → Execute), terminal state guards, and role-gated actions via `ACTION_ROLE_MAP`.

### Settlement Authorization Service
6-gate fail-closed pipeline:
1. **Buyer Approval** — subject ACTIVE with APPROVED compliance case
2. **Supplier Approval** — supplier ACTIVE, no sanctions exposure
3. **Shipment Integrity** — not QUARANTINED, all chain-of-custody events VERIFIED
4. **Refinery Truth** — assay COMPLETE, payable gold weight determined
5. **Funding Readiness** — source-of-funds or wallet screening verified and fresh (90-day TTL)
6. **Policy Hash** — snapshot captured, cryptographic decision hash generated

Gate results are persisted to `co_settlement_gates` for audit queryability.

### Audit & Events
Immutable audit trail via `appendEvent()` across all compliance and settlement operations. Double-entry clearing ledger with database-level immutability triggers (UPDATE/DELETE blocked on `ledger_entries`).

### Webhook Infrastructure
HMAC-SHA256 verified webhook handlers for:
- **Clerk** — identity sync (Svix signatures)
- **Column Bank** — Fedwire settlement events (timing-safe comparison)
- **Veriff** — KYB decision callbacks
- **iDenfy** — KYC/AML result ingestion

### Cron Infrastructure
Production-wired scheduled jobs at `/api/cron/*`:
- `stale-check-sweep` — daily TTL-based freshness scan, marks expired checks, opens PERIODIC_REVIEW cases
- `sanctions-refresh` — weekly proactive re-screening for approaching-expiry sanctions/PEP checks
- `sync-sanctions` — sanctions list synchronization

All cron routes require `Bearer CRON_SECRET_KEY` authentication.

---

## Local Development

### Required Environment Variables

Create `.env.local` with the following groups:

**Authentication (Clerk)**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/platform
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/platform
CLERK_WEBHOOK_SECRET=...
```

**Database**
```
DATABASE_URL=postgresql://...
```

**Identity Verification**
```
VERIFF_API_KEY=...
VERIFF_API_SECRET=...
IDENFY_API_KEY=...
IDENFY_API_SECRET=...
IDENFY_WEBHOOK_SECRET=...
ACTIVE_COMPLIANCE_PROVIDER=IDENFY
PERSONA_API_KEY=...
NEXT_PUBLIC_PERSONA_TEMPLATE_ID=...
```

**AML / Sanctions**
```
OPENSANCTIONS_API_KEY=...
YENTE_URL=http://localhost:8000
```

**Banking & Settlement**
```
COLUMN_API_KEY=...
COLUMN_WEBHOOK_SECRET=...
SETTLEMENT_RAIL=auto
SETTLEMENT_ENTERPRISE_THRESHOLD=25000000
TURNKEY_ORGANIZATION_ID=...
TURNKEY_API_PUBLIC_KEY=...
TURNKEY_API_PRIVATE_KEY=...
```

**Fraud Detection**
```
NEXT_PUBLIC_FINGERPRINT_API_KEY=...
FINGERPRINT_SERVER_SECRET=...
```

**Domain Split**
```
NEXT_PUBLIC_ROOT_URL=https://aurumshield.vip
NEXT_PUBLIC_APP_URL=https://app.aurumshield.vip
```

**Cron / Scheduled Jobs**
```
CRON_SECRET_KEY=...
```

**Mock Mode (optional)**
```
FORCE_MOCK_MODE=true
```

### Database Setup

PostgreSQL 15 is required. Migrations are run via:

```bash
npm run db:migrate
```

This executes all 28 SQL migrations in `src/db/migrations/` sequentially.

### Running the Dev Server

```bash
npm run dev
```

### Demo Mode vs Real Auth Mode

Set `FORCE_MOCK_MODE=true` in `.env.local` to bypass all third-party API calls. When enabled, every service returns deterministic mock data regardless of whether individual credentials are configured. When unset (or any value other than `"true"`), each service independently checks its own credentials and makes live API calls.

Demo mode allows the full UI and settlement flows to be exercised without real provider accounts.

### TypeScript Check

```bash
npx tsc --noEmit
```

### Tests

```bash
npx vitest run
```

Tests are Vitest-based and use `@` path aliases. The test suite mocks `getDb()` to return controlled row sets — it validates business logic flow without requiring a live database. See [Testing Notes](#testing-notes) below for scope details.

---

## Compliance Architecture Summary

### Schema (`co_*` tables — Migration 028)

| Table | Purpose |
|---|---|
| `co_subjects` | Entities under compliance supervision (risk tier, status, jurisdiction) |
| `co_cases` | Verification lifecycle containers |
| `co_checks` | Individual screening results with normalized verdicts |
| `co_decisions` | Algorithmic verdicts with evidence hashes |
| `co_review_tasks` | Manual review assignments (four-eyes enforcement) |
| `co_policy_snapshots` | Immutable policy state at decision time |
| `co_physical_shipments` | Mine-to-refinery shipment tracking |
| `co_chain_of_custody_events` | Append-only custody handoff records |
| `co_refinery_lots` | Assay results (fineness, recoverable gold, payable value) |
| `co_wallet_addresses` | Crypto wallet registration |
| `co_wallet_screenings` | KYT screening results (Elliptic) |
| `co_settlement_authorizations` | 6-gate authorization records |
| `co_settlement_gates` | Per-gate pass/fail evidence |
| `co_audit_events` | Immutable compliance event log |

### Fail-Closed Behavior

Every compliance gate and screening check follows fail-closed semantics:
- Provider API unreachable → `COMPLIANCE_OFFLINE` (not `CLEARED`)
- Check expired beyond TTL → `EXPIRED` verdict (treated as `MISSING` by decision engine)
- Missing chain-of-custody events → `COMPLIANCE_HOLD`
- Any gate failure in settlement pipeline → halt, no partial authorizations

### Shipment → Refinery → Assay → Settlement Model

1. **Shipment created** — supplier, custodian (Brink's), origin country, destination refinery
2. **Chain-of-custody events** recorded at each handoff (pickup, transit, customs, intake)
3. **Shipment review** — integrity validation (seal, handoff count, missing segments)
4. **Refinery lot** created on intake — gross weight, net weight, fineness, recoverable gold
5. **Assay completion** — refinery determines payable gold weight and value
6. **Physical validation** — economics validated (fineness floor, weight variance, value delta)
7. **Settlement authorization** — 6-gate pipeline evaluates all compliance controls
8. **Payout** — funds released only after all gates pass

---

## Deployment / Staging Notes

### Deployment Pipeline

Deployments are triggered by pushing `v*` tags to the `bbarnes4318/aurumshield` repository. GitHub Actions builds a Docker image (SHA-tagged), pushes to ECR, and updates ECS Fargate with a rolling deployment. See `.github/workflows/` for pipeline configuration.

### Migrations

Database migrations must be run manually against the target environment before or after deployment:

```bash
npm run db:migrate
```

Migration 028 (`028_compliance_os_foundation.sql`) is the largest — it creates the entire `co_*` schema with ENUMs, constraints, and indexes.

### Cron Routes

Cron routes (`/api/cron/*`) require a `CRON_SECRET_KEY` environment variable. In AWS, these are triggered via EventBridge scheduled rules pointing at the ALB endpoint.

### Webhook Secrets

All webhook endpoints require their respective secrets to be configured:
- `CLERK_WEBHOOK_SECRET` — Svix HMAC verification
- `COLUMN_WEBHOOK_SECRET` — Fedwire event verification (timing-safe)
- `VERIFF_WEBHOOK_SECRET` — KYB result verification
- `IDENFY_WEBHOOK_SECRET` — KYC/AML result verification

Missing webhook secrets cause different behavior:
- Column: fails closed (rejects all webhooks)
- Veriff/iDenfy: warns but continues in dev mode

### Staging vs Production

Production uses AWS Secrets Manager for all server-side secrets (25+). Staging may use `.env.production` with `FORCE_MOCK_MODE=true`. Never run staging with production banking credentials.

---

## Testing Notes

### Test Strategy

The test suite (`src/lib/__tests__/`) uses Vitest with mocked database layers:

- **DB mocking:** `getDb()` is mocked to return controlled row sets via `buildMockDbChain()`
- **Service-level validation:** Tests call service functions directly (decision engine, refinery review, wallet risk, etc.)
- **Fail-closed enforcement:** Dedicated tests verify that provider failures always produce errors, never false `CLEARED` results

### What Is Tested

| Area | Type | What It Validates |
|---|---|---|
| Decision engine | Logic flow (mocked DB) | Normalized verdict consumption, sanctions hard-stops, APPROVED/REJECTED routing |
| Refinery review | Logic flow (mocked DB) | Assay status guards, economics validation, SETTLEMENT_READY transitions |
| Wallet risk | Logic flow (mocked DB) | Stale screening TTL (24h), SEVERE risk blocks, sanctions exposure flagging |
| Shipment review | Logic flow (mocked DB) | Chain-of-custody integrity, QUARANTINED transitions |
| AML screening | Integration (mocked fetch) | Yente API consumption, score thresholds, fail-closed on timeout/error |
| Settlement state machine | Pure logic | State transitions, terminal guards, DvP preconditions |
| Clearing journal | Pure logic | Double-entry balance assertion, immutability contracts |

### Current Limitations

- Tests do **not** connect to a real database — all DB interactions are mocked
- Drizzle ORM chain mocking may not perfectly replicate real query behavior; tests use try/catch with guard assertions as fallback
- No browser/E2E tests in the Vitest suite (Playwright configuration exists but is not part of the compliance test suite)
- Full production validation requires staging deployment with real database and provider credentials

---

## License

Proprietary. All rights reserved.
