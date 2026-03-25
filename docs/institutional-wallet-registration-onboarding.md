# Institutional Wallet Registration During Onboarding

> How entering a stablecoin wallet during institutional funding onboarding registers it in the compliance domain.

## Problem

The funding page persisted wallet data to onboarding state metadata (`__funding`), but never created a `co_wallet_addresses` record. This meant `getWalletComplianceStatus()` permanently returned `NOT_REGISTERED`, leaving the wallet invisible to the screening pipeline.

## Solution

Added a wallet registration step during funding save that creates or upserts the wallet record in the compliance domain.

## Architecture

```
Funding Page → handleContinue()
  │
  ├─ Step 1: Save __funding to onboarding_state
  │
  ├─ Step 1.5: POST /api/compliance/wallets/register
  │    │
  │    ├─ requireSession() → userId
  │    ├─ getOrCreateSubject(userId)
  │    │    └─ SELECT co_subjects WHERE userId = ?
  │    │    └─ If missing → INSERT co_subjects (ENTITY, ACTIVE)
  │    ├─ registerWalletAddress()
  │    │    └─ SELECT co_wallet_addresses WHERE address = ?
  │    │    └─ If missing → INSERT co_wallet_addresses (ACTIVE, NEVER_SCREENED)
  │    │    └─ If exists → UPDATE chain/asset/updatedAt
  │    └─ Return { REGISTERED, walletId, isNew }
  │
  ├─ Step 2: GET /api/compliance/funding-readiness
  └─ Step 3: Advance to first trade
```

## State Transition

| Before | After Registration |
|--------|-------------------|
| `NOT_REGISTERED` | `NEVER_SCREENED` |

The wallet moves from being invisible to the compliance domain to being registered and awaiting screening. No fake screening completion is introduced.

## Screening Trigger — Deferred

Registration does NOT trigger Elliptic KYT screening because:
- The Elliptic adapter (`elliptic-adapter.ts`) throws fatally if `ELLIPTIC_API_KEY` / `ELLIPTIC_API_SECRET` env vars are missing
- Crashing the funding save flow is unacceptable
- Screening is enforced at settlement time via `evaluateWalletForSettlement()` (Gate 5)

**TODO**: Wire a non-fatal screening trigger (e.g., a background job) that screens newly registered wallets asynchronously.

## Idempotency

- `getOrCreateSubject()`: SELECT before INSERT — reuses existing subject
- `registerWalletAddress()`: SELECT by address → UPDATE if exists, INSERT if not
- Repeated saves with the same address update `chain`/`asset`/`updatedAt` only

## Network Mapping

The UI uses display names (`"ERC-20 (Ethereum)"`), but `co_wallet_addresses.chain` stores identifiers:

| UI Network | Chain ID |
|------------|----------|
| ERC-20 (Ethereum) | `ethereum` |
| TRC-20 (Tron) | `tron` |
| Solana | `solana` |
| Base | `base` |

## Files Changed

| File | Type | Purpose |
|------|------|---------|
| `src/lib/compliance/wallet-registration-service.ts` | **NEW** | getOrCreateSubject + registerWalletAddress |
| `src/lib/actions/register-wallet-action.ts` | **NEW** | Server action wrapping registration service |
| `src/app/api/compliance/wallets/register/route.ts` | **NEW** | POST API bridge |
| `src/app/institutional/get-started/funding/page.tsx` | **MODIFIED** | Step 1.5 wallet registration call |
