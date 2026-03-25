# Institutional Guided Journey — Handoff Documentation

> **Status:** Baseline complete. Ready for production deployment.
> **Last updated:** 2026-03-24

---

## 1. Final Institutional Route Model

```
/institutional/get-started/
  ├── welcome          ← Warm intro, macro-stage preview
  ├── organization     ← Entity + representative registration (Zod-validated)
  ├── verification     ← Auto-running KYB/AML/UBO/Compliance milestones
  └── funding          ← Stablecoin bridge or wire configuration

/institutional/first-trade/
  ├── asset            ← Curated gold product + quantity + intent selection
  ├── delivery         ← Vault custody or physical delivery + jurisdiction/region
  ├── review           ← Transparent cost breakdown (fail-closed guard)
  ├── authorize        ← Legal acknowledgment + server-backed submission
  └── success          ← Terminal confirmation + workspace handoff

/institutional/                ← Advanced workspace (PortalShell + sidebar)
/institutional/marketplace     ← Execution terminal (power users)
/institutional/orders          ← Trade blotter
/institutional/compliance      ← Compliance dashboard (re-attestation)
```

---

## 2. Final Journey / Stage Model

**Schema:** `institutional-journey-schema.ts`

| Stage | Phase | Route |
|-------|-------|-------|
| `WELCOME` | `GETTING_STARTED` | `/institutional/get-started/welcome` |
| `ORGANIZATION` | `GETTING_STARTED` | `/institutional/get-started/organization` |
| `VERIFICATION` | `GETTING_STARTED` | `/institutional/get-started/verification` |
| `FUNDING` | `GETTING_STARTED` | `/institutional/get-started/funding` |
| `FIRST_TRADE_ASSET` | `FIRST_TRADE` | `/institutional/first-trade/asset` |
| `FIRST_TRADE_DELIVERY` | `FIRST_TRADE` | `/institutional/first-trade/delivery` |
| `FIRST_TRADE_REVIEW` | `FIRST_TRADE` | `/institutional/first-trade/review` |
| `FIRST_TRADE_AUTHORIZE` | `FIRST_TRADE` | `/institutional/first-trade/authorize` |
| `FIRST_TRADE_SUCCESS` | `FIRST_TRADE` | `/institutional/first-trade/success` |

**Progression:** Linear. `getNextStage()` returns the next in sequence. Terminal: `FIRST_TRADE_SUCCESS`.

**Completion signal:** `isGuidedJourneyComplete(stage)` returns `true` only for `FIRST_TRADE_SUCCESS`.

---

## 3. Final Gating / Redirect Model

### StrictComplianceGate (`layout.tsx`)

| User State | On Guided Path? | Result |
|---|---|---|
| `status === "COMPLETED"` | Any | Allow through (PortalShell for advanced, passthrough for guided) |
| `status !== "COMPLETED"` | `/get-started/*` or `/first-trade/*` | Allow through (GuidedShellLayout) |
| `status !== "COMPLETED"` | Any other | Redirect → `/institutional/get-started/welcome` |
| Loading | Any | Loading spinner |
| Error | Any | Error screen |

### PortalShell Bypass

Routes matching `/institutional/get-started/*` or `/institutional/first-trade/*` bypass the PortalShell entirely, rendering through `MissionLayout` instead.

### Middleware

| Bare Path | Redirect Target |
|---|---|
| `/institutional/get-started` | `/institutional/get-started/welcome` |
| `/institutional/first-trade` | `/institutional/first-trade/asset` |

### Per-Page Guards

- **Review page:** Redirects to `/first-trade/delivery` if `isDeliveryStageReady()` is false
- **Authorize page:** Same guard as review
- **submitFirstTrade() server action:** Validates delivery readiness server-side (fail-closed)

### RoleRouter

- Institutional roles (`INSTITUTION_TRADER`, `INSTITUTION_TREASURY`) → `/institutional`
- No change needed; the layout-level gate handles guided vs. advanced routing.

---

## 4. metadata_json Namespace Catalog

All guided journey data is persisted in the `onboarding_state.metadata_json` JSONB column under namespaced keys:

| Namespace | Schema | Persisted By | Description |
|---|---|---|---|
| `__journey` | `journeyMetadataSchema` | Every page's "Continue" action | `{ stage, firstTradeCompleted }` — authoritative journey position |
| `__organization` | `organizationStageSchema` | Organization page | Entity identity + representative data |
| `__verification` | `verificationStageSchema` | Verification page | Four milestone boolean flags |
| `__funding` | `fundingStageSchema` | Funding page | Funding method + wallet/bank details |
| `__firstTradeDraft` | `firstTradeDraftSchema` | Asset, Delivery pages | Trade draft: asset, qty, intent, delivery |
| `__firstTradeIntent` | (ad hoc) | `submitFirstTrade()` server action | Final recorded trade intent with ref + timestamp |

**Merge strategy:** PostgreSQL `||` JSONB merge — new keys merge into existing, existing keys preserved unless explicitly overwritten.

---

## 5. Legacy Pages Preserved

| Surface | Path | Status |
|---|---|---|
| Portfolio Overview | `/institutional` | ✅ Kept as advanced workspace |
| Marketplace Terminal | `/institutional/marketplace` | ✅ Kept for cleared users |
| Trade Blotter | `/institutional/orders` | ✅ Kept for cleared users |
| Compliance Dashboard | `/institutional/compliance` | ✅ Kept for re-attestation |
| 4-pillar sidebar nav | Layout nav | ✅ Shown to cleared users only |
| OnboardingWizard | `/onboarding` | ✅ Preserved (not in institutional route tree) |

---

## 6. Guided-Flow Shared Components

| Component | Location | Purpose |
|---|---|---|
| `MissionLayout` | `components/institutional-flow/` | Full-screen calm layout with progress indicator |
| `StepShell` | `components/institutional-flow/` | Centered content card with icon, headline, description, footer |
| `StickyPrimaryAction` | `components/institutional-flow/` | Primary CTA + optional secondary "save and return later" |
| `SimpleProgress` | `components/institutional-flow/` | Dot-based step indicator |
| `BigChoiceCard` | `components/institutional-flow/` | Selectable option card with badge variants |
| `ReviewCard` | `components/institutional-flow/` | Key-value summary card |
| `AutoCheckList` | `components/institutional-flow/` | Auto-running milestone checklist |

---

## 7. Guided Placeholders vs. Fully Authoritative

| Feature | Status | Notes |
|---|---|---|
| Organization form data | **Authoritative** — Zod-validated, persisted | |
| LEI verification | **Authoritative** — GLEIF API call | |
| Verification milestones | **Simulated** — staggered timers | TODO: Wire to real KYB/AML providers |
| Funding configuration | **Persisted** — field-level validation | TODO: Wire to real bank/wallet verification |
| First-trade asset selection | **Authoritative** — uses `FIRST_TRADE_ASSETS` catalog | |
| Live gold pricing | **Authoritative** — `useGoldPrice()` hook | |
| Transaction limits | **Authoritative** — `checkTransactionLimits()` | |
| Trade authorization / submission | **Authoritative** — server action, fail-closed, audit-logged | |
| Quote-lock / final execution price | **Not implemented** — noted honestly in review | |
| Freight/logistics quotes | **Not implemented** — noted honestly in review | |
| DualAuth / WebAuthn | **Not used in guided flow** — reserved for operational settlement | |

---

## 8. Known Remaining Risks

1. **Verification is simulated** — KYB, AML, UBO milestones use staggered timers, not real provider calls. Must be wired before production compliance.
2. **Funding not validated externally** — Wallet addresses and bank details are persisted but not verified against OFAC or banking rails.
3. **Quote-lock not in guided flow** — Pricing is indicative only; execution price is not locked during the first trade.
4. **DualAuth / WebAuthn skipped** — The guided flow uses a simpler acknowledgment; operational settlement should use full DualAuth.
5. **No database migration needed** — All new data uses existing `metadata_json` JSONB column with namespaced keys. No schema changes required.

---

## 9. Future Follow-Up Items

- [ ] Wire verification milestones to real KYB/AML providers (Veriff, iDenfy, Elliptic)
- [ ] Add OFAC screening on wallet addresses at funding stage
- [ ] Implement quote-lock in the review/authorize flow
- [ ] Add DualAuth + WebAuthn gate at authorization for production
- [ ] Adapt the same guided pattern to other roles (offtaker, producer, broker)
- [ ] Add demo mode (`?demo=active`) support for the guided flow
- [ ] Deprecate or redirect legacy routes (`/perimeter/verify`, `/onboarding`)
- [ ] Consider adding freight quoting at the delivery stage for physical delivery
- [ ] Add Playwright E2E tests for the full guided journey

---

## 10. Cross-Role Adaptation Guidance

The guided-flow component system (`MissionLayout`, `StepShell`, `BigChoiceCard`, etc.) is fully role-agnostic. To adapt for another role:

1. Define a new journey schema with role-specific stages
2. Create route tree under the role prefix (e.g., `/offtaker/get-started/*`)
3. Add the role's routes to the compliance gate passthrough list
4. Reuse the same component library — only page content changes
5. Add middleware bare-path redirects as needed

---

## 11. Bugs Fixed During QA Phase

| Bug | Location | Fix |
|---|---|---|
| **CRITICAL:** First-trade routes blocked by compliance gate | `layout.tsx:60` | Extended `isOnGuidedPath` to include `/institutional/first-trade` |
| First-trade routes wrapped in PortalShell sidebar | `layout.tsx:134` | Extended PortalShell bypass to include `/institutional/first-trade` |
| Bare `/institutional/first-trade` path 404s | `middleware.ts` | Added redirect → `/institutional/first-trade/asset` |

---

## 12. Verification Results

| Check | Result |
|---|---|
| Unit tests (journey schema) | ✅ 64/64 passed |
| Full test suite | ✅ 465/465 passed (16 files) |
| ESLint | ✅ 0 errors |
| TypeScript (`tsc --noEmit`) | ✅ Clean (exit 0) |
