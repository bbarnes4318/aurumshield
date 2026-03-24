# Final Architecture Hardening — Workstream 5

## Overview

Targeted hardening pass to close operational/compliance gaps surfaced by Workstreams 3 and 4. All changes preserve the refinery-centered, fail-closed, server-authoritative compliance model.

---

## Part 1 — Non-Wallet Check TTL Freshness Gating

**File:** `src/lib/compliance/check-freshness-service.ts`

### TTL Matrix

| Check Type | TTL (days) | Override Env |
|---|---|---|
| SANCTIONS / PEP / ADVERSE_MEDIA / SANCTIONS_ORIGIN | 180 | `CHECK_TTL_SANCTIONS_DAYS` etc. |
| KYC_ID / KYB_REGISTRATION / UBO / LEI / SOURCE_OF_FUNDS / SOURCE_OF_WEALTH / PROOF_OF_ADDRESS | 365 | `CHECK_TTL_KYC_ID_DAYS` etc. |
| LIVENESS | 730 | `CHECK_TTL_LIVENESS_DAYS` |
| WALLET_KYT | 1 | (handled by wallet-risk-service) |
| EMAIL / PHONE / CHAIN_OF_CUSTODY / TRANSPORT_INTEGRITY / REFINERY_LOT_MATCH / REFINERY_ASSAY_CONFIRMATION | 0 (no expiry) | — |

### How It Works
1. `evaluateCheckFreshness(check, now)` → pure function, returns `CheckFreshnessResult`
2. `evaluateSubjectCheckFreshness(subjectId, userId)` → evaluates all checks for a subject, marks expired checks with `EXPIRED` verdict in `co_checks`, logs `CHECK_EXPIRED` audit events
3. Decision engine already handles `EXPIRED` verdict (treating it as `MISSING` — fails closed)

### Env Override Pattern
Set `CHECK_TTL_<CHECK_TYPE>_DAYS=90` to override defaults per check type.

---

## Part 2 — Periodic Re-Screening Scaffold

**File:** `src/lib/compliance/rescreening-jobs.ts`

### Jobs

| Job | Purpose | Recommended Schedule |
|---|---|---|
| `runStaleCheckSweep()` | Scans all ACTIVE subjects, marks expired checks, opens PERIODIC_REVIEW cases | Daily at 02:00 UTC |
| `runSanctionsRefresh()` | Proactively flags subjects with high-risk checks (SANCTIONS/PEP/ADVERSE_MEDIA) approaching expiry within 30 days | Weekly on Mondays at 03:00 UTC |

### Production Wiring

These are **scheduler-agnostic** async functions. Wire them to:
- **AWS Lambda + EventBridge** (scheduled rule)
- **Vercel Cron** (vercel.json cron config)
- **BullMQ / pg-boss** (worker queue)
- **node-cron / system crontab**

Example (Vercel Cron):
```json
{
  "crons": [
    { "path": "/api/cron/stale-check-sweep", "schedule": "0 2 * * *" },
    { "path": "/api/cron/sanctions-refresh", "schedule": "0 3 * * 1" }
  ]
}
```

---

## Part 3 — Veriff KYB Webhook HMAC Validation

**Files:**
- `src/lib/compliance/webhook-validation.ts` (shared utility)
- `src/lib/compliance/veriff-kyb-adapter.ts` (updated)

### Behavior
1. `processKYBDecision(rawBody, signatureHeader, webhookPayload)` validates HMAC-SHA256 signature **before** payload processing
2. Uses `VERIFF_WEBHOOK_SECRET` env variable
3. Timing-safe comparison via `crypto.timingSafeEqual`
4. Strips `sha256=` prefix for compatibility
5. Throws `VeriffWebhookAuthError` on mismatch (fail-closed)
6. If `VERIFF_WEBHOOK_SECRET` not configured: warns but continues (dev mode)

### Required Env
```
VERIFF_WEBHOOK_SECRET=your-webhook-secret-from-veriff-dashboard
```

---

## Part 4 — iDenfy Result Retrieval / Webhook

**File:** `src/lib/compliance/idenfy-webhook-handler.ts`

### Pipeline
1. HMAC signature validation (if `IDENFY_WEBHOOK_SECRET` configured)
2. Payload structure validation
3. Status normalization:
   - `APPROVED` → `PASS` / `VERIFIED`
   - `DENIED` → `FAIL` / `DENIED`
   - `SUSPECTED` → `REVIEW` / `SUSPECTED`
   - `EXPIRED` → `EXPIRED` / `SESSION_EXPIRED`
   - `REVIEWING` / `ACTIVE` → no verdict (still in progress)
4. Updates matching `co_checks` record by provider reference (`rawPayloadRef = scanRef`)
5. Logs `IDENFY_RESULT_RECEIVED` audit event

### Required Env
```
IDENFY_WEBHOOK_SECRET=your-webhook-secret-from-idenfy-dashboard
```

---

## Part 5 — Settlement Gate Persistence

**File:** `src/db/schema/compliance.ts`

### Schema: `co_settlement_gates`

| Column | Type | Purpose |
|---|---|---|
| id | UUID PK | Gate record ID |
| settlement_authorization_id | UUID FK → co_settlement_authorizations | Parent authorization |
| gate_type | Enum | Gate category (8 types) |
| result | Enum | PASS / FAIL / BLOCKED / SKIPPED / PENDING |
| detail | TEXT | Human-readable explanation |
| evidence_ref | TEXT | Link to evidence hash or document |
| evaluated_at | TIMESTAMPTZ | When the gate was evaluated |

### Gate Types
1. `BUYER_APPROVED` — Buyer subject screening valid
2. `SUPPLIER_APPROVED` — Supplier/mine screening valid
3. `SHIPMENT_INTEGRITY` — Chain of custody complete
4. `REFINERY_ASSAY_TRUTH` — Refinery assay confirmed
5. `PAYMENT_READINESS` — Funding/payment rail verified
6. `SANCTIONS_CLEAR` — No sanctions exposure
7. `WALLET_RISK_CLEAR` — Wallet risk tier acceptable
8. `FINAL_POLICY_GATE` — All policy conditions met

### Migration Required
Generate and run a Drizzle migration to create the `co_settlement_gates` table:
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

---

## Audit Trail Extensions

**File:** `src/lib/compliance/audit-log.ts`

Added to `V3_AGGREGATE_TYPES`:
- `COMPLIANCE_CHECK`, `COMPLIANCE_SUBJECT`, `SYSTEM`

Added to `V3_EVENT_TYPES` and `V3EventPayloadMap`:
- `CHECK_EXPIRED`, `PERIODIC_REVIEW_OPENED`, `PROACTIVE_RESCREEN_TRIGGERED`
- `STALE_CHECK_SWEEP_COMPLETED`, `SANCTIONS_REFRESH_COMPLETED`, `IDENFY_RESULT_RECEIVED`

---

## Remaining Risks

1. ~~No automated cron wiring yet~~ → **CLOSED** (closure pass)
2. **iDenfy AML sub-check parsing** — webhook handler captures AML metadata but doesn't normalize individual AML service results into separate co_checks yet
3. ~~Settlement gate persistence is schema-only~~ → **CLOSED** (closure pass)
4. **Veriff remains mock-backed** — HMAC validation works but session creation/status still use deterministic mock responses

---

## Closure Pass — Settlement Gate Write Path

**File:** `src/lib/compliance/settlement-authorization-service.ts`

### What Changed
- Added `GATE_NAME_TO_TYPE` mapping from internal gate names to `co_settlement_gate_type` enum values
- Added `persistGateResults()` helper — writes one `co_settlement_gates` row per evaluated gate
- Called after `co_settlement_authorizations` insert (line ~590)
- Uses idempotent delete-before-insert strategy for re-evaluation safety
- Added `getSettlementGates(authorizationId)` query helper for read-side consumption
- Added `gatesPersisted` to `SettlementAuthorizationDecidedPayload` audit type

### Gate Mapping

| Service Gate Name | Schema Gate Type |
|---|---|
| BUYER_APPROVAL | BUYER_APPROVED |
| SUPPLIER_APPROVAL | SUPPLIER_APPROVED |
| SHIPMENT_INTEGRITY | SHIPMENT_INTEGRITY |
| REFINERY_TRUTH | REFINERY_ASSAY_TRUTH |
| FUNDING_READINESS | PAYMENT_READINESS |
| POLICY_HASH | FINAL_POLICY_GATE |

> Note: `SANCTIONS_CLEAR` and `WALLET_RISK_CLEAR` are in the enum but not yet evaluated as standalone gates — they are currently evaluated inline within Gate 2 (Supplier Approval) and Gate 5 (Funding Readiness). These can be split into dedicated gates in a future iteration.

---

## Closure Pass — Production Cron Routes

### Routes Added

| Route | Method | Job | Schedule |
|---|---|---|---|
| `/api/cron/stale-check-sweep` | POST | `runStaleCheckSweep()` | Daily 02:00 UTC |
| `/api/cron/sanctions-refresh` | POST | `runSanctionsRefresh()` | Weekly Mon 03:00 UTC |

### Auth Pattern
Both routes use the existing `Bearer CRON_SECRET_KEY` pattern from `api/cron/sync-sanctions`.

### AWS EventBridge Wiring
```json
{
  "Source": "aurumshield.cron",
  "DetailType": "Scheduled Compliance Job",
  "RuleName": "stale-check-sweep-daily",
  "ScheduleExpression": "cron(0 2 * * ? *)",
  "Target": "POST https://<domain>/api/cron/stale-check-sweep",
  "Headers": { "Authorization": "Bearer <CRON_SECRET_KEY>" }
}
```

### Vercel Cron Wiring
```json
{
  "crons": [
    { "path": "/api/cron/stale-check-sweep", "schedule": "0 2 * * *" },
    { "path": "/api/cron/sanctions-refresh", "schedule": "0 3 * * 1" }
  ]
}
```

### Required Env
```
CRON_SECRET_KEY=...  # Already in use for sync-sanctions
```
