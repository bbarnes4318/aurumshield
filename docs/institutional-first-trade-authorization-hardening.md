# Institutional First-Trade Authorization Hardening

## Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Server auth** | `requireSession()` only — accepts demo-mock | 3-layer chain: `requireProductionAuth()` → `requireReverification()` → `requireComplianceCapability("EXECUTE_PURCHASE")` |
| **Compliance gate** | None — any authenticated user could submit | DB-verified APPROVED compliance case required. DB unreachable = 500, not silent pass |
| **Session freshness** | Not checked | 5-minute reverification window enforced |
| **Demo-mock protection** | Allowed through | Rejected by `requireProductionAuth()` |
| **Idempotency** | Not guarded — could double-submit | Server rejects if `firstTradeCompleted` already true |
| **UI confirmation** | Single checkbox click | Typed "CONFIRM TRADE" phrase + 3-second hold-to-confirm |
| **Legal acknowledgment** | Inline with checkbox | Scroll-to-unlock container — must read before input is enabled |
| **Confirmation phrase** | None | Server-validated: must match `"CONFIRM TRADE"` exactly |

## Authorization Chain (Server-Side)

```
submitFirstTrade({ confirmationPhrase, indicativePriceSnapshot })
  │
  ├─ Layer 1: requireProductionAuth()
  │   └─ Rejects demo-mock sessions (authSource must be "clerk")
  │
  ├─ Layer 2: requireReverification()
  │   └─ Session must have been verified within 5 minutes
  │
  ├─ Layer 3: requireComplianceCapability("EXECUTE_PURCHASE")
  │   └─ DB-verified APPROVED compliance case with sufficient tier
  │   └─ DB unreachable = 500 (fail-closed, no JWT fallback)
  │
  ├─ Confirmation Phrase: must match "CONFIRM TRADE" exactly
  ├─ Idempotency: rejects if firstTradeCompleted already true
  ├─ Draft Readiness: isDeliveryStageReady(draft)
  ├─ Snapshot Validation: Zod schema + ≤5min freshness
  │
  └─ Persist + Audit Log (with auth enforcement details)
```

## UI Confirmation Pattern

1. **Scroll-to-unlock legal acknowledgment** — Fixed-height container with 4 numbered clauses. User must scroll to the bottom to unlock the confirmation input. Visual indicator shows "Scroll to read ↓" → "✓ Read".

2. **Typed confirmation phrase** — Text input where user must type `CONFIRM TRADE` exactly. Color-coded feedback: amber for partial match, green for exact match. Disabled until legal text is scrolled.

3. **Hold-to-confirm button** — 3-second press-and-hold with visual progress fill. Prevents accidental single-click submission. Countdown shows remaining seconds.

## Files Changed

| File | Change |
|------|--------|
| `src/actions/first-trade-actions.ts` | 3-layer auth chain, idempotency guard, confirmation phrase validation, enhanced audit log |
| `src/app/institutional/first-trade/authorize/page.tsx` | Scroll-to-unlock, typed phrase, hold-to-confirm UI |
| `src/lib/__tests__/first-trade-authorization.test.ts` | New test file: 12+ test cases covering hardened auth |
| `docs/institutional-first-trade-authorization-hardening.md` | This document |

## What Authorization Logic Was Hardened

- `requireSession()` → `requireProductionAuth()` (rejects demo-mock)
- Added `requireReverification()` (5-minute session freshness)
- Added `requireComplianceCapability("EXECUTE_PURCHASE")` (DB-verified compliance)
- Added server-side confirmation phrase validation
- Added idempotency guard against double-submission

## Auth Enforcement Changes

All three auth layers (`requireProductionAuth`, `requireReverification`, `requireComplianceCapability`) already existed in `authz.ts`. This change **reuses** them — no new auth infrastructure was created. The change is purely about applying them to the first-trade submission path, which previously only used the weakest layer (`requireSession`).

## Confirmation Requirements

| Requirement | Type | Enforcement |
|-------------|------|-------------|
| Scroll legal text | Client | `hasScrolledLegal` state gate |
| Type "CONFIRM TRADE" | Client + Server | Client enables button; server validates exact match |
| Hold button 3 seconds | Client | `holdProgress` timer prevents accidental click |
| Clerk-verified session | Server | `requireProductionAuth()` |
| Fresh session (≤5min) | Server | `requireReverification()` |
| APPROVED compliance case | Server | `requireComplianceCapability("EXECUTE_PURCHASE")` |
| Not already completed | Server | Idempotency guard on `firstTradeCompleted` |
| Fresh price snapshot | Server | `isSnapshotFresh()` ≤5min |

## Remaining Risks Before Prompt 5

| Risk | Severity | Detail |
|------|----------|--------|
| No server-side quote-lock | Medium | Indicative pricing only — final price determined at settlement |
| No WebAuthn/FIDO2 signing | Low | Reserved for operational settlement, not first-trade |
| No maker-checker dual-auth | Low | DualAuthGate exists but is for $50M+ settlement flows |
| Reverification UX in production | Low | If Clerk session is >5min old, user sees 403 — needs graceful re-auth flow |
| Hold-to-confirm is client-only | Low | Server doesn't enforce hold duration — but typed phrase + 3-layer auth provide server-side friction |
