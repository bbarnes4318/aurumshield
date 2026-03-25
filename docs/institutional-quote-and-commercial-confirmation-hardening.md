# Institutional Quote & Commercial Confirmation Hardening

## Indicative vs Authoritative — Current State

| Aspect | Classification | Detail |
|--------|---------------|--------|
| **XAU/USD Spot Price** | INDICATIVE | Live Pyth Network oracle feed (SSE), with demo fallback |
| **Asset Premiums** | INDICATIVE | Static basis points per asset (10bps–150bps) |
| **Platform Fee** | AUTHORITATIVE | Fixed 1.00% (100bps) codified in `PLATFORM_FEE_BPS` |
| **Estimated Total** | INDICATIVE | Computed client-side: `(weight × spot) + premium + fee` |
| **Trade Intent Ref** | AUTHORITATIVE | Server-generated `FT-{UUID}`, unique per submission |
| **firstTradeCompleted** | AUTHORITATIVE | Server-side flag, only set by `submitFirstTrade()` |
| **Indicative Snapshot** | INDICATIVE (labeled) | Captured at authorization, Zod-validated, ≤5min freshness |
| **Quote-Lock** | **DOES NOT EXIST** | No server-side pricing service or exchange integration |

## What Was Hardened

### Indicative Price Snapshot (`IndicativePriceSnapshot`)

New type in `first-trade-draft-schema.ts`. Captures the complete price breakdown at the moment the user clicks "Confirm Trade Intent":

- `tier: "INDICATIVE"` — explicitly labels the pricing tier
- `spotPriceUsd`, `baseSpotValueUsd`, `assetPremiumUsd`, `platformFeeUsd`, `estimatedTotalUsd`
- `capturedAt` — ISO timestamp of capture
- Zod schema + `isSnapshotFresh()` validator (5-minute max age)

### submitFirstTrade() — Now a Real Commercial Record

Previously saved: asset, quantity, delivery method, timestamp.
Now saves: all of the above **plus** the full validated indicative price snapshot.

Server-side validations added:
1. Zod schema validation of the snapshot
2. Staleness check (rejects snapshots >5 minutes old)
3. All previous validations preserved (auth, draft readiness)

### Authorize Page — Real Commercial Boundary

| Before | After |
|--------|-------|
| Generic label: "Authorize First Trade" | "Confirm Trade Intent" |
| No price breakdown | Full indicative breakdown (spot, premium, fee, total) |
| No INDICATIVE badge | Explicit "INDICATIVE" badge on pricing section |
| Generic acknowledgment | Commercial language referencing estimated total |
| No price capture on submit | Fresh snapshot captured at exact click moment |

### Success Page — Honest Result Display

| Before | After |
|--------|-------|
| Status: "Intent Recorded" | Status: "Trade Intent Confirmed" |
| No price data displayed | Full indicative snapshot with all line items |
| No timestamp for pricing | Captured timestamp shown |
| Next step: "Quote & Price Lock" | Next step: "Binding Quote" (honest) |

### Review Page

- "Transaction Estimate" → "Indicative Transaction Estimate"

## Submission Semantics

```
User clicks "Confirm Trade Intent"
  → Client builds IndicativePriceSnapshot with current spot + computed values
  → submitFirstTrade({ indicativePriceSnapshot }) — Server Action
    → requireSession() — authenticated
    → getOnboardingState() — load draft
    → isDeliveryStageReady(draft) — fail-closed
    → indicativePriceSnapshotSchema.safeParse() — Zod validation
    → isSnapshotFresh() — ≤5min staleness check
    → Generate FT-{UUID} reference
    → upsertOnboardingState() — persist with snapshot
    → Return { tradeIntentRef, submittedAt, indicativeSnapshot }
  → Navigate to /first-trade/success
```

## What Remains Future Work

| Item | Detail |
|------|--------|
| **Server-side quote-lock** | Requires pricing service + exchange integration |
| **Binding quote generation** | Per next-steps UI: "designated trader will generate" |
| **WebAuthn / DualAuthGate** | Reserved for operational settlement, not first-trade |
| **Freight quote integration** | Brink's API for delivery cost estimation |
| **Settlement rail wiring** | Wire/stablecoin collection flow |

## Files Changed

| File | Change |
|------|--------|
| `src/lib/schemas/first-trade-draft-schema.ts` | Added `IndicativePriceSnapshot` type, Zod schema, `isSnapshotFresh()` |
| `src/actions/first-trade-actions.ts` | Enhanced `submitFirstTrade()` with snapshot parameter + validation |
| `src/app/institutional/first-trade/authorize/page.tsx` | Full commercial confirmation boundary with price breakdown |
| `src/app/institutional/first-trade/success/page.tsx` | Snapshot display, honest labeling |
| `src/app/institutional/first-trade/review/page.tsx` | "Indicative Transaction Estimate" labeling |
| `src/lib/__tests__/institutional-journey.test.ts` | 5 new `isSnapshotFresh` tests |
| `docs/institutional-quote-and-commercial-confirmation-hardening.md` | This document |
