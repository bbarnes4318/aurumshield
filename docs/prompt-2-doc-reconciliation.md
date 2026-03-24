# Prompt 2 — Documentation Reconciliation Report

**Date:** March 2026  
**Scope:** Deep reconciliation of three strategic docs + README cross-check  
**TypeScript Verification:** `npx tsc --noEmit` — **CLEAN** (exit 0)

---

## Summary

Three large strategic documents were audited and corrected to eliminate stale V1/V2 trade-centered language, replace phantom provider references, and add the refinery-centered settlement model that defines the V3 architecture.

---

## Document 1: `PLATFORM_CAPABILITIES.md` (7 edits)

| Area | Issue | Fix |
|---|---|---|
| Exec Summary | Generic marketplace description, no refinery model | Added refinery-centered pipeline description, 6-gate authorization |
| Settlement Lifecycle (4.1) | Showed 6-state `ESCROW_OPEN → SETTLED` | Updated to 18-state model with `PROCESSING_RAIL`, DvP states, edge states |
| Refinery Pipeline | Missing entirely | Added new Section 6.7 (pipeline stages) and 6.8 (6-gate authorization) |
| Compliance OS | Missing entirely | Added Section 7.5 with `co_*` tables, TTL gating, rescreening crons |
| Data Model Appendix | Listed phantom `VerificationCase` | Replaced with real V1 `ComplianceCase` + V3 `co_*` tables (7 rows) |
| Accuracy Disclosure | Missing | Added provider mock status list and V1/V3 coexistence statement |
| Version | 1.3.0 Feb 2026 | Updated to 1.4.0 March 2026 |

---

## Document 2: `buyer-journey.md` (7 edits)

| Area | Issue | Fix |
|---|---|---|
| Phase 2 (KYC) | Referenced **Persona** as KYC provider | Corrected to **Veriff** (KYC/KYB) + **iDenfy** (AML) + **OpenSanctions** |
| Phase 2 (Webhooks) | Referenced `/api/webhooks/persona` | Corrected to `/api/webhooks/veriff` + `/api/webhooks/idenfy` |
| Phase 2 (KYB) | Persona business inquiry | Corrected to Veriff KYB |
| Phase 2 (new) | No V3 Compliance OS section | Added V3 Compliance OS subsection with TTL, rescreening, authorization |
| Phase 6 (Settlement) | V1 states: `FUNDS_CONFIRMED`, `GOLD_ALLOCATED`, `IDENTITY_VERIFIED` | Updated to real states: `FUNDS_HELD`, `ASSET_ALLOCATED`, `DVP_READY`, `DVP_EXECUTED`, `PROCESSING_RAIL` |
| Phase 6 (new) | No refinery pipeline or 6-gate authorization | Added Refinery Pipeline table and 6-Gate Authorization table |
| Phase 7 (Payout) | Referenced **Moov** + **Modern Treasury** with auto-failover | Corrected to **Column Bank** (USD/Fedwire) + **Turnkey** (USDT/MPC), no failover |
| Phase 8 (Logistics) | Referenced **EasyPost** (USPS Registered Mail) for ≤$50k | Corrected to **Brink's** (≤$500k) + **Malca-Amit** (>$500k) |
| Tool Registry | Listed Persona, Moov, EasyPost; no status column | Replaced with 22-entry registry with Veriff, iDenfy, Column, Turnkey, Elliptic, GLEIF, Inscribe.ai + status column |
| Decision Matrices | Moov/MT/EasyPost mermaid diagrams | Corrected to Column/Turnkey (by currency) and Brink's/Malca-Amit (by value) |

---

## Document 3: `aurumshield-agent-knowledge-base.md` (11 edits)

| Area | Issue | Fix |
|---|---|---|
| Platform Identity | No refinery-centered model | Added refinery pipeline and 6-gate authorization to platform description |
| Pricing | "Bloomberg, Refinitiv, OANDA" multi-oracle | Corrected: Bloomberg B-PIPE (mock-backed), LBMA fix reference; Refinitiv removed |
| Settlement Rails | "Modern Treasury + Moov with failover" | Corrected to Column Bank (USD) + Turnkey (USDT), no failover |
| Trade State Machine | V1 states: `PENDING_COLLATERAL`, `APPROVED_UNSETTLED` | Updated to V3 states: `FUNDS_HELD`, `DVP_READY`, `PROCESSING_RAIL` |
| KYC Providers | "Persona" for identity verification | Corrected to Veriff + iDenfy + OpenSanctions |
| V3 Compliance OS | Missing entirely | Added new Q&A covering `co_*` schema, TTL gating, rescreening crons, 6-gate pipeline |
| Banking (Section 6) | "Moov + Modern Treasury" | Corrected to Column Bank + Turnkey |
| Corporate Wallet | "Moov and Modern Treasury" | Corrected to Column Bank (USD) + Turnkey (USDT) |
| Force Majeure | "Moov failures" | Corrected to "Fedwire disruptions" |
| Privacy Policy | "Persona for verification, Moov for banking, DocuSign" | Corrected to "Veriff/iDenfy, Column/Turnkey, Dropbox Sign" |
| Version | 1.0 / Feb 2026 | Updated to 2.0 / March 2026 |

---

## Document 4: `README.md` — Cross-Check

README was rewritten in Prompt 1. Cross-checked against actual codebase:

| Claim | Verification |
|---|---|
| `co_*` tables (Migration 028) | ✅ `028_compliance_os_foundation.sql` exists |
| `/api/cron/stale-check-sweep` | ✅ Route exists at `src/app/api/cron/stale-check-sweep/route.ts` |
| `/api/cron/sanctions-refresh` | ✅ Referenced in `rescreening-jobs.ts` |
| Settlement states (18-state model) | ✅ Matches `SettlementStatus` type in `settlement-queries.ts` |
| Column Bank / Turnkey dual-rail | ✅ Matches `settlement-rail.ts` implementation |

**No inaccuracies found in the rewritten README.**

---

## Verification

- `npx tsc --noEmit` — **CLEAN** (exit 0)
- No code files were modified (documentation-only pass)
- All three documents updated with version bumps

---

## Terminology Standardization

The following terms are now consistently used across all four documents:

| Canonical Term | Supersedes |
|---|---|
| Column Bank | "Moov" (for USD payouts) |
| Turnkey | "Moov" (for USDT payouts) |
| Veriff | "Persona" (for KYC) |
| iDenfy | (was missing) |
| OpenSanctions | (unchanged) |
| Brink's / Malca-Amit | "EasyPost" / "USPS Registered Mail" |
| V3 Compliance OS | (was missing from all three docs) |
| Refinery-centered | "trade-centered" / generic marketplace |
| `co_*` tables | `VerificationCase` (phantom) |
| 6-gate settlement authorization | (was missing) |
| TTL-based freshness gating | (was missing) |
