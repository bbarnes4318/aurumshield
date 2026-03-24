# Prompt 6 — Test Noise Cleanup

## Problem
Standard `npx vitest run` emitted noisy operational logs (DB fallbacks, metric
counters, DEMO-MOCK warnings, state transition logs) that reduced signal quality
and made test output feel production-ish rather than deterministic.

## Fix Strategy
Two complementary approaches — **NO test assertions were weakened**:

| Layer | Technique | Rationale |
|---|---|---|
| **App-side** | `process.env.NODE_ENV !== 'test'` guards | For observability-only logs (metrics, LISTEN) that provide zero value during test |
| **Test-side** | `vi.spyOn(console, ...).mockImplementation()` | For logs that are expected side-effects of intentionally-exercised failure paths |

## Files Changed

### App-Side (Env Guards)
| File | Change |
|---|---|
| `src/lib/compliance/events.ts` | Gated `emitMetric()` console.log and PG LISTEN active message on `NODE_ENV ≠ test` |
| `src/lib/settlement-rail.ts` | Gated "Registered rail" console.log on `NODE_ENV ≠ test` |

### Test-Side (Console Spies)
| File | Noise Silenced |
|---|---|
| `risk-parameterization.test.ts` | `[RISK-CONFIG]` DB fallback warn/error |
| `fail-closed-authz.test.ts` | `[AUTHZ]` DEMO-MOCK + KYC fallback warn |
| `distributed-event-bus.test.ts` | `[METRIC]` + `[COMPLIANCE]` PG LISTEN log/warn/error |
| `quote-oracle-security.test.ts` | `[B-PIPE]` pricing debug |
| `compliance-e2e-flows.test.ts` | `[SHIPMENT_REVIEW]`, `[WALLET]`, service log/warn/error (all 8 describe blocks) |
| `state-machine-confinement.test.ts` | `[COMPLIANCE] Case` state transition log |
| `atomic-checkout.test.ts` | `[SETTLEMENT-RAIL]` idempotency check error |

## Verification
```
 ✔ 14 test files  |  394 tests passed  |  0 noise lines
 tsc --noEmit: exit 0
```
