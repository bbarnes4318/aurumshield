# Institutional Verification Hardening

> **Date:** 2026-03-24
> **Scope:** Replace simulated verification milestones with authoritative compliance case state

---

## What Changed

The verification page (`/institutional/get-started/verification`) previously ran 4 `setTimeout` timers that auto-marked all milestones as "passed" after 1.5–7 seconds regardless of actual backend state. This was dishonest — a user with no compliance case, no KYB session, and no AML screening saw green checkmarks within seconds.

**All timer-based simulation has been removed.** The page now reads authoritative state from `compliance_cases.status` via `GET /api/compliance/cases/me`.

---

## Verification Milestones — Now Authoritative

| Milestone | Source | "done" when |
|-----------|--------|-------------|
| Entity Verification | `compliance_cases.status` | `PENDING_PROVIDER`, `UNDER_REVIEW`, or `APPROVED` |
| UBO Review | `compliance_cases.status` | `UNDER_REVIEW` or `APPROVED` |
| AML/Sanctions Screening | `compliance_cases.status` | `UNDER_REVIEW` or `APPROVED` |
| Compliance Review | `compliance_cases.status` | `APPROVED` only |

### Full Status Mapping

| Case Status | Entity | UBO | Screening | Compliance | UI Label |
|-------------|--------|-----|-----------|------------|----------|
| `null` (no case) | ❌ | ❌ | ❌ | ❌ | "Verification not started" |
| `OPEN` | ❌ | ❌ | ❌ | ❌ | "Case opened — awaiting submission" |
| `PENDING_USER` | ❌ | ❌ | ❌ | ❌ | "Action required" |
| `PENDING_PROVIDER` | ✅ | ❌ | ❌ | ❌ | "Provider processing" |
| `UNDER_REVIEW` | ✅ | ✅ | ✅ | ❌ | "Final compliance review in progress" |
| `APPROVED` | ✅ | ✅ | ✅ | ✅ | "All checks passed — entity verified" |
| `REJECTED` | ❌ | ❌ | ❌ | ❌ | "Not approved — contact support" |
| `CLOSED` | ❌ | ❌ | ❌ | ❌ | "Case closed" |

---

## What Is Still Placeholder

**Nothing is simulated.** All 4 milestones are now exclusively driven by `compliance_cases.status`.

**Provider session triggering is NOT yet wired.** The guided verification page reads status but does not initiate a Veriff/iDenfy session. The server-side `evaluateCounterpartyReadiness()` function exists and can create provider sessions, but the guided page doesn't call a server action to trigger it. This is future work.

---

## Code Paths That Drive the Page

1. **`GET /api/compliance/cases/me`** — Server route that returns the user's `ComplianceCase` from the `compliance_cases` table
2. **`useComplianceCaseVerification()`** — New TanStack Query hook that fetches this endpoint, auto-polls every 10s for transitional statuses
3. **`deriveVerificationFromCase()`** — Pure function that maps `ComplianceCaseStatus` → `VerificationStageData` (4 booleans)
4. **`isVerificationComplete()`** — Existing gate function (unchanged) — returns true only when all 4 booleans are true
5. **`PATCH /api/compliance/state`** — Persists `__verification` snapshot and `__journey.stage` on continue/save

---

## Progression Behavior

- **Continue to Funding** is disabled until `isVerificationComplete()` returns true
- `isVerificationComplete()` returns true only when `compliance_cases.status === "APPROVED"`
- This means progression is impossible without an APPROVED compliance case — **fail-closed**
- Save-and-return-later persists the current `__verification` snapshot and keeps `__journey.stage` at `VERIFICATION`

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/lib/schemas/verification-stage-schema.ts` | Modified | Added `deriveVerificationFromCase()`, `getVerificationStatusLabel()`, `ComplianceCaseStatusLite` type |
| `src/hooks/use-compliance-case.ts` | New | TanStack Query hook for compliance case verification with auto-polling |
| `src/app/institutional/get-started/verification/page.tsx` | Rewritten | Removed all `setTimeout` simulation, now driven by `useComplianceCaseVerification()` |
| `src/lib/__tests__/institutional-journey.test.ts` | Modified | Added 15 new tests for `deriveVerificationFromCase()` and `getVerificationStatusLabel()` |

---

## Test Results

- **79 tests pass** (was 64 — added 15 new)
- **TypeScript typecheck:** clean (exit 0)

---

## Remaining Future Work

| Priority | Item |
|----------|------|
| High | Wire a server action to trigger `evaluateCounterpartyReadiness()` from the guided page |
| Medium | Add Veriff/iDenfy redirect flow when `CompliancePendingError` is thrown |
| Medium | Show `compliance_events` timeline on the verification page for transparency |
| Low | Add error recovery UI when case status is REJECTED |
