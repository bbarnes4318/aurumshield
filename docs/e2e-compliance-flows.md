# E2E Compliance Flow Test Coverage

## Overview

Workstream 4 implements integration-style test coverage for the refinery-centered compliance operating system. Tests validate the full pipeline: subject onboarding → shipment integrity → refinery assay → settlement authorization → manual review → disposition.

**Test file:** `src/lib/__tests__/compliance-e2e-flows.test.ts`
**Framework:** Vitest
**Strategy:** Mock at Drizzle `getDb()` layer with realistic seed data, then call backend services directly

---

## Scenario Results

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | Clean Happy Path | ✅ PASS | Decision engine consumes normalized verdicts; refinery review transitions lot to SETTLEMENT_READY |
| 2 | Chain-of-Custody Gap | ✅ PASS | Shipment quarantined on integrity failure; review case opened; already-quarantined guard works |
| 3 | Refinery Assay Exception | ✅ PASS | ASSAY_NOT_COMPLETE guard, ALREADY_EXCEPTION guard, LotNotFoundError all verified |
| 4 | Stale Screening at Settlement | ✅ PASS | StaleScreeningError (>24h), WalletNotFoundError, NoScreeningFoundError all verified |
| 5 | Wallet Risk Block | ✅ PASS | SEVERE risk tier blocks settlement; LOW risk tier passes; sanctions exposure flags review |
| 6 | Manual Review / Four-Eyes | ✅ PASS | Same-reviewer blocked on high-priority cases; READY_FOR_DISPOSITION auto-transition validated |
| 7 | Rejection Flow | ✅ PASS | SANCTIONS_CONFIRMED_CODES hard-stop verified; POSSIBLE_MATCH correctly excluded |
| 8 | Event-Driven Re-Review | ✅ PASS | Wallet risk and assay exception both open review cases; documented limitations noted |

---

## Documented Backend Limitations

### 1. Non-wallet checks have NO TTL freshness gating
**Scenario 4 / Scenario 8**
- Only wallet screenings enforce 24h TTL via `StaleScreeningError`
- KYC, KYB, AML, PEP checks do NOT have TTL logic
- A subject approved 1 year ago remains approved unless EVENT_DRIVEN_REVIEW triggered
- **Risk:** Materially changed subject could proceed to settlement without re-screening
- **Mitigation:** Implement periodic re-screening as background job or policy-driven refresh

### 2. No periodic re-screening cron
**Scenario 8**
- Event-driven re-review only triggered by: wallet SEVERE/sanctions, assay exceptions, shipment integrity failures
- No automatic re-screening when external lists (OFAC, EU) update
- No background job for periodic re-screening interval

### 3. Veriff KYB webhook HMAC validation not implemented
- `veriff-kyb-adapter.ts` has TODO for webhook signature validation
- Webhook payloads accepted without cryptographic verification

### 4. iDenfy result retrieval not implemented
- `idenfy-adapter.ts` generates sessions only — no webhook handler or result retrieval

### 5. No co_settlement_gates table
- Settlement authorization pipeline verdict is persisted as a single record
- Individual gate-by-gate verdicts are not stored relationally

---

## Test Data Strategy

### Seed Data Factories
All tests use typed factory functions with realistic defaults:

| Factory | Fields | Purpose |
|---------|--------|---------|
| `makeSubject()` | id, subjectType, legalName, status, riskTier, jurisdiction | Compliance subject |
| `makeCase()` | id, subjectId, caseType, status, priority, assignedReviewerId | Compliance case |
| `makeCheck()` | caseId, checkType, normalizedVerdict, resultCode, providerName | Compliance check |
| `makeShipment()` | id, shipmentStatus, supplierSubjectId, custodianName | Physical shipment |
| `makeLot()` | id, assayStatus, grossWeightOz, fineness, payableValueUsd | Refinery lot |
| `makeWallet()` | id, address, chain, asset, walletStatus | Wallet address |
| `makeScreening()` | id, riskTier, riskScore, sanctionsExposure, screenedAt | Wallet screening |
| `makePolicySnapshot()` | id, version, effectiveAt | Policy snapshot |

### Provider Fixtures (from Workstream 3)
Located at `src/lib/compliance/__fixtures__/provider-fixtures.ts`:
- KYC: 4 scenarios
- KYB: 3 scenarios
- AML: 5 scenarios
- Elliptic: 5 scenarios
- GLEIF LEI: 4 scenarios
- Inscribe: 2 scenarios
- Normalized checks (co_checks-compatible): 8 scenarios

---

## Cross-Cutting Assertions

| Assertion | Verified |
|-----------|----------|
| Evidence hashing called during decisions | ✅ |
| Audit event function available and callable | ✅ |
| Business logic uses normalizedVerdict only | ✅ |
| Raw provider fields never reach decision engine | ✅ |
| SANCTIONS_CONFIRMED_CODES excludes POSSIBLE_MATCH | ✅ |
| Four-Eyes threshold = priority >= 80 or HIGH/ENHANCED risk | ✅ |

---

## Files

| File | Type | Purpose |
|------|------|---------|
| `src/lib/__tests__/compliance-e2e-flows.test.ts` | NEW | 20+ test cases across 8 scenarios |
| `src/lib/compliance/__fixtures__/provider-fixtures.ts` | NEW (WS3) | 32 provider-specific fixtures |
| `docs/provider-normalization-audit.md` | NEW (WS3) | Provider audit documentation |
| `docs/e2e-compliance-flows.md` | NEW | This document |
