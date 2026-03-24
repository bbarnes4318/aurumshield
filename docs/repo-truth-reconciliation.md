# Repo Truth Reconciliation — Audit Report

**Date:** March 23, 2026  
**Scope:** Full documentation and comment integrity pass across the AurumShield codebase

---

## Areas Audited

1. **README.md** — repo entry point documentation
2. **docs/final-architecture-hardening.md** — workstream 5 architecture doc
3. **docs/security-report.md** — investor-facing security claims
4. **src/lib/__tests__/compliance-e2e-flows.test.ts** — compliance test narrative
5. **src/lib/__tests__/compliance-screening.test.ts** — AML screening test narrative
6. **src/lib/compliance/** — all compliance subsystem files (27 files)
7. **V1/V3 legacy boundaries** — `models.ts`, `events.ts`, `compliance-engine.ts`
8. **TODO markers** — full codebase scan (~50 TODO comments reviewed)

---

## Stale / Inaccurate Statements Found and Fixed

### 1. README.md — Complete Replacement
**Problem:** Boilerplate `create-next-app` README with no project-specific content.  
**Fix:** Replaced with comprehensive README covering: platform identity, architecture, subsystems, local development, compliance model, deployment notes, and testing strategy.

### 2. compliance-e2e-flows.test.ts — Two Stale `[DOCUMENTED LIMITATION]` Markers

**Statement 1 (line ~507):**
> `[DOCUMENTED LIMITATION] non-wallet checks do NOT have TTL-based freshness gating`

**Reality:** TTL-based freshness gating is fully implemented in `check-freshness-service.ts` with configurable TTLs per check type (SANCTIONS=180d, KYC=365d, LIVENESS=730d, etc.). The `evaluateSubjectCheckFreshness()` function marks checks as EXPIRED and logs audit events.

**Fix:** Changed to `[RESOLVED]` with implementation references.

---

**Statement 2 (line ~784):**
> `[DOCUMENTED LIMITATION] no periodic re-screening cron or TTL for non-wallet checks`

**Reality:** Periodic re-screening is fully implemented:
- `rescreening-jobs.ts` — `runStaleCheckSweep()` and `runSanctionsRefresh()`
- `/api/cron/stale-check-sweep` — daily route (wired)
- `/api/cron/sanctions-refresh` — weekly route (wired)
- `/api/cron/sync-sanctions` — sanctions list sync (wired)

**Fix:** Changed to `[RESOLVED]` with full implementation inventory. Noted remaining gap: external data push (e.g., OFAC list updates) is event-driven via sync-sanctions, not push-based.

### 3. final-architecture-hardening.md — Remaining Risks Section

**Problem:** Closure notes for items 1 and 3 said "(closure pass)" without specific references.  
**Fix:** Added specific references to implementing code:
- Item 1: now references the cron routes
- Item 3: now references `persistGateResults()`

### 4. security-report.md — Multiple Overstated Claims

| Claim | Issue | Fix |
|---|---|---|
| "sovereign-grade" in exec summary | Aspirational marketing language | Changed to "institutional" |
| "17 versioned migrations" | Count was stale | Updated to 28 |
| "All webhook endpoints" for HMAC | Veriff/iDenfy degrade gracefully in dev | Clarified: "Clerk + Column (live), Veriff + iDenfy (graceful degradation in dev)" |
| AML/Sanctions section — only OpenSanctions listed | Elliptic adapter now exists | Added Elliptic with status: "adapter implemented, live integration pending" |
| Closing statement — "all controls implemented in production code" | Many providers use mock adapters | Added nuanced closing: lists which controls are live vs mock-backed |

---

## Claims Intentionally Downgraded

1. **"sovereign-grade"** → "institutional" — the term is marketing language not supported by formal certification
2. **"All webhook endpoints"** HMAC verification → specified which are live (Clerk, Column) vs graceful degradation (Veriff, iDenfy)
3. **Closing certification statement** → added specificity about mock adapters and TODO markers for live provider wiring

---

## Legacy / Deprecation Boundary Audit

Three V1 legacy files identified, all with **accurate and clear** boundary markers:

| File | V1 Table | V3 Replacement | Marker Status |
|---|---|---|---|
| `compliance/models.ts` | `compliance_cases` | `co_cases` (Drizzle) | ✅ Accurate — no changes needed |
| `compliance/events.ts` | `compliance_events` | `co_audit_events` (Drizzle) | ✅ Accurate — no changes needed |
| `compliance/compliance-engine.ts` | `compliance_cases` (trade-centered) | `settlement-authorization-service.ts` (refinery-centered) | ✅ Accurate — no changes needed |

All three files honestly document their V1 status, explain when they should be deprecated, and identify their V3 replacements.

---

## TODO Comments — Status Assessment

~50 TODO markers reviewed. Categories:

| Category | Count | Status |
|---|---|---|
| **API Integration** (Veriff, GLEIF, Inscribe, Brink's, Malca-Amit, B-PIPE) | ~30 | Legitimate — mock adapters with defined interfaces, awaiting live API key provisioning |
| **Infrastructure wiring** (Datadog, CloudWatch, OTel) | ~5 | Legitimate — observability forwarding stubs |
| **Column Bank balance check** | 3 | Legitimate — balance query endpoint not yet exposed by Column adapter |
| **Misc** (jurisdiction mapping, LBMA scraper, HSM-backed TOTP) | ~10 | Legitimate — clearly scoped, not overclaiming |

No stale or misleading TODOs found. All TODO markers accurately describe what is stubbed and what the interface should look like.

---

## Remaining Documentation Risks

1. **docs/PLATFORM_CAPABILITIES.md** (68KB) — large file that may contain stale capabilities claims; not audited in this pass due to scope. Recommend reviewing in Prompt 2.
2. **docs/buyer-journey.md** (41KB) — may reference V1 trade-centered flow in places; not audited in this pass.
3. **docs/aurumshield-agent-knowledge-base.md** (35KB) — agent knowledge file that may need reconciliation with current architecture.

---

## Files Changed

| File | Change Type |
|---|---|
| `README.md` | Complete replacement |
| `docs/final-architecture-hardening.md` | Remaining risks section clarified |
| `docs/security-report.md` | 6 claim revisions for accuracy |
| `src/lib/__tests__/compliance-e2e-flows.test.ts` | 2 stale DOCUMENTED LIMITATION markers updated to RESOLVED |
| `docs/repo-truth-reconciliation.md` | New — this document |
