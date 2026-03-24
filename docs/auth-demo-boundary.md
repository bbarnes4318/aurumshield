# Auth / Demo Boundary — Architecture Guide

> **Last updated:** 2026-03-24 (Prompt 3B — Production Auth Enforcement)

This document defines the trust boundary between AurumShield's production authentication (Clerk) and its demo/presentation mode (localStorage mock). Future contributors **must** understand this boundary before modifying any auth-related code.

---

## Auth Modes

AurumShield operates in one of three mutually exclusive auth modes, resolved by `src/lib/auth-mode.ts`:

| Mode | Condition | Identity Source | Authoritative? |
|---|---|---|---|
| **production** | Clerk configured with real `pk_*` key | Clerk `auth()` + `currentUser()` | ✅ YES |
| **demo** | `NEXT_PUBLIC_DEMO_MODE=true` + `?demo=true` | localStorage mock store | ❌ NO |
| **local-dev** | Clerk not configured, no demo flag | localStorage mock store | ❌ NO |

```typescript
import { getAuthMode, isProductionAuth } from "@/lib/auth-mode";

const mode = getAuthMode(); // "production" | "demo" | "local-dev"
```

---

## Module Trust Map

### Authoritative (Server-Side)

| Module | Responsibility |
|---|---|
| `src/middleware.ts` | Route protection via Clerk middleware |
| `src/lib/authz.ts` | Server-side session, role, capability, and LEI enforcement |
| `@clerk/nextjs/server` | Cryptographic session verification |

### Presentation-Only (Client-Side)

| Module | Responsibility | ⚠️ Warning |
|---|---|---|
| `src/providers/auth-provider.tsx` | Client-side auth context for UI rendering | May return mock identity in demo/local-dev |
| `src/components/auth/require-role.tsx` | Client-side role gate | Presentation only — server actions must independently verify |
| `src/components/auth/require-auth.tsx` | Client-side auth guard | Redirects to /login, does not enforce server-side |

### Demo-Only

| Module | Responsibility |
|---|---|
| `src/lib/auth-store.ts` | localStorage-backed user/session store |
| `src/demo/demo-mode.ts` | Demo state management (role, seed, anchor) |
| `src/providers/demo-provider.tsx` | Demo orchestration context (seed, tours, presentation mode) |
| `src/components/demo/*` | Demo overlays, tooltips, timelines |

---

## Server Action Enforcement Tiers

### Tier 1 — `requireProductionAuth()` (demo-mock identity REJECTED)

These actions gate **financially final** or **compliance-adjudicative** operations. Demo-mock identity throws `401 PRODUCTION_AUTH_REQUIRED`.

| Category | Actions |
|---|---|
| **Settlement execution** | `executeAtomicSwap`, `triggerSettlementPayouts`, `manuallyClearFunds`, `resolveAmbiguousState` |
| **Compliance adjudication** | `assignCaseAction`, `completeTaskAction`, `submitDispositionAction`, `revokeCompliance` |
| **Sanctions screening** | `screenCounterpartyEntity` |

### Tier 2 — `requireSession()` or `requireRole()` (demo-mock allowed)

These actions are **privileged** but not financially final. Demo-mock identity is intentionally accepted for demo rendering and development.

| Category | Actions | Rationale |
|---|---|---|
| **Deposit instructions** | `generateFiatDepositInstructions`, `generateDigitalDepositInstructions` | Read-like, mock fallback needed |
| **Logistics** | `routeAndCreateShipment`, `verifyAddressAndQuote` | Operational, not financially final |
| **Inventory** | `ingestAsset`, `parseAssayDocument`, `submitAssetIntakeProof`, `submitDoreIntake` | Records provenance |
| **Notifications** | `notifyPartiesOfSettlement` | Non-destructive |
| **Broker** | `structureBrokerDeal`, broker CRM ops | Role-gated (`BROKER`) |
| **Orders** | `createRetailOrder` | Session-gated |
| **Onboarding** | `registerSellerBank` | Session-gated |

### Tier 3 — No auth required

| Category | Actions | Rationale |
|---|---|---|
| **Public** | `joinWaitlist`, `verifyLEI` | Public endpoints |
| **Read-only queries** | Producer, compliance, settlement, treasury queries | Read-only, some session-scoped |

---

## Client-Side Components

`RequireRole` and `RequireAuth` use `useAuth()` from `auth-provider.tsx`. The `authSource` field on the context value indicates whether identity is `"clerk"`, `"mock"`, or `"loading"`.

---

## Rules for Future Contributors

> [!CAUTION]
> **NEVER** add mock/localStorage identity fallback inside `ClerkAuthAdapter`. The Clerk adapter must source identity **exclusively** from Clerk. Demo/mock auth is handled entirely by `MockAuthProvider` on bypass routes.

> [!WARNING]
> **NEVER** gate a financial execution action (settlement, payout, compliance disposition) using only client-side auth context (`useAuth()`). Always use `requireSession()` or `requireProductionAuth()` from `authz.ts` on the server side.

> [!IMPORTANT]
> When adding a new server action that gates a privileged operation, use `requireProductionAuth()` instead of `requireSession()` if demo-mock identity must be rejected.

### Do NOT:
- Import from `auth-store.ts` in server actions
- Use `useAuth().user.role` as the sole authorization check for financial operations
- Default to a privileged role when role is null/undefined (fail closed instead)
- Add `isDemoSession` checks inside the Clerk auth path

### DO:
- Use `getAuthMode()` for mode-dependent behavior
- Use `requireProductionAuth()` for settlement-critical server actions
- Use `requireRole()` from `authz.ts` for server-side role enforcement
- Check `authSource` on client-side when rendering auth-sensitive UI
