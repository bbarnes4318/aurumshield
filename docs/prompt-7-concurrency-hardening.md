# Prompt 7 — Concurrency / Race-Condition Hardening

## Summary

Audited and hardened all critical compliance and settlement mutation paths against race conditions, duplicate mutations, and stale reads. All changes use Drizzle `db.transaction()`, conditional `WHERE` guards, and idempotent early-return patterns. No schema migrations required.

## Changes by Service

### CRITICAL — Transaction Wrapping

| Service | Change |
|---------|--------|
| `settlement-authorization-service.ts` | Entire 6-gate pipeline + auth write wrapped in `db.transaction()`. Duplicate auth guard at top returns existing AUTHORIZED record. Gate persistence receives `tx` context. Conditional case-close guard. |
| `case-service.ts → completeTask()` | Full `db.transaction()` wrapping. Conditional `WHERE status='PENDING'` on task UPDATE. Conditional case transition `WHERE status IN (reviewable states)` prevents duplicate `READY_FOR_DISPOSITION`. |
| `manual-review-rules.ts → dispositionCase()` | Already wrapped in `db.transaction()` — confirmed hardened (all reads + verdict + downstream inside single tx). |

### HIGH — Conditional WHERE Guards

| Service | Change |
|---------|--------|
| `case-service.ts → assignCase()` | Conditional `WHERE status IN ('OPEN','AWAITING_INTERNAL_REVIEW','ESCALATED')` on UPDATE. `rowCount=0` → throws `CaseNotReviewableError`. |
| `idenfy-webhook-handler.ts` | Idempotent webhook: checks if `status=COMPLETED && normalizedVerdict IS NOT NULL` before updating — returns early for duplicate deliveries. |

### MEDIUM — Conditional Status Transitions

| Service | Change |
|---------|--------|
| `check-freshness-service.ts` | Conditional `NOT(normalizedVerdict='EXPIRED')` on EXPIRED update — prevents cron overwriting verdicts changed by operators/webhooks. |
| `shipment-review-engine.ts` | QUARANTINE: `WHERE shipmentStatus=$previousStatus`. CLEARED_FOR_INTAKE: `WHERE shipmentStatus='DELIVERED_TO_REFINERY'`. |
| `refinery-review-engine.ts` | Already had conditional `WHERE assayStatus='COMPLETE'` — confirmed hardened. |

### ALREADY HARDENED (No Changes Needed)

| Service | Why |
|---------|-----|
| `settlement-actions.ts` (DvP Engine) | Uses raw `pg` with `BEGIN/COMMIT/ROLLBACK`, `SELECT FOR UPDATE`, idempotency keys with `ON CONFLICT DO NOTHING`, and clearing cert hash guard. |

## Invariants Enforced

1. **Duplicate settlement authorization** → Returns existing AUTHORIZED record (idempotent)
2. **Duplicate task completion** → Throws `TaskAlreadyCompleteError`
3. **Double case disposition** → Throws `CaseNotReadyError`
4. **Four-eyes bypass** → Throws `DualSignoffRequiredError`
5. **Webhook replay** → Skips update, returns `checkUpdated=false`
6. **Cron/operator collision** → Conditional WHERE prevents overwrite
7. **Concurrent case transition** → Only first `completeTask` transitions case

## Test Coverage

New file: `src/lib/__tests__/concurrency-hardening.test.ts`

- Task completion idempotency (already-completed + rowCount=0 race)
- Disposition double-mutation guard (APPROVED + REJECTED states)
- Four-eyes integrity under concurrent execution
- Case assignment conditional WHERE guard
- Webhook replay safety
- Freshness sweep conditional guard
