# Institutional UI Wiring Audit

> **Date:** 2026-03-24  
> **Scope:** End-to-end integration audit of the institutional user journey — routing, layout shells, sidebar behavior, compliance gating, and post-completion handoff.

---

## Executive Summary

The institutional guided journey is **correctly wired end-to-end**. An incomplete user is routed through a full-screen guided flow with no sidebar. A completed user sees the advanced 4-pillar workspace inside `PortalShell`. The admin sidebar has zero institutional route leakage. One stale legacy route (`/institutional-portal`) remains but is unreachable from the live UI.

---

## 1. Routing Chain — What Happens After Login

### RoleRouter (`src/components/auth/RoleRouter.tsx`)

| Role | Redirect Target |
|------|----------------|
| `INSTITUTION_TRADER`, `INSTITUTION_TREASURY` | `/institutional` |
| `admin`, `compliance`, `treasury`, `vault_ops` | `/dashboard` (no redirect) |
| `offtaker`, `buyer`, `seller` | `/offtaker/org/select` |

- Mounted inside `AppShell`, intercepts `/dashboard` only
- Fail-closed: no role = no redirect (waits for auth)

### Middleware (`src/middleware.ts`)

Bare parent-path redirects prevent 404s:

| Path | Redirect |
|------|----------|
| `/institutional/get-started` | `/institutional/get-started/welcome` |
| `/institutional/first-trade` | `/institutional/first-trade/asset` |

These exist in **both** localhost and production host blocks. ✅

### AppShell (`src/components/layout/app-shell.tsx`)

`/institutional` is in `SHELL_BYPASS_ROUTES` — the admin sidebar/topbar are **never rendered** for any `/institutional/*` path. The institutional layout provides its own shell. ✅

---

## 2. What an Incomplete Institutional User Sees

1. Login → RoleRouter → `/institutional`
2. `institutional/layout.tsx` renders `StrictComplianceGate`
3. Gate checks `onboardingState.status`
4. Status ≠ `COMPLETED` → redirect to `/institutional/get-started/welcome`
5. Guided routes (`/get-started/*`, `/first-trade/*`) bypass `PortalShell` entirely
6. `get-started/layout.tsx` renders `MissionLayout` — **full-screen, no sidebar, no dense nav**

**Result:** Calm, one-action-per-screen guided flow. No sidebar. No command-center chrome. ✅

---

## 3. What a Completed Institutional User Sees

1. Login → RoleRouter → `/institutional`
2. `StrictComplianceGate` allows through (`status === "COMPLETED"`)
3. `institutional/layout.tsx` renders `PortalShell` with 4-pillar nav:

| Sidebar Item | Route |
|-------------|-------|
| Portfolio Overview | `/institutional` |
| Marketplace | `/institutional/marketplace` |
| Orders | `/institutional/orders` |
| Compliance | `/institutional/compliance` |

Plus the Goldwire logo link → `/transactions/new` (valid route). ✅

---

## 4. Guided Flow Reachability & Enforcement

### Is the guided flow reachable?

**Yes.** The `StrictComplianceGate` enforces the redirect:

```
if (!isCleared && !isOnGuidedPath) → router.replace("/institutional/get-started/welcome")
```

### Is it enforced?

**Yes.** The gate has three protections:
1. **Redirect:** Incomplete users on non-guided paths are redirected to welcome
2. **Passthrough:** Guided routes are explicitly excluded from the redirect to prevent loops
3. **Loading guard:** Shows compliance verification spinner during auth resolution

### Stage progression model

The journey schema (`src/lib/schemas/institutional-journey-schema.ts`) defines 9 ordered stages:

```
WELCOME → ORGANIZATION → VERIFICATION → FUNDING
→ FIRST_TRADE_ASSET → FIRST_TRADE_DELIVERY → FIRST_TRADE_REVIEW
→ FIRST_TRADE_AUTHORIZE → FIRST_TRADE_SUCCESS
```

Each stage maps to an exact route. `resolveJourneyStage()` handles backward compat with legacy records.

---

## 5. Advanced Workspace Access — Only at the Correct Time

The `StrictComplianceGate` checks `onboardingState.status === "COMPLETED"`. Advanced workspace routes (`/institutional`, `/marketplace`, `/orders`, `/compliance`) are only accessible after completion.

For legacy users (pre-journey COMPLETED records with no `__journey` metadata), `resolveJourneyStage()` returns `null`, meaning they bypass guided flow and go directly to the advanced workspace. This is intentional — we cannot retroactively force them through first-trade. ✅

---

## 6. Sidebar Behavior Analysis

### What is intentionally IN the sidebar

**Institutional PortalShell sidebar (completed users only):**
- Portfolio Overview → `/institutional`
- Goldwire logo → `/transactions/new`
- Marketplace → `/institutional/marketplace`
- Orders → `/institutional/orders`
- Compliance → `/institutional/compliance`
- Footer: "Institutional Terminal v1.0 / AurumShield Goldwire Network"

### What is intentionally NOT in the sidebar

- **Guided routes** (`/get-started/*`, `/first-trade/*`) — these are full-screen, no sidebar
- **Admin sidebar** — zero references to any `/institutional` route (confirmed via grep)
- **Legacy `/institutional-portal`** — not in any sidebar

### Are guided pages route-driven only?

**Yes.** The guided flow is entirely URL-driven. There are no sidebar links to guided pages. Navigation between guided steps is controlled by in-page `StickyPrimaryAction` buttons and `router.push()` calls. The `MissionLayout` provides macro-stage progress but no free navigation.

---

## 7. Stale Routes & References

### `/institutional-portal` (STALE)

| Item | Status |
|------|--------|
| Route exists | `src/app/institutional-portal/page.tsx` |
| Renders | `UnifiedInstitutionalHub` (legacy component) |
| In `SHELL_BYPASS_ROUTES` | Yes (`app-shell.tsx:33`) |
| Referenced from live UI | **No** — nothing links here |
| Impact | Dead route, no user can reach it naturally |

**Verdict:** This is inert. The `UnifiedInstitutionalHub`, `InstitutionalWizard`, and `InstitutionalPortalWrapper` components are all orphaned legacy artifacts of the pre-guided-flow architecture. They compile but serve no purpose. Safe to delete in a cleanup pass but **not a wiring bug** — no live code path reaches them.

### `/get-started` index page (REDUNDANT BUT HARMLESS)

`src/app/institutional/get-started/page.tsx` does a client-side `router.replace()` to `/get-started/welcome`. The middleware already handles this same redirect. Both are present, which means the redirect happens whether the middleware catches it or not. Not a bug — defense in depth. ✅

---

## 8. Current UI vs. Intended Architecture

| Aspect | Intended | Actual | Match? |
|--------|----------|--------|--------|
| Incomplete users see guided flow | Full-screen mission layout | `MissionLayout` via `get-started/layout.tsx` | ✅ |
| No sidebar during guided flow | Bypass PortalShell | Layout check on pathname | ✅ |
| Completed users see workspace | PortalShell with 4-pillar nav | Rendered with compliance gate | ✅ |
| Admin sidebar has no institutional links | Zero leakage | Confirmed (zero grep hits) | ✅ |
| Guided flow is URL-driven | No sidebar nav to guided pages | StickyPrimaryAction buttons only | ✅ |
| Legacy COMPLETED users skip guided flow | resolveJourneyStage returns null | Backward-compat mapper works | ✅ |
| First-trade success hands off cleanly | "Enter Workspace" → `/institutional` | `StickyPrimaryAction href="/institutional"` | ✅ |
| Journey state persisted server-side | `metadata_json.__journey` | Via `PATCH /api/compliance/state` | ✅ |

---

## 9. Test Coverage

The journey schema has comprehensive unit tests (609 lines):

- `src/lib/__tests__/institutional-journey.test.ts`
  - `getPhaseForStage` — all 9 stages
  - `getRouteForStage` — all 9 routes
  - `getNextStage` — full progression + terminal null
  - `getStageIndex` — boundary indices
  - `isGuidedJourneyComplete` — true only for SUCCESS
  - `resolveJourneyStage` — authoritative, legacy COMPLETED, IN_PROGRESS step mapping, other statuses, firstTradeCompleted flag
  - `isAssetStageReady` / `isDeliveryStageReady` — draft readiness guards
  - `isFundingReady` — funding stage validation
  - `isVerificationComplete` — milestone guard
  - `organizationStageSchema` — Zod validation

---

## 10. Bugs Found

**None.** The institutional UI wiring is coherent and correctly enforced. No routing loops, no shell mismatches, no stale redirects that affect the live user experience.

---

## 11. What Remains to Harden

| Priority | Item | Rationale |
|----------|------|-----------|
| Low | Delete `/institutional-portal` route + `UnifiedInstitutionalHub` + `InstitutionalWizard` + `InstitutionalPortalWrapper` | Dead code. Not reachable, but clutters the codebase. |
| Low | Remove `/institutional-portal` from `SHELL_BYPASS_ROUTES` in `app-shell.tsx` | Accompanies the route deletion above. |
| Medium | Add route-level stage enforcement on individual guided pages | Currently, a user could manually navigate to `/first-trade/review` without completing earlier stages. The stage model tracks progress, but individual pages don't enforce it. The `StrictComplianceGate` prevents non-guided access, but within the guided flow, stage-skipping is theoretically possible. |
| Medium | Add E2E tests for the full redirect chain | Unit tests cover the schema layer thoroughly. Integration tests for the actual `RoleRouter` → `StrictComplianceGate` → `MissionLayout` rendering chain would add confidence. |
| Low | Remove double-redirect for `/institutional/get-started` | Both middleware and `get-started/page.tsx` handle this. One could be removed, but both are harmless. |

---

## Files Inspected

| File | Purpose |
|------|---------|
| `src/components/auth/RoleRouter.tsx` | Post-login traffic controller |
| `src/middleware.ts` | Domain gating + bare path redirects |
| `src/components/layout/app-shell.tsx` | Shell bypass for portal routes |
| `src/app/institutional/layout.tsx` | Smart entry router + StrictComplianceGate |
| `src/app/institutional/page.tsx` | Portfolio overview (advanced workspace) |
| `src/app/institutional/get-started/layout.tsx` | Guided shell (MissionLayout) |
| `src/app/institutional/get-started/page.tsx` | Index redirect to welcome |
| `src/app/institutional/get-started/welcome/page.tsx` | Welcome page |
| `src/app/institutional/first-trade/layout.tsx` | First-trade guided shell |
| `src/app/institutional/first-trade/success/page.tsx` | Completion handoff |
| `src/components/layout/portal-shell.tsx` | Unified portal layout |
| `src/components/layout/sidebar.tsx` | Admin sidebar (no institutional refs) |
| `src/hooks/use-onboarding-state.ts` | Journey hooks |
| `src/lib/schemas/institutional-journey-schema.ts` | Stage model |
| `src/lib/__tests__/institutional-journey.test.ts` | Journey unit tests |
| `src/app/institutional-portal/page.tsx` | Stale legacy route |

## Summary

- **Files changed:** 0 (no wiring bugs to fix)
- **Bugs found:** 0
- **Guided flow visible in real UI:** ✅ Yes — correctly enforced and reachable
- **Sidebar behavior intentional:** ✅ Yes — guided pages have no sidebar, workspace has 4-pillar nav
- **Stale legacy route:** `/institutional-portal` — dead but harmless
- **Next hardening steps:** Per-stage route guards, E2E redirect chain tests, legacy route cleanup
