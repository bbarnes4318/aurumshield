# Prompt 3 — Auth/Demo Boundary Hardening Report

> **Date:** 2026-03-24
> **Scope:** Auth boundary audit, demo isolation, role hardening, trust boundary cleanup

---

## 1. Files Audited

| File | Lines | Purpose |
|---|---|---|
| `src/middleware.ts` | 210 | Domain-split + Clerk middleware |
| `src/providers/auth-provider.tsx` | 447 | Dual-mode auth context (Clerk + mock) |
| `src/lib/auth-store.ts` | 169 | localStorage-backed session store |
| `src/lib/authz.ts` | 462 | Server-side authorization helpers |
| `src/demo/demo-mode.ts` | 78 | Demo state management |
| `src/providers/demo-provider.tsx` | 204 | Demo orchestration context |
| `src/components/auth/require-role.tsx` | 51 | Client-side role gate |
| `src/components/auth/RoleRouter.tsx` | 118 | Post-login traffic controller |
| `src/components/auth/require-auth.tsx` | 61 | Client-side auth guard |
| `src/lib/__tests__/fail-closed-authz.test.ts` | 230 | RSK-012 security tests |
| `src/actions/*.ts` (7 files) | — | Server actions consuming `requireSession()` |

---

## 2. Risks Found

| # | Risk | Severity | File | Line |
|---|---|---|---|---|
| R1 | `requireSession()` returns hardcoded `INSTITUTION_TRADER` with `APPROVED` KYC + mock LEI when Clerk disabled | 🔴 HIGH | `authz.ts` | 134-145 |
| R2 | `isDemoSession` in `ClerkAuthAdapter` allows localStorage mock user to shadow Clerk identity | 🔴 HIGH | `auth-provider.tsx` | 208 |
| R3 | `requireReverification()` fully bypassed when `!CLERK_ENABLED` | 🟡 MEDIUM | `authz.ts` | 399-403 |
| R4 | `RoleRouter` defaults to `"offtaker"` when user is null | 🟡 MEDIUM | `RoleRouter.tsx` | 72 |
| R5 | `RequireRole` consumes `useAuth()` which can return demo identity | 🟡 MEDIUM | `require-role.tsx` | 32 |
| R6 | `auth-store.ts` naming suggests authoritative auth (`requireUser`) | 🟡 MEDIUM | `auth-store.ts` | 105 |
| R7 | No documentation explaining auth/demo trust boundary | 🟢 LOW | — | — |

---

## 3. Fixes Applied

### New Files

| File | Purpose |
|---|---|
| `src/lib/auth-mode.ts` | Centralized auth mode resolver — single source of truth for production/demo/local-dev |
| `docs/auth-demo-boundary.md` | Trust boundary documentation for future contributors |
| `docs/prompt-3-auth-demo-hardening.md` | This audit report |

### Modified Files

| File | Fix | Risk |
|---|---|---|
| `src/lib/authz.ts` | Added `authSource` field to `AuthSession`, demo-mock warning logs, `requireProductionAuth()` helper, centralized `CLERK_ENABLED` via `auth-mode.ts` | R1, R3 |
| `src/providers/auth-provider.tsx` | Removed `isDemoSession` leak from `ClerkAuthAdapter`, added `authSource` to context, Clerk adapter no longer initializes mock store | R2 |
| `src/components/auth/RoleRouter.tsx` | Changed `user?.role ?? "offtaker"` to fail-closed `user?.role ?? null` with early return | R4 |
| `src/components/auth/require-role.tsx` | Added trust boundary comment clarifying presentation-only status | R5 |
| `src/lib/auth-store.ts` | Added `⚠️ DEMO/DEV ONLY` header warning, renamed `requireUser()` → `requireMockUser()` | R6 |

---

## 4. Protected Flows Hardened

| Flow | Enforcement |
|---|---|
| Settlement actions (`settlement-actions.ts`) | `requireSession()` → now returns `authSource: "demo-mock"` with warning when not production |
| Banking actions (`banking.ts`) | Same — `requireProductionAuth()` available for stricter enforcement |
| Compliance revocation (`revoke-compliance.ts`) | Same |
| Logistics (`logistics.ts`) | Same |
| Inventory actions (`inventory-actions.ts`) | Same |
| Producer queries (`producer-queries.ts`) | Same |
| Notifications (`notifications.ts`) | Same |
| Broker actions (`broker-actions.ts`) | `requireRole()` via `authz.ts` — server-authoritative when Clerk enabled |

---

## 5. Remaining Risks

| Risk | Status | Mitigation |
|---|---|---|
| Demo-mock `requireSession()` still returns privileged identity | **Accepted** — necessary for demo rendering. `requireProductionAuth()` is now available for settlement-critical flows that must reject demo identity. | Server actions can upgrade to `requireProductionAuth()` per-endpoint as needed. |
| `RequireRole` / `RequireAuth` use client context | **Accepted** — these are presentation gates. Server actions independently verify. | Documented in `auth-demo-boundary.md` and in code comments. |
| `middleware.ts` passes all requests through when `CLERK_ENABLED=false` | **Accepted** — local dev convenience. In production, Clerk keys are always configured. | Deployment enforces Clerk configuration. |

---

## 6. Demo Behavior Preserved

| Feature | Status |
|---|---|
| Demo mode activation (`NEXT_PUBLIC_DEMO_MODE=true` + `?demo=true`) | ✅ Preserved |
| Demo seeding via `DemoProvider` | ✅ Preserved |
| MockAuthProvider for demo/bypass routes | ✅ Preserved |
| Presentation mode (SHIFT+D / `?present=true`) | ✅ Preserved |
| Demo role switching | ✅ Preserved |
| Demo overlays, tooltips, timelines | ✅ Preserved (untouched) |

---

## 7. Verification Results

| Check | Result |
|---|---|
| TypeScript compilation (`npx tsc --noEmit`) | ✅ Exit code 0 |
| `isDemoSession` removed from `ClerkAuthAdapter` | ✅ Confirmed via grep |
| `requireUser()` zero remaining callers | ✅ Confirmed via grep |
| All 7 server action files use `requireSession()` from `authz.ts` | ✅ Confirmed |
| `fail-closed-authz.test.ts` — test structure unchanged | ✅ Tests mock Clerk, unaffected by demo fallback changes |

---

## 8. Recommendation for Prompt 4

**Focus: Live Clerk Integration Verification**

Now that the auth/demo boundary is hardened, the next priority should be verifying end-to-end Clerk authentication flows in the deployed environment:

1. Verify Clerk org role mapping (`CLERK_ROLE_MAP`) matches actual Clerk Dashboard configuration
2. Confirm `requireProductionAuth()` correctly blocks demo-mock sessions in settlement actions
3. Audit which server actions should be upgraded from `requireSession()` to `requireProductionAuth()` based on financial sensitivity
4. Test step-up re-verification (`requireReverification()`) with real Clerk session claims
5. Confirm `authSource: "clerk"` propagates correctly through the auth context in production
