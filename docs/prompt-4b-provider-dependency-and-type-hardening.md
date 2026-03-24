# Prompt 4B — Provider Dependency Closure + Type/Enum Hardening

## 1. Deprecated Provider Dependencies Audited

| Dependency | Status | Location | Action |
|---|---|---|---|
| `modern-treasury` (npm) | **Dead** — zero imports in `src/` | `package.json` line 44 | **Removed** |
| `verifyModernTreasurySignature` | **Dead alias** — zero consumers | `webhook-verify.ts` line 55 | **Removed** |
| Moov references | Comments only in SQL migrations | `005_dvp_escrow.sql`, `008/009` | **Retained** (append-only migration history) |
| Persona references | Comments only in SQL migrations + adapter docstrings | `002/003/011` migrations | **Retained** (historical) |

## 2. Dependencies Removed

- **`modern-treasury@^3.3.0`** — Removed from `package.json`. No code in `src/` imports or references this package. Column Bank is the sole active banking/settlement rail.

## 3. Stale Compatibility Layers Removed

- **`verifyModernTreasurySignature`** (deprecated alias in `webhook-verify.ts`) — Deleted. Searched entire `src/` tree and confirmed zero import sites.
- **Provider history comment block** — Removed the 5-line legacy comment that documented the Modern Treasury → Column Bank transition. No longer needed after full cleanup closure.

## 4. Control-Plane Fields Audited

| Field | File | Before | After |
|---|---|---|---|
| `co_subjects.risk_tier` | `compliance.ts` | `varchar(50)` | `riskTierEnum` (`STANDARD`, `HIGH`, `ENHANCED`) |
| `co_checks.status` | `compliance.ts` | `varchar(50)` | `checkStatusEnum` (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `ERROR`, `EXPIRED`) |
| `co_decisions.decision_type` | `compliance.ts` | `varchar(20)` | `decisionTypeEnum` (`INTERIM`, `FINAL`) |
| `co_decisions.decision` | `compliance.ts` | `varchar(50)` | `decisionOutcomeEnum` (`APPROVED`, `REJECTED`, `MANUAL_REVIEW`) |
| `co_chain_of_custody_events.verification_status` | `compliance.ts` | `varchar(50)` | `custodyVerificationStatusEnum` (`PENDING`, `VERIFIED`, `FAILED`) |
| `co_settlement_authorizations.payment_rail` | `compliance.ts` | `varchar(100)` | `paymentRailEnum` (`WIRE`, `USDC`, `USDT`, `FEDWIRE`, `TURNKEY_MPC`) |

**Intentionally NOT hardened** (extensible vocabularies):
- `co_audit_events.event_type` — open-ended event taxonomy
- `co_case_tasks.task_type` — grows with new task rules

## 5. Type/Enum Hardening Changes

### Schema (`src/db/schema/compliance.ts`)
- Added 6 new `pgEnum` definitions
- Applied enums to 6 columns (replacing varchar)
- Added 7 derived type aliases: `RiskTier`, `CheckStatus`, `DecisionType`, `DecisionOutcome`, `CustodyVerificationStatus`, `PaymentRail`, `SubjectType`

### Decision Engine (`src/lib/compliance/decision-engine.ts`)
- `REQUIRED_CHECKS_MATRIX` keys narrowed from `Record<string, Record<string, ...>>` to `Record<SubjectType, Partial<Record<RiskTier, CheckType[]>>>`
- `DecisionResult.riskTier` narrowed from `string` to `RiskTier`
- `calculateDecisionExpiry()` parameter narrowed from `string` to `RiskTier`
- `getRequiredChecks()` parameters narrowed from `string` to `SubjectType` / `RiskTier`
- Removed pre-existing unused imports (`and`, `CoCase`)

### Settlement Authorization Service (`src/lib/compliance/settlement-authorization-service.ts`)
- `authorizeSettlement()` `paymentRail` parameter narrowed from `string` to `PaymentRail`
- `SettlementAuthorizationResult.paymentRail` narrowed from `string` to `PaymentRail | null`
- Replaced magic string `"NONE"` with `null` for failed results (semantically correct)

## 6. Migration Added

**`src/db/migrations/029_type_enum_hardening.sql`**

Creates 6 PostgreSQL enum types and ALTERs the corresponding columns. Uses `EXCEPTION WHEN duplicate_object` guards for idempotent re-runs.

> [!IMPORTANT]
> This migration must be run before deploying. The app code already writes values that conform to these enums, so the migration is safe — no data transformation needed.

## 7. Remaining Weakly-Typed Areas

| Area | Risk | Notes |
|---|---|---|
| `co_audit_events.event_type` | Low | Extensible by design — adding a pgEnum would cause migration churn on every new event type |
| `co_case_tasks.task_type` | Low | Same — task rules grow organically |
| `coSubjects.riskTier` default vs matrix fallback | Very Low | Matrix uses `tierMatrix[riskTier] ?? tierMatrix["STANDARD"]` — safe fallback but ENHANCED tier matrix entries should be verified for SUPPLIER/REFINERY types |
| `SettlementCase` types in `mock-data.ts` | None | Already TypeScript union types — no drift risk |

## 8. Verification Results

- **TypeScript**: `npx tsc --noEmit` — **exit code 0**, zero errors
- **Vitest**: 377/394 tests pass (17 pre-existing failures in `compliance-screening.test.ts`, `compliance-e2e-flows.test.ts`, `security-remediation.test.ts` — all auth/server-dependent and unrelated to these changes)

## 9. Next Prompt Recommendation

**Prompt 5 — Production Auth + Cron Wiring Finalization**

Focus areas:
1. Fix the 17 pre-existing test failures (auth mocking for `requireProductionAuth` in screening tests)
2. Wire the `029_type_enum_hardening.sql` migration into the `db:migrate` script
3. Add ENHANCED tier check matrices for SUPPLIER and REFINERY subject types
4. Consider adding pgEnum for `co_audit_events.event_type` if the taxonomy stabilizes
5. Add runtime validation (Zod) at API boundaries to enforce payment rail values from external callers
