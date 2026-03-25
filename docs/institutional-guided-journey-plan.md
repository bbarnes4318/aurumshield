# Institutional Guided Journey — Architecture Plan

## 1. Current Institutional Entry Flow After Login

```
POST-LOGIN
  ↓
RoleRouter.tsx (client-side, invisible)
  • detects INSTITUTION_TRADER or INSTITUTION_TREASURY
  • router.replace("/institutional")
  ↓
/institutional/layout.tsx
  • wraps ALL /institutional/* pages in PortalShell
  • injects StrictComplianceGate as a complianceGate prop
  ↓
StrictComplianceGate (in layout.tsx)
  • calls useOnboardingState() → GET /api/compliance/state
  • checks: onboardingState?.status === "COMPLETED"
  • if NOT completed → router.replace("/institutional/compliance")
  • if loading → spinner "Verifying Institutional Compliance Perimeter"
  • if error → red error screen
  ↓
/institutional/compliance/page.tsx
  • shows a hardcoded compliance-check dashboard (KYC/AML/KYB)
  • if not cleared → shows "Complete Verification" button
  • that button links to → /perimeter/verify
  ↓
/perimeter/verify (separate route tree, NOT under /institutional)
  • likely renders the OnboardingWizard-adjacent verification flow
  ↓
/onboarding/page.tsx (separate route tree, NOT under /institutional)
  • renders the 7-step OnboardingWizard component
  • on completion → routes to /offtaker (WRONG ROLE for institutional)
```

### What the user sees on first login (institutional):
1. Blank screen with "Verifying Institutional Compliance Perimeter" spinner
2. Auto-redirect to `/institutional/compliance`
3. A dense compliance dashboard showing all-verified mock data
4. A "Complete Verification" button linking to `/perimeter/verify`
5. No clear guided path — user must figure out the plumbing themselves


## 2. Current Redirect/Gating Logic

| Gate | Location | Condition | Target |
|------|----------|-----------|--------|
| Role routing | `RoleRouter.tsx:89-91` | `INSTITUTIONAL_ROLES.includes(role)` | `/institutional` |
| Compliance gate | `layout.tsx:32-38` | `onboardingState?.status !== "COMPLETED"` | `/institutional/compliance` |
| Orders hard-eject | `orders/page.tsx:484-488` | `!isCleared` | `/institutional/org/select` |
| OnboardingWizard completion | `OnboardingWizard.tsx:301-303` | Submit success | `/offtaker` |
| OnboardingWizard resume-later | `OnboardingWizard.tsx:275-276` | User clicks "Resume Later" | `/offtaker` |
| Middleware | `middleware.ts` | Domain-based + Clerk auth | No institutional-specific gates |

### Drift found:
- **Orders page** ejects non-cleared users to `/institutional/org/select` — a route that does not exist
- **OnboardingWizard** redirects to `/offtaker` on both completion and resume — wrong role destination
- **Layout compliance gate** redirects to `/institutional/compliance`, but that page itself has no embedded onboarding — just a link out to `/perimeter/verify`
- **Triple-redundant** compliance checks: layout gate, compliance page, AND orders page each independently check `onboardingState.status`


## 3. Current Onboarding Architecture

### OnboardingState model (`onboarding-state.ts`):
- Persisted in PostgreSQL `onboarding_state` table
- Keyed by `user_id`, upserted on conflict
- Tracks: `currentStep` (1–4 per schema, 1–7 in practice), `status` (enum), `metadataJson` (form data blob), `providerInquiryId`
- Statuses: `IN_PROGRESS`, `PROVIDER_PENDING`, `MCA_PENDING`, `MCA_SIGNED`, `REVIEW`, `COMPLETED`, `ABANDONED`

### OnboardingWizard component (491 lines):
- 7-step monolithic wizard with all compliance sub-steps
- Custom `ProgressBar` showing all 7 steps simultaneously (dense, intimidating)
- Renders inside `/onboarding/page.tsx` — NOT under `/institutional`
- Steps: Entity & LEI → KYB → UBO → AML → Source of Funds → Maker-Checker → DocuSign MCA
- Save-and-resume via TanStack Query mutations to `/api/compliance/state`
- MCA hard gate on step 7 — fail-closed with fatal overlay
- **Problem**: On completion, routes to `/offtaker` instead of `/institutional`

### Drift:
- `patchOnboardingStateSchema` limits `currentStep` to `max(4)` but the wizard uses 7 steps — Zod validation may reject steps 5–7
- The wizard's `metadataJson` blob stores the entire form as an untyped record — no schema evolution strategy
- The wizard is shared infrastructure but has hardcoded offtaker redirect


## 4. Current First-Trade / Marketplace Architecture

### Marketplace (`/institutional/marketplace/page.tsx` — 1,202 lines):
- Single-page execution terminal with asset catalog, delivery mode selection, freight quoting, quote lock, and execution
- Dense 3-step horizontal wizard (Execution Config → Capital Routing → Review & Execute)
- On execution: stores result in `sessionStorage` (ephemeral!) and routes to `/institutional/orders/{orderId}`
- Requires asset selection + destination + quantity before enabling quote lock
- Enforces transaction limits via `checkTransactionLimits()`
- Uses real gold price feed via `useGoldPrice()`

### Orders (`/institutional/orders/page.tsx` — 729 lines):
- Full trade blotter with search, filter, slide-out detail drawers
- DualAuth gate + WebAuthn modal for settlement execution
- Merges dynamically created orders from `sessionStorage` (fragile)
- Has its own redundant compliance check with wrong redirect target

### Problems for first-time users:
- The marketplace is a professional execution terminal — zero guidance for someone who has never purchased gold
- The orders page assumes an existing trade history
- Both pages assume the user is already compliance-cleared
- No progressive disclosure — all complexity visible at once


## 5. Onboarding-State Drift

| Issue | Location | Impact |
|-------|----------|--------|
| `currentStep` max is 4 in Zod, wizard uses 7 steps | `onboarding-state.ts:48` | Steps 5–7 may fail validation on PATCH |
| Completion redirect goes to `/offtaker` | `OnboardingWizard.tsx:301-303` | Wrong destination for institutional role |
| Resume-later redirect goes to `/offtaker` | `OnboardingWizard.tsx:275-276` | Wrong destination for institutional role |
| Wizard not rendered under `/institutional/*` | `/onboarding/page.tsx` | Institutional users lose nav context |
| `metadataJson` stores everything as untyped blob | `onboarding-state.ts:38` | No schema migration path |
| No `first_trade_completed` or guided-journey concept in state | — | No way to know if user needs guided flow vs. advanced |


## 6. Route Drift

| Route | Purpose | Problem |
|-------|---------|---------|
| `/institutional/org/select` | Orders page eject target | **Does not exist** — 404 |
| `/perimeter/verify` | Compliance page link target | Separate route tree, no institutional context |
| `/onboarding` | OnboardingWizard host | Not under `/institutional`, no sidebar |
| `/offtaker` | Wizard completion target | Wrong role destination for institutional users |
| `/institutional/compliance` | Compliance gate target | Shows mock verified data, no actual onboarding wizard |


## 7. What Should Remain as Advanced/Power-User Surfaces

| Surface | Path | Verdict |
|---------|------|---------|
| Portfolio Overview (dense telemetry dashboard) | `/institutional` | **KEEP as advanced** — rebrand as "Institutional Workspace" |
| Marketplace (execution terminal) | `/institutional/marketplace` | **KEEP as advanced** — available after first trade |
| Trade Blotter (orders) | `/institutional/orders` | **KEEP as advanced** — available after first trade |
| Compliance Dashboard | `/institutional/compliance` | **KEEP as advanced** — useful for re-attestation |
| 4-pillar sidebar nav (Portfolio, Marketplace, Orders, Compliance) | Layout nav | **KEEP** — shown to cleared users, hidden during guided flow |


## 8. Target Simplified Guided Architecture

### New Route Hierarchy

```
/institutional/get-started/
  ├── welcome          ← warm intro, explain what's coming
  ├── organization     ← entity registration (simplified from 7-step wizard)
  ├── verification     ← KYB + AML (auto-run, single screen)
  └── funding          ← source-of-funds + MCA signing

/institutional/first-trade/
  ├── asset            ← pick your first gold product (curated, not a catalog grid)
  ├── delivery         ← vault or physical, one choice
  ├── review           ← transparent cost breakdown, radical transparency
  ├── authorize        ← DualAuth + WebAuthn gate
  └── success          ← confirmation + entry into full platform
```

### Design Principles for Guided Flow

1. **One action per screen** — no multi-column layouts, no data tables
2. **Progressive disclosure** — legal/compliance detail collapsed by default
3. **Persistent step indicator** — simple horizontal dots (not a 7-label progress bar)
4. **No sidebar during guided flow** — full-screen calm layout with centered content
5. **Fail-closed gating** — each step validates before allowing forward motion
6. **Server-backed state** — extend `onboarding_state` table with guided journey fields

### What Should NOT Be Reused from the Old Dense UI

| Component | Why Not |
|-----------|---------|
| `OnboardingWizard` (7-step monolith) | Too dense, all 7 labels visible, intimidating progress bar |
| `ProgressBar` (from OnboardingWizard) | Shows all 7 items — violates "one action per screen" |
| Marketplace page as first-trade | 1,200-line execution terminal is not a guided experience |
| Orders page as post-trade | Assumes existing history, too data-dense |
| `StrictComplianceGate` redirect to `/institutional/compliance` | Should redirect to `/institutional/get-started/welcome` for first-run users |

### What SHOULD Be Reused

| Component / Logic | How |
|-------------------|-----|
| `useOnboardingState()` hook | Core query/mutation for persisting progress |
| `onboarding-state.ts` server CRUD | PostgreSQL persistence — extend, don't replace |
| Zod step schemas from `onboarding-schema.ts` | Reuse validation per step, just render one at a time |
| `useGoldPrice()` hook | Show live price during first-trade asset selection |
| Asset catalog constants from marketplace | Curated subset for first trade |
| `checkTransactionLimits()` | Enforce limits during first trade |
| `DualAuthGate` + `WebAuthnModal` | Reuse at `/first-trade/authorize` |
| `ClearingCertificate` | Show after successful first trade |

### State Model Changes Required

1. **Extend `onboarding_state` table** with:
   - `guided_journey_phase` enum: `'ONBOARDING' | 'FIRST_TRADE' | 'COMPLETE'`
   - `guided_journey_step` string: e.g. `'welcome'`, `'organization'`, `'asset'`, etc.
   - These track WHERE in the guided flow the user is, separate from the compliance status
2. **Fix Zod schema**: change `currentStep` max from 4 to 7 (or remove the ceiling)
3. **Add `first_trade_completed` boolean** to state — this is the gate between guided and advanced
4. **Routing decision tree**:
   - If `status !== 'COMPLETED'` → `/institutional/get-started/{guided_journey_step}`
   - If `status === 'COMPLETED' && !first_trade_completed` → `/institutional/first-trade/asset`
   - If `status === 'COMPLETED' && first_trade_completed` → `/institutional` (advanced workspace)

### Layout Architecture

```
/institutional/get-started/layout.tsx  ← NEW: full-screen, no sidebar, calm layout
/institutional/first-trade/layout.tsx  ← NEW: full-screen, no sidebar, calm layout
/institutional/layout.tsx              ← EXISTING: keep PortalShell + sidebar for advanced
```

The guided layouts will:
- Be full-screen with centered content card (max-w-xl)
- Show a minimal step indicator (dots, not labels)
- Include "I'll do this later" escape hatch back to advanced workspace
- Not use the PortalShell at all

### Navigation Changes

- **StrictComplianceGate** in existing layout.tsx: modify to redirect to `/institutional/get-started/welcome` instead of `/institutional/compliance` for first-run users
- **RoleRouter**: no change needed (already routes to `/institutional`)
- **OnboardingWizard**: keep as-is but fix redirect targets (this is the old path, new users won't see it)
- **New guided layout**: gating is per-route with server-backed state checks


## Summary of Current Problems

1. **First-run institutional users see a compliance verification spinner → dense compliance dashboard → link to a separate route tree** — no guidance, no warmth, no clarity
2. **The OnboardingWizard is buried in `/onboarding`** (not under `/institutional`) and redirects to `/offtaker` (wrong role)
3. **The compliance page shows hardcoded verified-status mock data** — misleading for users who haven't actually verified
4. **Three different components check compliance status independently** with three different failure redirect targets (one doesn't exist)
5. **The marketplace is a professional execution terminal** — inappropriate as a first-trade experience
6. **Onboarding state Zod schema caps `currentStep` at 4** but the wizard has 7 steps
7. **No concept of "guided journey phase"** in the state model — cannot distinguish first-run from returning power users
8. **sessionStorage is the sole persistence for trade execution records** — ephemeral and unreliable


## Verification Plan

### Phase 1 (This Phase) — Document Only
- No code changes made (except optional clarifying comments)
- Verification: document accuracy confirmed by manual file inspection
- All route paths, component names, and redirect targets verified against source files
- Drift catalog confirmed by cross-referencing line numbers

### Phase 2+ (Future Phases) — Code Changes
- `npx next lint` after each change phase
- `npx tsc --noEmit` for type checking
- Manual browser navigation testing of guided flow routes
- Verify that existing advanced pages remain accessible and functional
- Verify fail-closed gating at each guided step


## Remaining Risks Before Phase 2

1. **Database migration required** — extending `onboarding_state` table needs a migration script
2. **Zod schema fix** (`currentStep` max 4 → 7) may affect existing persisted rows with steps 5–7
3. **PortalShell props** — the `complianceGate` prop pattern means the guided layout cannot easily share the existing gate; needs a separate layout
4. **Demo mode** — the marketplace supports `?demo=active` query param; guided flow should also support this for investor demos
5. **Perimeter routes** (`/perimeter/verify`, `/perimeter/register`) — unclear if these are still needed or can be deprecated in favor of guided flow
