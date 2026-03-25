# Institutional Wallet Hardening — Prompt 5

## Summary

Hardened wallet screening representation in the institutional funding/readiness flows so stablecoin readiness reflects actual compliance truth. The system no longer claims "OFAC Screened" when a wallet has never been screened.

## What Changed

### New: `wallet-compliance-status.ts`

Read-only query service that returns authoritative wallet compliance state by querying `co_wallet_addresses` and `co_wallet_screenings`. Returns a structured `WalletScreeningTruth` enum with 10 possible states:

| State | Meaning | Blocker? |
|---|---|---|
| `SCREENING_CURRENT` | Fresh screening, LOW/MEDIUM risk, no sanctions | Clean |
| `RISK_HIGH` | Fresh screening, HIGH risk tier | Warning |
| `NOT_REGISTERED` | Wallet not in co_wallet_addresses | Warning |
| `NEVER_SCREENED` | Registered but zero screenings | Warning |
| `SCREENING_STALE` | Latest screening > 24h old | Warning |
| `WALLET_PENDING_REVIEW` | Wallet status = PENDING_REVIEW | Warning |
| `SANCTIONS_FLAGGED` | Latest screening has sanctions exposure | **Hard block** |
| `RISK_SEVERE` | Latest screening risk_tier = SEVERE | **Hard block** |
| `WALLET_FROZEN` | Wallet previously frozen by compliance action | **Hard block** |
| `WALLET_BLOCKED` | Wallet permanently blocked | **Hard block** |

Includes `deriveWalletScreeningTruth()` — a pure function exported for unit testing.

### Modified: `funding-readiness.ts`

Added **Step 7: Wallet Compliance Truth** after the compliance case check. When `fundingMethod === "digital_stablecoin"`:

- Calls `getWalletComplianceStatus(walletAddress)`
- Hard blockers → add to `blockers[]`, preventing readiness
- Warnings → add check with `passed: true` (surfaces truth without blocking)
- Added `walletScreeningStatus` and `walletComplianceDetail` to `FundingReadinessResult`

### Modified: Funding Page UI

- Replaced static "OFAC Screened · Zero Data Storage" footer with dynamic `walletScreeningLabel()` that shows:
  - "OFAC Screened ✓" when screening is current
  - "OFAC Screening Pending" when not registered / never screened / stale
  - "OFAC Compliance Block" when sanctions flagged / severe / frozen / blocked
  - "MSB Compliance Gated" for wire method (no wallet screening applicable)

### Modified: `institutional-journey.test.ts`

Added 35 new tests covering:
- All 10 `deriveWalletScreeningTruth` states
- Precedence rules (staleness > risk, sanctions > risk tier)
- String date handling
- `isWalletHardBlocker` classification (4 blockers, 6 non-blockers)
- `isWalletWarning` classification (5 warnings, 5 non-warnings)

## Readiness Semantics Now in Place

| Funding Method | Readiness Gate | Behavior |
|---|---|---|
| `digital_stablecoin` | Form completeness | Client-side field validation |
| `digital_stablecoin` | Schema validation | Server-side Zod parse |
| `digital_stablecoin` | Wallet format | Regex (EVM, Tron, Solana) |
| `digital_stablecoin` | Compliance case | Must be APPROVED |
| `digital_stablecoin` | **Wallet screening truth** | **NEW — queries co_wallet_addresses/screenings** |
| `legacy_wire` | Form completeness | Client-side field validation |
| `legacy_wire` | Schema validation | Server-side Zod parse |
| `legacy_wire` | ABA/SWIFT format | Regex validation |
| `legacy_wire` | Compliance case | Must be APPROVED |

## What Remains Future Work

| Item | Detail |
|---|---|
| **Wallet ownership verification** | On-chain proof-of-control (signed message) not implemented |
| **Live Elliptic screening trigger** | `screenWalletAddress()` exists but is not called during onboarding — only at settlement |
| **Promote warnings to blockers** | When Elliptic pipeline is fully wired, `NOT_REGISTERED`/`NEVER_SCREENED`/`SCREENING_STALE` can become hard blockers |
| **Wallet registration during onboarding** | Auto-create `co_wallet_addresses` row when user enters a wallet address — currently deferred |
| **Treasury console integration** | Full wallet management (multiple wallets, rotation, approval flows) deferred |
| **Column Bank balance check** | `GET /bank-accounts/:id/balance` not integrated |

## Remaining Risks Before Prompt 6

1. **Warning states don't block** — By design, unscreened wallets pass funding readiness as warnings. If the Elliptic integration fails silently, a user could reach first-trade with a completely unscreened wallet. Settlement Gate 5 remains the hard enforcement boundary.
2. **Wallet registration gap** — Entering a wallet address on the funding page does NOT create a `co_wallet_addresses` record. The wallet must be registered separately (via admin or future API) before it can be screened.
3. **No ownership proof** — A user can enter any valid-format wallet address. There's no on-chain signature verification proving they control the wallet.

## Files Changed

| File | Change |
|---|---|
| `src/lib/compliance/wallet-compliance-status.ts` | **[NEW]** Read-only wallet compliance status query service |
| `src/lib/compliance/funding-readiness.ts` | **[MODIFIED]** Step 7 wallet screening integration, new result fields |
| `src/app/institutional/get-started/funding/page.tsx` | **[MODIFIED]** Honest OFAC screening label, wallet screening type import |
| `src/lib/__tests__/institutional-journey.test.ts` | **[MODIFIED]** 35 new wallet compliance status tests |
| `docs/institutional-wallet-hardening.md` | **[NEW]** This document |
