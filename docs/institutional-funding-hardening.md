# Institutional Funding Readiness Hardening

## What Funding Readiness Means Now

Funding readiness is a **dual-layer gate**:

| Layer | Function | Location |
|-------|----------|----------|
| **Client-side form completeness** | `isFundingReady()` — validates all required fields are non-empty for the selected funding method | `funding-stage-schema.ts` |
| **Server-authoritative readiness** | `evaluateFundingReadiness()` — validates persisted data via Zod, checks compliance case is APPROVED, applies format rules | `funding-readiness.ts` |

Progression to first-trade (`/institutional/first-trade/asset`) requires both layers to pass.

## Client-Guided vs Server-Authoritative

### Client-Guided Only
- Form field presence (non-empty strings)
- `isFundingConfigured` flag toggle
- Funding method selection (stablecoin vs wire)
- UI-level readiness indicator state

### Server-Authoritative (New)
- Zod schema validation of persisted `__funding` data
- Compliance case existence and APPROVED status
- **Stablecoin format validation**: wallet address pattern (EVM, Tron, Solana), network enum membership, asset enum membership
- **Wire format validation**: ABA routing number (9-digit), SWIFT/BIC (8 or 11 alphanumeric)
- Progression gating: `handleContinue` saves data, then calls `GET /api/compliance/funding-readiness` — only advances if `serverReady === true`

## Stablecoin & Wire Readiness Representation

### Digital Stablecoin Bridge
- **Server checks**: wallet address regex (`0x...`/`T...`/base58), network ∈ `{ERC-20, TRC-20, Solana, Base}`, asset ∈ `{USDC, USDT}`
- **Status**: `SERVER_READY` when all format checks pass AND compliance case is APPROVED

### Legacy Correspondent Wire
- **Server checks**: routing number is exactly 9 digits, SWIFT/BIC is 8 or 11 alphanumeric characters
- **Status**: `SERVER_READY` when all format checks pass AND compliance case is APPROVED

Both methods additionally require a compliance case with `status === "APPROVED"` — this ensures the counterparty has completed KYC/KYB/AML screening before funding configuration is accepted.

## What Remains Future Work

| Item | Detail |
|------|--------|
| **Wallet ownership verification** | On-chain proof-of-control (signed message) not implemented |
| **Live bank account verification** | Micro-deposit / Plaid integration not implemented |
| **Column Bank balance check** | `GET /bank-accounts/:id/balance` endpoint not integrated (stubbed in proof-of-funds) |
| **OFAC screening of wallet addresses** | Chainalysis/TRM integration for wallet screening not implemented |
| **Wire readiness gating by MSB status** | Legacy wire underwriting period (30-45 days) not enforced server-side |
| **Treasury console integration** | Full funding management (multiple accounts, limits, approvals) deferred |

## Files Changed

| File | Change |
|------|--------|
| `src/lib/compliance/funding-readiness.ts` | **[NEW]** Server-authoritative `evaluateFundingReadiness()` |
| `src/app/api/compliance/funding-readiness/route.ts` | **[NEW]** `GET /api/compliance/funding-readiness` endpoint |
| `src/lib/schemas/funding-stage-schema.ts` | **[MODIFIED]** Added `FundingReadinessStatus` type, `deriveFundingReadinessStatus()` helper |
| `src/app/institutional/get-started/funding/page.tsx` | **[MODIFIED]** Three-state readiness UI, server gate on progression |
| `src/lib/__tests__/institutional-journey.test.ts` | **[MODIFIED]** Added 4 tests for `deriveFundingReadinessStatus` |
| `docs/institutional-funding-hardening.md` | **[NEW]** This document |
