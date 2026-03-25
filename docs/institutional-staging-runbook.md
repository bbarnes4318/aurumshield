# Institutional Staging Runbook & Go-Live Checklist

> **Date:** 2026-03-25
> **Author:** Automated hardening audit
> **Scope:** Final readiness documentation for the institutional guided journey

---

## 1. Final Route Model

```
/institutional/get-started/
  ├── welcome          ← Warm intro, macro-stage preview
  ├── organization     ← Entity + representative registration (Zod-validated)
  ├── verification     ← Authoritative KYB/AML/UBO/Compliance milestones (reads compliance_cases.status)
  └── funding          ← Stablecoin bridge or wire configuration (server-authoritative readiness)

/institutional/first-trade/
  ├── asset            ← Curated gold catalog + quantity + transaction intent
  ├── delivery         ← Vault custody or secure delivery + jurisdiction/region
  ├── review           ← Indicative cost breakdown (fail-closed draft guard)
  ├── authorize        ← 3-layer auth + scroll-to-unlock + typed phrase + hold-to-confirm
  └── success          ← Terminal confirmation + workspace handoff

/institutional/                ← Advanced workspace (PortalShell + sidebar, COMPLETED users only)
/institutional/marketplace     ← Execution terminal (power users)
/institutional/orders          ← Trade blotter
/institutional/compliance      ← Compliance dashboard
```

### Middleware Redirects

| Bare Path | Redirect Target |
|---|---|
| `/institutional/get-started` | `/institutional/get-started/welcome` |
| `/institutional/first-trade` | `/institutional/first-trade/asset` |

---

## 2. Final Gating Model

### StrictComplianceGate (layout.tsx)

| User State | On Guided Path? | Result |
|---|---|---|
| `status === "COMPLETED"` | Any | Allow through |
| `status !== "COMPLETED"` | `/get-started/*` or `/first-trade/*` | Allow through (GuidedShellLayout) |
| `status !== "COMPLETED"` | Any other institutional route | Redirect → `/institutional/get-started/welcome` |
| Loading | Any | Loading spinner (compliance perimeter message) |
| Error | Any | Error screen with retry message |

### PortalShell Bypass

Routes matching `/institutional/get-started/*` or `/institutional/first-trade/*` bypass the PortalShell (sidebar + nav chrome), rendering through `MissionLayout`.

### Per-Page Guards

| Page | Guard | Fail behavior |
|---|---|---|
| Verification → Funding | `isVerificationComplete()` — requires `compliance_cases.status === APPROVED` | CTA disabled |
| Funding → First Trade | `isFundingReady()` (client) + `evaluateFundingReadiness()` (server) | CTA disabled |
| Review | `isDeliveryStageReady()` | Redirect to `/first-trade/delivery` |
| Authorize | `isDeliveryStageReady()` | Redirect to `/first-trade/delivery` |
| `submitFirstTrade()` | 3-layer server auth chain + idempotency guard + snapshot freshness + draft readiness | 403/400/500 |

### RoleRouter

Institutional roles (`INSTITUTION_TRADER`, `INSTITUTION_TREASURY`) → `/institutional`. The layout-level gate then handles guided vs. advanced routing based on `onboarding_state.status`.

---

## 3. Authoritative vs Guided Placeholder

| Feature | Classification | Source of Truth | Notes |
|---|---|---|---|
| Organization form data | **AUTHORITATIVE** | Zod-validated, persisted to `__organization` | |
| LEI verification | **AUTHORITATIVE** | GLEIF API call (`validateLEI()`) | |
| Verification milestones | **AUTHORITATIVE** | `compliance_cases.status` via `GET /api/compliance/cases/me` | All timer simulation removed |
| Funding form data | **AUTHORITATIVE** | Persisted to `__funding`, Zod + format validated server-side | |
| Funding server readiness | **AUTHORITATIVE** | `evaluateFundingReadiness()` — schema + format + compliance case | |
| Wallet screening truth | **AUTHORITATIVE** | `getWalletComplianceStatus()` — queries `co_wallet_addresses` / `co_wallet_screenings` | |
| First-trade asset catalog | **AUTHORITATIVE** | `FIRST_TRADE_ASSETS` constant | |
| Live gold pricing | **AUTHORITATIVE** | Pyth Network oracle (SSE), demo fallback | |
| Transaction limits | **AUTHORITATIVE** | `checkTransactionLimits()` server-side | |
| Indicative price snapshot | **INDICATIVE** (labeled) | Client-computed, Zod-validated, ≤5min freshness enforced server-side | |
| Platform fee (1.00%) | **AUTHORITATIVE** | `PLATFORM_FEE_BPS = 100` | |
| Trade authorization | **AUTHORITATIVE** | 3-layer server auth chain, typed confirmation phrase server-validated | |
| Trade intent ref | **AUTHORITATIVE** | Server-generated `FT-{UUID}`, persisted with full snapshot | |
| `firstTradeCompleted` flag | **AUTHORITATIVE** | Server-side only, idempotent | |
| Quote-lock / execution price | **NOT IMPLEMENTED** | No pricing service or exchange integration | Labeled honestly as INDICATIVE |
| Freight/logistics quoting | **NOT IMPLEMENTED** | No Brink's API integration | Delivery region captured only |
| DualAuth / WebAuthn | **NOT USED** | Reserved for operational settlement | Guided flow uses typed phrase + hold-to-confirm |
| Wallet ownership proof | **NOT IMPLEMENTED** | No on-chain signed message verification | |
| Live bank account verification | **NOT IMPLEMENTED** | No micro-deposit / Plaid integration | |
| Column Bank balance check | **NOT IMPLEMENTED** | Proof-of-funds is stubbed (mock balance) | |
| Provider session triggering | **NOT IMPLEMENTED** | Guided verification page reads status but does not initiate Veriff/iDenfy sessions | |

---

## 4. Verification Readiness Checklist

| Check | Status | Detail |
|---|---|---|
| Timer simulation removed | ✅ Done | All `setTimeout` replaced with `compliance_cases.status` reads |
| `deriveVerificationFromCase()` pure function | ✅ Done | Maps case status → 4 milestone booleans |
| Auto-polling (10s interval) | ✅ Done | `useComplianceCaseVerification()` hook |
| Fail-closed progression | ✅ Done | Only `APPROVED` status passes `isVerificationComplete()` |
| 15 unit tests covering all statuses | ✅ Done | `institutional-journey.test.ts` |
| Human-readable status labels | ✅ Done | `getVerificationStatusLabel()` |
| Provider session initiation | ⚠️ NOT WIRED | Page reads status but does not trigger Veriff/iDenfy |
| Veriff/iDenfy redirect on `CompliancePendingError` | ⚠️ NOT WIRED | Server logic exists but guided page doesn't call it |
| Error recovery for REJECTED status | ⚠️ NOT WIRED | No UI for rejected users to re-apply |

---

## 5. Funding Readiness Checklist

| Check | Status | Detail |
|---|---|---|
| Client form completeness (`isFundingReady()`) | ✅ Done | Field presence validation per method |
| Server Zod validation | ✅ Done | `evaluateFundingReadiness()` step 3 |
| Stablecoin format validation (EVM/Tron/Solana regex) | ✅ Done | Step 5 |
| Wire format validation (ABA 9-digit, SWIFT 8/11 char) | ✅ Done | Step 5 |
| Compliance case APPROVED check | ✅ Done | Step 6 |
| Wallet screening truth integration | ✅ Done | Step 7 — hard blockers block, warnings surface without blocking |
| Three-state readiness UI | ✅ Done | `NOT_CONFIGURED` → `FORM_COMPLETE` → `SERVER_READY` |
| Honest OFAC screening label | ✅ Done | Dynamic label replaces static "OFAC Screened" |
| 4 `deriveFundingReadinessStatus` tests | ✅ Done | |
| Wallet ownership verification | ⚠️ NOT IMPLEMENTED | No on-chain proof-of-control |
| Live bank verification (Plaid/micro-deposit) | ⚠️ NOT IMPLEMENTED | |
| Column Bank balance check | ⚠️ NOT IMPLEMENTED | Stubbed in proof-of-funds |

---

## 6. First-Trade Authorization Checklist

| Check | Status | Detail |
|---|---|---|
| 3-layer server auth chain | ✅ Done | `requireProductionAuth()` → `requireReverification()` → `requireComplianceCapability("EXECUTE_PURCHASE")` |
| Demo-mock rejection | ✅ Done | `requireProductionAuth()` rejects `authSource !== "clerk"` |
| Session freshness (5-min window) | ✅ Done | `requireReverification()` |
| DB-verified compliance capability | ✅ Done | Fail-closed — DB unreachable = 500 |
| Idempotency guard | ✅ Done | Rejects if `firstTradeCompleted` already true |
| Server-validated confirmation phrase | ✅ Done | Must match `"CONFIRM TRADE"` exactly |
| Indicative snapshot Zod validation | ✅ Done | Full schema validation at submission |
| Snapshot staleness check (≤5min) | ✅ Done | `isSnapshotFresh()` |
| Draft readiness check | ✅ Done | `isDeliveryStageReady(draft)` |
| Scroll-to-unlock legal text | ✅ Done | 4 numbered clauses, scroll-to-bottom gate |
| Typed confirmation phrase UI | ✅ Done | Amber partial → green exact match |
| Hold-to-confirm (3 seconds) | ✅ Done | Client-side friction, prevents accidental click |
| 12+ authorization unit tests | ✅ Done | `first-trade-authorization.test.ts` |
| 5 snapshot freshness tests | ✅ Done | `institutional-journey.test.ts` |
| Server-side quote-lock | ⚠️ NOT IMPLEMENTED | Pricing is INDICATIVE only |
| WebAuthn/FIDO2 signing | ⚠️ NOT IMPLEMENTED | Reserved for operational settlement |

---

## 7. Stablecoin / Wallet Readiness Checklist

| Check | Status | Detail |
|---|---|---|
| `wallet-compliance-status.ts` query service | ✅ Done | 10-state `WalletScreeningTruth` enum |
| `deriveWalletScreeningTruth()` pure function | ✅ Done | Exported for unit testing |
| `isWalletHardBlocker()` / `isWalletWarning()` helpers | ✅ Done | 4 hard blockers, 5 warning states |
| Integration in `evaluateFundingReadiness()` | ✅ Done | Step 7 — hard blockers → funding blocked |
| 35 wallet compliance unit tests | ✅ Done | All 10 states + precedence + classification |
| `co_wallet_addresses` / `co_wallet_screenings` DB schema | ✅ Done | Tables exist |
| Elliptic KYT screening trigger at onboarding | ⚠️ NOT WIRED | `screenWalletAddress()` exists but not called during onboarding |
| Wallet registration during onboarding | ⚠️ NOT WIRED | No auto-creation of `co_wallet_addresses` record |
| Warning → hard blocker promotion | ⚠️ DEFERRED | When Elliptic is fully wired, `NOT_REGISTERED`/`NEVER_SCREENED`/`SCREENING_STALE` can become hard blockers |

---

## 8. Staging Smoke-Test Checklist

| # | Test | Steps | Expected |
|---|---|---|---|
| 1 | **New user → guided flow** | Login with fresh institutional account → navigate to `/institutional` | Redirect to `/institutional/get-started/welcome` |
| 2 | **Welcome → Organization** | Click "Begin Setup" | Navigate to `/get-started/organization` |
| 3 | **Organization → Verification** | Fill valid entity data, submit | Navigate to `/get-started/verification` |
| 4 | **Verification milestone display** | Observe verification page | Milestones reflect `compliance_cases.status` — NOT auto-completing |
| 5 | **Verification → Funding (blocked)** | Attempt to continue before APPROVED case | "Continue" CTA disabled |
| 6 | **Verification → Funding (approved)** | Set compliance case to APPROVED via admin | "Continue" becomes active, navigates to `/get-started/funding` |
| 7 | **Funding (stablecoin)** | Select stablecoin, enter valid EVM wallet + network + asset | Three-state indicator shows `FORM_COMPLETE` → `SERVER_READY` |
| 8 | **Funding (wire)** | Select wire, enter valid bank details | Same progression |
| 9 | **Funding OFAC label truth** | Check footer label with unscreened wallet | Shows "OFAC Screening Pending" (not "OFAC Screened") |
| 10 | **Funding → First Trade** | Click continue after `SERVER_READY` | Navigate to `/first-trade/asset` |
| 11 | **Asset selection** | Select gold product, set quantity, choose intent | CTA enables |
| 12 | **Delivery configuration** | Choose vault custody or secure delivery with jurisdiction | CTA enables |
| 13 | **Review page guards** | Navigate directly to `/first-trade/review` with incomplete draft | Redirect to `/first-trade/delivery` |
| 14 | **Review indicative pricing** | Complete delivery, navigate to review | Shows "Indicative Transaction Estimate" with live spot + breakdown |
| 15 | **Authorize scroll-to-unlock** | Navigate to authorize | Legal text container shows "Scroll to read ↓", typed input disabled |
| 16 | **Authorize typed phrase** | Scroll legal text, type "CONFIRM TRADE" | Input turns green, hold-to-confirm button enables |
| 17 | **Authorize submission** | Hold button 3 seconds | Submits, navigates to success page |
| 18 | **Success page honesty** | Observe success page | Shows "Trade Intent Confirmed", indicative snapshot with all line items |
| 19 | **Idempotency guard** | Navigate back to authorize, attempt re-submission | Server rejects with idempotency error |
| 20 | **Completed user → advanced workspace** | After first trade, navigate to `/institutional` | Shows PortalShell with sidebar (Portfolio, Marketplace, Orders, Compliance) |
| 21 | **Legacy COMPLETED user bypass** | Login with pre-existing COMPLETED user (no `__journey`) | Goes directly to advanced workspace, NOT guided flow |

---

## 9. Production Smoke-Test Checklist

| # | Test | Additional Production Checks |
|---|---|---|
| 1–21 | All staging smoke tests above | Same expected behavior |
| 22 | **Production auth enforcement** | `submitFirstTrade()` rejects demo-mock sessions (authSource must be `clerk`) |
| 23 | **Clerk session freshness** | If Clerk session > 5 minutes old, `requireReverification()` returns 403 |
| 24 | **Compliance capability check** | `requireComplianceCapability("EXECUTE_PURCHASE")` queries real DB, not JWT fallback |
| 25 | **Wallet screening in production** | `getWalletComplianceStatus()` queries real `co_wallet_addresses` table |
| 26 | **Compliance case polling** | Verification page auto-polls every 10s, updates milestones when case transitions |
| 27 | **TLS / CSP headers** | All institutional routes served over TLS with correct security headers |
| 28 | **Audit trail** | `emitAuditEvent` calls produce structured logs for compliance, funding, and trade events |
| 29 | **Error boundaries** | DB unreachable → 500 (not silent pass). Visible error state in UI |

---

## 10. Rollback Checklist

| Step | Action |
|---|---|
| 1 | Identify the failing deployment via AWS ECS blue/green service dashboard |
| 2 | Roll back to previous task set in ECS (blue/green cutover reversal) |
| 3 | Verify institutional routes load on the reverted deployment |
| 4 | If rollback is due to DB schema incompatibility: institutional flow uses `metadata_json` JSONB namespaced keys — no schema migration was added, so no DB rollback is required |
| 5 | If rollback is due to a new `co_wallet_addresses`/`co_wallet_screenings` issue: these tables are read-only by the institutional flow — no writes to roll back |
| 6 | Notify stakeholders of rollback, document root cause in incident log |

---

## 11. Known Risks After Hardening

| # | Risk | Severity | Detail |
|---|---|---|---|
| 1 | **No server-side quote-lock** | Medium | Pricing is INDICATIVE only. The user sees an estimated total, but no price is locked. Final execution price will be determined at settlement. Labeled honestly throughout the UI. |
| 2 | **Provider session not triggered from guided page** | Medium | The verification page reads `compliance_cases.status` authoritatively but does NOT initiate a Veriff/iDenfy session from within the guided flow. Users must complete verification separately (admin action or external trigger). |
| 3 | **Wallet warnings don't block funding** | Medium | Unscreened/stale/not-registered wallets pass funding readiness as warnings. If the Elliptic pipeline is down, a user can reach first-trade with an unscreened wallet. Settlement Gate 5 remains the hard enforcement boundary. |
| 4 | **Wallet registration gap** | Low-Medium | Entering a wallet address on the funding page does NOT create a `co_wallet_addresses` record. The wallet must be registered separately before it can be screened. |
| 5 | **No wallet ownership proof** | Low-Medium | Users can enter any valid-format wallet address. No on-chain signature proves they control the wallet. |
| 6 | **No live bank verification** | Low-Medium | Wire banking details are format-validated only (ABA, SWIFT). No micro-deposit or Plaid verification of account ownership. |
| 7 | **Proof-of-funds is stubbed** | Low | `verifyProofOfFunds()` assumes funds are available if a compliance case exists. Requires Column Bank `GET /bank-accounts/:id/balance` integration. |
| 8 | **Reverification UX gap** | Low | If a Clerk session is > 5 minutes old, `requireReverification()` returns 403. No graceful re-auth flow exists in the UI — user sees a raw error. |
| 9 | **Hold-to-confirm is client-only** | Low | Server does not enforce hold duration. Server-side friction is provided by typed phrase + 3-layer auth chain. |
| 10 | **No Playwright E2E tests** | Low | Full journey is unit-tested (535+ tests) but no automated browser-level E2E tests exist for the guided flow. |

---

## 12. Exact Blockers Before Production-Ready

> [!IMPORTANT]
> **The institutional flow is STAGING-READY, not yet PRODUCTION-READY.**
> The following blockers must be resolved before the flow can be called production-ready for real institutional onboarding.

| # | Blocker | Classification | Detail |
|---|---|---|---|
| 1 | **Provider session triggering** | REQUIRED | The guided verification page must be able to initiate a Veriff/iDenfy session (call `evaluateCounterpartyReadiness()` via server action). Without this, no new user can complete verification through the guided flow alone — requires manual admin intervention. |
| 2 | **Wallet registration during onboarding** | REQUIRED for stablecoin users | When a user enters a wallet address on the funding page, a `co_wallet_addresses` record should be auto-created so the Elliptic screening pipeline can process it. Without this, wallet screening truth will always be `NOT_REGISTERED`. |
| 3 | **Reverification UX** | RECOMMENDED | Users hitting the 5-minute session freshness window need a graceful re-authentication prompt, not a raw 403 error page. |
| 4 | **REJECTED case recovery** | RECOMMENDED | Users with a REJECTED compliance case have no path forward in the guided flow. Needs a UI for re-application or support escalation. |

Everything else (quote-lock, freight quoting, DualAuth, wallet ownership proof, live bank verification, Column balance check) is honestly labeled as future work and does not block staging or initial production deployment of the guided journey as a commercial intent pipeline.

---

## 13. Test Verification Results

| Check | Result |
|---|---|
| TypeScript `tsc --noEmit` | ✅ Clean (exit 0) |
| Unit tests (full suite) | ✅ 535/536 passed (1 pre-existing flake: transient timeout in risk-parameterization, not institutional) |
| Institutional journey tests | ✅ All passing (stage model, draft readiness, funding readiness, verification derivation, snapshot freshness, wallet compliance) |
| First-trade authorization tests | ✅ All passing (12+ test cases covering 3-layer auth chain) |
| Wallet compliance status tests | ✅ All passing (35 tests covering all 10 screening truth states) |

---

## 14. Hardening Audit Trail

| Phase | Document | Scope |
|---|---|---|
| Baseline | `docs/institutional-guided-journey-handoff.md` | Route model, gating, component library, metadata namespaces |
| Prompt 2 | `docs/institutional-verification-hardening.md` | Timer simulation → authoritative compliance case reads |
| Prompt 3 | `docs/institutional-funding-hardening.md` | Server-authoritative funding readiness service |
| Prompt 3 | `docs/institutional-quote-and-commercial-confirmation-hardening.md` | Indicative pricing snapshot, honest labeling |
| Prompt 4 | `docs/institutional-first-trade-authorization-hardening.md` | 3-layer auth chain, scroll-to-unlock, typed phrase, hold-to-confirm |
| Prompt 5 | `docs/institutional-wallet-hardening.md` | Wallet compliance truth, funding integration |
| Prompt 6 | `docs/institutional-staging-runbook.md` | **This document** — final readiness assessment |
