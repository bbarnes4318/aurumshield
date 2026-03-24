# Provider Normalization Audit — Workstream 3

## Executive Summary

The AurumShield compliance provider integration layer is **architecturally sound**. The normalization boundary is clean: all business logic (decision engine, case routing, disposition, settlement authorization) consumes `co_checks.normalizedVerdict` (PASS/FAIL/REVIEW) and `co_checks.resultCode` — never raw provider payloads directly.

No critical normalization bugs were found. Three hardening recommendations are documented below.

---

## Providers Inspected

| Provider | File(s) | Purpose | Status |
|----------|---------|---------|--------|
| **Veriff** (KYC) | `kyc-adapters.ts` (VeriffKycProvider) | ID document, liveness, address, UBO | Mock fallback when no API key |
| **Veriff** (KYB) | `kyc-adapters.ts` (VeriffKybProvider), `veriff-kyb-adapter.ts` | Business registration, UBO officers, entity AML | Mock fallback |
| **iDenfy** | `idenfy-adapter.ts` | KYC session generation (parallel provider) | Session-only, live API |
| **OpenSanctions** | `kyc-adapters.ts` (OpenSanctionsAmlProvider) | Sanctions, PEP screening | Mock fallback |
| **Elliptic** | `elliptic-adapter.ts` | Wallet KYT/AML screening | Live API (fail-closed) |
| **GLEIF** | `gleif-adapter.ts` | LEI validation | Mock fallback |
| **Inscribe.ai** | `inscribe-adapter.ts` | Document forensic validation | Fully mocked (TODO) |

## Normalization Boundary Analysis

### The Architecture Pattern

```
[Provider Raw API] → [Adapter] → [co_checks record] → [Decision Engine]
                                   ↑
                           normalizedVerdict: PASS|FAIL|REVIEW
                           resultCode: internal code (not provider-specific)
                           rawPayloadRef: S3 ref to original payload
```

### What Works Correctly

1. **`co_checks.normalizedVerdict`** — All business logic (decision engine, case routing, settlement authorization, case-service task rules) consumes this field exclusively. It uses only 3 values: `PASS`, `FAIL`, `REVIEW`.

2. **`co_checks.resultCode`** — Used for sub-categorization (e.g., `CONFIRMED_MATCH`, `POSSIBLE_MATCH`, `CLEAR`). The decision engine's `SANCTIONS_CONFIRMED_CODES` set uses internal codes, not provider-specific ones.

3. **`co_checks.rawPayloadRef`** — Raw provider payloads are stored by reference (S3 path), not embedded in the check record. Clean separation.

4. **`kyc-adapters.ts` interfaces** — `KycVerificationResult`, `KybVerificationResult`, and `AmlScreeningResult` are well-defined adapter output types with provider-agnostic fields. All mock and production implementations conform to these interfaces.

5. **Wallet risk service** — `co_wallet_screenings` stores normalized `riskTier`/`riskScore`/`sanctionsExposure`. The `wallet-risk-service.ts` consumes these normalized fields, not raw Elliptic fields.

6. **No provider-specific enums in downstream logic** — Decision engine, case-service, manual-review-rules, settlement-authorization-service all use normalized verdicts only.

### Issues Found

#### Finding #1 — Elliptic snake_case raw response (LOW RISK)
**Severity: Low**  
**File:** `elliptic-adapter.ts`  
**Issue:** `EllipticRiskResponse` uses raw snake_case field names (`risk_score`, `risk_tier`, `status`) matching the Elliptic API directly.  
**Impact:** This is acceptable because the response is consumed only by `wallet-risk-service.ts`, which maps these values into `co_wallet_screenings` columns (camelCase). The snake_case never reaches business logic.  
**Status:** No fix needed — the wallet-risk-service is the normalization step.

#### Finding #2 — Parallel Veriff KYB types (LOW RISK)
**Severity: Low**  
**Files:** `veriff-kyb-adapter.ts` vs `kyc-adapters.ts`  
**Issue:** `veriff-kyb-adapter.ts` defines its own `VeriffKYBDecision` type with `checkResults: VeriffCheckResult[]` separate from the `KybVerificationResult` interface in `kyc-adapters.ts`. These are structurally similar but not identical (e.g., `outcome` vs `outcome`, `confidence` exists in both but `subChecks` naming differs).  
**Impact:** Currently low-risk because `veriff-kyb-adapter.ts` handles webhook processing and the results are mapped to `co_checks` at the integration point, not consumed directly by business logic.  
**Status:** Merge when Veriff KYB goes live. Currently both are mocked.

#### Finding #3 — Mock fallback everywhere (DESIGN DECISION)
**Severity: Informational**  
**Files:** All adapters except `elliptic-adapter.ts`  
**Issue:** Every adapter except Elliptic falls back to deterministic mock implementations when API keys are absent. This is intentional for demo mode but means:
- Veriff KYC: mock output when `VERIFF_API_KEY` missing
- Veriff KYB: always delegates to mock (even with API key — see `verifyBusinessRegistration`)
- OpenSanctions: mock when `OPENSANCTIONS_API_KEY` missing
- GLEIF: commented-out fetch, mock only
- Inscribe: fully mocked (TODO markers)  
**Status:** Expected for current stage. Elliptic is the only live-wired provider.

## Fields: Trusted vs Inferred

| Field | Source | Trusted? | Notes |
|-------|--------|----------|-------|
| `normalizedVerdict` | Mapped from adapter outcome | ✅ Yes | Clean PASS/FAIL/REVIEW |
| `resultCode` | Internal codes set during check | ✅ Yes | Not provider-specific |
| `rawPayloadRef` | S3 path generated at storage time | ✅ Yes | Reference only |
| `confidence` (KYC/KYB) | Adapter output | ⚠️ Inferred | Mocked as fixed values. Will be real with live providers. |
| `riskScore` (Elliptic) | Raw API field | ✅ Yes | 0.00–10.00 from Elliptic API |
| `riskTier` (Elliptic) | Raw API field | ✅ Yes | 1–5 from Elliptic API |
| `matchCount` (AML) | Adapter output | ⚠️ Inferred | Deterministic mock; real with OpenSanctions |
| `listsChecked` (AML) | Adapter output | ✅ Yes | Hardcoded list names |
| `sanctionsExposure` (wallet) | Derived from Elliptic | ⚠️ Derived | Computed from risk_tier/risk_score |

## Provider-Specific Enum Leakage: NONE

Searched all business logic files (decision-engine, case-service, manual-review-rules, settlement-authorization-service, shipment-review-engine, refinery-review-engine). No provider-specific enum values (e.g., Veriff's `approved`/`declined`, Elliptic's tier numbers, OpenSanctions match scores) leak into:
- Case routing
- Disposition logic
- Settlement authorization gates
- Review workflow rules
- UI-facing data shaping

All downstream logic uses only: `normalizedVerdict` in {PASS, FAIL, REVIEW} and `resultCode` in {CLEAR, POSSIBLE_MATCH, CONFIRMED_MATCH, TRUE_POSITIVE, VERIFIED, etc.}

## Fixes Implemented

1. **Test fixtures added** — `src/lib/compliance/__fixtures__/provider-fixtures.ts`
   - KYC: 4 scenarios (happy path ID, happy path liveness, fail liveness, review address)
   - KYB: 3 scenarios (happy registration, fail registration, review entity AML)
   - AML: 5 scenarios (clear, possible match, confirmed match, PEP clear, PEP match)
   - Elliptic: 5 scenarios (low/medium/high/severe risk, malformed)
   - GLEIF LEI: 4 scenarios (valid/lapsed/invalid format/not found)
   - Inscribe: 2 scenarios (authentic assay, fraudulent assay)
   - Normalized checks: 8 scenarios (co_checks-compatible records for decision engine testing)

## Remaining Risks

1. **Mock-only providers** — GLEIF, Inscribe, Veriff KYB, and OpenSanctions are mocked. When live APIs are wired, real payload variability may expose edge cases not covered by mock logic.

2. **Webhook signature validation** — `veriff-kyb-adapter.ts` has a TODO for webhook HMAC validation. Without this, webhook payloads from Veriff are accepted without cryptographic verification.

3. **Stale screening refresh** — Only wallet screenings (Elliptic) have explicit freshness gating (24h). Other check types do not have TTL-based re-screening logic.

4. **iDenfy result processing** — `idenfy-adapter.ts` only generates sessions. There is no webhook handler or result retrieval function for processing iDenfy verification outcomes.

## Conclusion

The normalization boundary is **clean**. The `co_checks` table with `normalizedVerdict`/`resultCode`/`rawPayloadRef` is the effective normalization layer, and all business logic correctly consumes only normalized outputs. No code changes were required to fix leakage — the architecture was already properly layered.
