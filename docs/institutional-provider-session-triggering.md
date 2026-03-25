# Institutional Provider Session Triggering

> How a new institutional user initiates KYB/KYC verification from the guided flow.

## Problem

The guided verification page at `/institutional/get-started/verification` was truthful (reading authoritative `compliance_cases.status`), but **passive** — a new user with no compliance case would see "No active verification case found" and have no way to begin verification without admin intervention.

## Solution

Added a minimal server action + API bridge that lets the guided page **initiate** provider-side verification while reusing the existing compliance engine.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Verification Page (client)                              │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │ Begin Verification│───▶│ useInitiateVerification() │  │
│  │ (button)          │    │ (TanStack mutation)       │  │
│  └──────────────────┘    └────────┬─────────────────┘  │
│                                   │ POST               │
└───────────────────────────────────┼─────────────────────┘
                                    ▼
┌───────────────────────────────────────────────────────────┐
│ POST /api/compliance/cases/me/initiate                    │
│                                                           │
│  1. requireSession() → userId                             │
│  2. createComplianceCase({ userId, status: "OPEN" })      │
│     (idempotent upsert — ON CONFLICT returns existing)    │
│  3. evaluateCounterpartyReadiness(userId)                 │
│     ├── Case APPROVED → return ALREADY_CLEARED            │
│     ├── Case OPEN/REJECTED → throw CompliancePendingError │
│     │   └── Extract redirect URL → return REDIRECT        │
│     └── Case in transit → return IN_PROGRESS              │
└───────────────────────────────────────────────────────────┘
```

## Provider Initiation Path Reused

**`evaluateCounterpartyReadiness()`** in `compliance-engine.ts` — the same engine used by:
- `serverLaunchIdentityScan()` (legacy onboarding flow)
- `authorizeTradeExecution()` (trade-level compliance gate)
- `serverRunKybVerification()` (legacy KYB poll)

The engine reads `ACTIVE_COMPLIANCE_PROVIDER` env var and routes to:
- **iDenfy**: `POST https://ivs.idenfy.com/api/v2/token` → redirect URL
- **Veriff**: `createKYBSession()` → session URL

## Response States

| Status | Meaning | Page Behavior |
|--------|---------|---------------|
| `REDIRECT` | Provider session created | Opens redirect in new tab, shows "verification in progress" notice |
| `ALREADY_CLEARED` | Case already APPROVED | Query invalidation triggers milestone update |
| `IN_PROGRESS` | Case in transitional state | Auto-poll (10s) updates milestones when webhook fires |
| `ERROR` | Something failed | Shows user-facing error with dismiss |

## User Flow

1. New user arrives at `/institutional/get-started/verification`
2. No compliance case → sees "Begin Verification" button
3. Clicks → server creates case + calls compliance engine
4. Engine routes to iDenfy/Veriff → returns redirect URL
5. Page opens provider in new tab, shows "verification in progress"
6. User completes provider flow in the external tab
7. Provider webhook fires → updates `compliance_cases.status`
8. Page auto-polls every 10s → milestones update truthfully
9. When all 4 milestones pass → "Continue to Funding" unlocks

## Files Changed

| File | Change |
|------|--------|
| `src/lib/actions/initiate-verification-action.ts` | **NEW** — Server action wrapping compliance engine |
| `src/app/api/compliance/cases/me/initiate/route.ts` | **NEW** — POST API bridge |
| `src/hooks/use-compliance-case.ts` | **MODIFIED** — Added `useInitiateVerification()` mutation |
| `src/app/institutional/get-started/verification/page.tsx` | **MODIFIED** — Added initiation CTA, redirect notice, PENDING_USER nudge |

## Invariants Preserved

- **Single source of truth**: `compliance_cases.status` remains the only authority
- **Fail-closed**: No fake success states — page shows truthful milestone status
- **No parallel truth**: No client-side completion flags — all derived from DB
- **State machine**: All transitions follow the existing confinement matrix
- **Idempotent**: `createComplianceCase()` uses `ON CONFLICT` — safe to call multiple times
