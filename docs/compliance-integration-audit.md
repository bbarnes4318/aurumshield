# Compliance OS Integration Audit — Workstream 1 Findings

**Date:** 2026-03-23
**Scope:** Full consistency audit of V3 Compliance Operating System
**Files Audited:** 23 compliance service files, schema, migration, UI references

---

## ✅ Confirmed Aligned Areas

| Area | Status | Notes |
|------|--------|-------|
| Schema enums (14 total) | ✅ Aligned | All V3 enums exist in both Drizzle schema and SQL migration |
| Audit event types (16 total) | ✅ Aligned | All event types registered in `V3_EVENT_TYPES` have matching payload interfaces |
| Case status enum | ✅ Aligned | 12 states including `READY_FOR_DISPOSITION` — schema, migration, services all agree |
| Shipment status enum | ✅ Aligned | 9 states including `CLEARED_FOR_INTAKE` — used consistently in review engines |
| Assay status enum | ✅ Aligned | 8 states including `SETTLEMENT_READY` — schema, migration, refinery services agree |
| Decision engine (Phase 3.1) | ✅ Aligned | Uses correct V3 enums, proper sanctions hard-stop, subject SUSPENDED/ACTIVE |
| Wallet risk service (Phase 3.2) | ✅ Aligned | Correct FROZEN/BLOCKED statuses, EVENT_DRIVEN_REVIEW case creation |
| Physical validation (Phase 3.3) | ✅ Aligned | Correct seal/timeline logic, feeds Phase 4 engines |
| Shipment review (Phase 4.1) | ✅ Aligned | QUARANTINED/CLEARED_FOR_INTAKE transitions correct |
| Refinery review (Phase 4.2) | ✅ Aligned | ASSAY_EXCEPTION/SETTLEMENT_READY transitions correct |
| Case service (Phase 5.1) | ✅ Aligned | 12 task rules, READY_FOR_DISPOSITION gate works |
| Manual disposition (Phase 5.2) | ✅ Mostly | Four-Eyes logic correct, see Finding #5 for gap |
| `co_cases.assigned_reviewer_id` | ✅ Present | Column exists in schema, indexed, used by case-service |
| Hash chaining (audit events) | ✅ Aligned | `appendEvent` → `generateChainedHash` → immutable trail |

---

## 🔴 Finding #1 — Settlement Gate 4 Assay Status Check (**BLOCKING**)

**Issue:** Settlement authorization service Gate 4 (line 345) only accepts `assayStatus === "COMPLETE"`:
```typescript
const assayComplete = lot.assayStatus === "COMPLETE";
```
But the refinery review engine transitions approved lots to `SETTLEMENT_READY`. This means a lot that passes automated review is **locked out of settlement** because Gate 4 rejects it.

**Files affected:**
- `src/lib/compliance/settlement-authorization-service.ts` (line 345)
- `src/lib/compliance/refinery-review-engine.ts` (transitions to `SETTLEMENT_READY`)

**Fix:** Gate 4 must accept **both** `COMPLETE` and `SETTLEMENT_READY`:
```typescript
const assayComplete = lot.assayStatus === "COMPLETE" || lot.assayStatus === "SETTLEMENT_READY";
```

**Priority:** 🔴 BLOCKING — Settlement cannot proceed for reviewed lots.

---

## 🟡 Finding #2 — Legacy V1 System Coexistence (**MEDIUM**)

**Issue:** Three files operate on a completely separate data model alongside V3:

| File | Table Used | Status System |
|------|-----------|---------------|
| `models.ts` | `compliance_cases` (raw SQL) | OPEN, PENDING_USER, PENDING_PROVIDER, UNDER_REVIEW, APPROVED, REJECTED, CLOSED |
| `events.ts` | `compliance_events` (raw SQL) | PG LISTEN/NOTIFY on separate channel |
| `compliance-engine.ts` | V1 via `models.ts` | `authorizeTradeExecution()` — trade-centered, not settlement-centered |

V3 uses `co_cases` (Drizzle) with: DRAFT, OPEN, AWAITING_SUBJECT, AWAITING_PROVIDER, AWAITING_INTERNAL_REVIEW, ESCALATED, READY_FOR_DISPOSITION, APPROVED, REJECTED, SUSPENDED, EXPIRED, CLOSED.

**These are parallel systems, not conflicting.** V1 handles the frontend buyer/counterparty onboarding flow. V3 handles the refinery-centered backend compliance engine. They coexist correctly because:
- V1 `compliance_cases` table is user-facing onboarding (Veriff/iDenfy flow)
- V3 `co_cases` table is the subject-level compliance case system
- The decision engine (V3) correctly creates `co_subjects` and `co_cases`

**Recommendation:** No immediate fix required. The V1 system should be deprecated in a future phase when the V3 subject onboarding UI is built. For now, label the legacy files clearly.

**Priority:** 🟡 MEDIUM — Not blocking, but creates confusion for future developers.

---

## 🟡 Finding #3 — Disposition Engine Missing `SETTLEMENT_AUTHORIZATION` Route (**MEDIUM**)

**Issue:** `manual-review-rules.ts` `executeApproval()` handles these case types:
- Identity cases (ONBOARDING, PERIODIC_REVIEW, EVENT_DRIVEN_REVIEW, WALLET_REVIEW, TRAINING_CERTIFICATION)  → `SUBJECT_ACTIVATED`
- `PHYSICAL_SHIPMENT_REVIEW` → `SHIPMENT_CLEARED_FOR_INTAKE`
- `REFINERY_INTAKE_REVIEW` → `LOT_CLEARED_FOR_SETTLEMENT`
- Default → `CASE_APPROVED`

**Missing:** `SETTLEMENT_AUTHORIZATION` case type has no explicit routing. It falls through to the generic default. This is **acceptable for now** because settlement cases are auto-approved by the 6-gate pipeline, but if a settlement case ever needs manual review, the disposition engine won't trigger the correct downstream action (i.e., creating the `co_settlement_authorizations` record).

**Files affected:**
- `src/lib/compliance/manual-review-rules.ts` (executeApproval function)

**Fix:** Add explicit `SETTLEMENT_AUTHORIZATION` case handling that creates the settlement authorization record.

**Priority:** 🟡 MEDIUM — Settlement cases currently auto-close; manual path exists but is incomplete.

---

## 🟡 Finding #4 — Subject Status Not Enum-Constrained (**MEDIUM**)

**Issue:** `co_subjects.status` is a `varchar(50)` with default `"ACTIVE"`, not a pgEnum. Services use string literals:
- `"ACTIVE"` — decision engine, settlement auth, disposition engine
- `"SUSPENDED"` — decision engine (sanctions hard-stop), wallet risk service
- `"FROZEN"` — wallet risk service (wallet freeze)

Without an enum, there's no database-level protection against typos or invalid status values.

**Files affected:**
- `src/db/schema/compliance.ts` (line 181): `status: varchar("status", { length: 50 })`
- All services that set subject status via string literals

**Fix:** Create a `co_subject_status` enum with `ACTIVE, PENDING, SUSPENDED, FROZEN, BLOCKED, DEACTIVATED` and update the column type. This is a schema migration.

**Priority:** 🟡 MEDIUM — No current bugs, but future risk of invalid state.

---

## 🟢 Finding #5 — Shipment Lifecycle Missing Terminal States (**LOW**)

**Issue:** The user's requirements specify `REJECTED` and `CLOSED` terminal states for shipments. The current enum has:
```
CREATED, PENDING_DISPATCH, DISPATCHED, IN_TRANSIT, DELIVERED_TO_REFINERY,
RECEIVED_BY_REFINERY, CLEARED_FOR_INTAKE, REJECTED_AT_DELIVERY, QUARANTINED
```

`REJECTED_AT_DELIVERY` covers the rejection case. There's no explicit `CLOSED` state, but this is optional — a shipment is effectively closed when its lot reaches `SETTLEMENT_READY`.

**Priority:** 🟢 LOW — No functional gap, can add `CLOSED` state in a future phase.

---

## 🟢 Finding #6 — Refinery Lot Lifecycle Missing States (**LOW**)

**Issue:** User requirements list `QUARANTINED` and `CLOSED` as terminal states. Current enum:
```
PENDING_RECEIPT, PENDING, IN_PROGRESS, COMPLETE, SETTLEMENT_READY,
DISPUTED, FAILED, ASSAY_EXCEPTION
```

`ASSAY_EXCEPTION` + `FAILED` cover the quarantine/failure path. No explicit `QUARANTINED` or `CLOSED`. The lot is implicitly closed when settlement is authorized.

**Priority:** 🟢 LOW — No functional gap.

---

## 🟢 Finding #7 — Onboarding State Independent System (**LOW**)

**Issue:** `onboarding-state.ts` uses its own `onboarding_state` table with independent statuses (IN_PROGRESS, PROVIDER_PENDING, MCA_PENDING, etc.). This is not wired to V3 subjects.

**Status:** This is correct — it's a UI-facing onboarding progress tracker, not a compliance status system. The onboarding flow eventually creates a V1 `compliance_cases` record and triggers Veriff/iDenfy. When V3 is fully integrated, the onboarding completion should also create a `co_subjects` record and open an ONBOARDING case.

**Priority:** 🟢 LOW — Working as designed for current architecture.

---

## 🟢 Finding #8 — Audit Aggregate Types Sparse (**LOW**)

**Issue:** `V3_AGGREGATE_TYPES` currently has 5 entries:
```
COMPLIANCE_CASE, COMPLIANCE_SUBJECT, REFINERY_LOT, SETTLEMENT_AUTHORIZATION, PHYSICAL_SHIPMENT
```

All service `appendEvent` calls use one of these. No orphaned event types found.

**Priority:** 🟢 LOW — Fully consistent.

---

## Summary of Fixes Required

| # | Finding | Priority | Action |
|---|---------|----------|--------|
| 1 | Gate 4 assay status | 🔴 BLOCKING | Fix: accept `SETTLEMENT_READY` in addition to `COMPLETE` |
| 2 | Legacy V1 coexistence | 🟡 MEDIUM | Add deprecation comments to V1 files |
| 3 | Disposition SETTLEMENT_AUTHORIZATION route | 🟡 MEDIUM | Add explicit case handling |
| 4 | Subject status not enum | 🟡 MEDIUM | Create pgEnum + migration |
| 5 | Shipment CLOSED state | 🟢 LOW | Deferred |
| 6 | Lot QUARANTINED/CLOSED states | 🟢 LOW | Deferred |
| 7 | Onboarding independence | 🟢 LOW | Working as designed |
| 8 | Aggregate types | 🟢 LOW | Fully consistent |
