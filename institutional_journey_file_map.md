# Institutional Journey — Complete File Map

Every file involved in the institutional onboarding flow, from first page load to first trade.

---

## 1. Pages & Layouts (`src/app/institutional/`)

| File | Purpose |
|------|---------|
| [layout.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/layout.tsx) | Root institutional layout |
| [page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/page.tsx) | Institutional landing / redirect |

### Get Started Flow (`get-started/`)

| File | Purpose |
|------|---------|
| [layout.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/get-started/layout.tsx) | Guided shell — wraps all steps in `MissionLayout` |
| [page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/get-started/page.tsx) | Entry redirect |
| [welcome/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/get-started/welcome/page.tsx) | Step 0 — Welcome + macro progress framing |
| [organization/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/get-started/organization/page.tsx) | Step 1 — Entity name + jurisdiction |
| [verification/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/get-started/verification/page.tsx) | Step 2 — KYB/AML milestone checklist + provider initiation |
| [funding/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/get-started/funding/page.tsx) | Step 3 — Stablecoin or wire funding config |

### First Trade Flow (`first-trade/`)

| File | Purpose |
|------|---------|
| [layout.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/first-trade/layout.tsx) | First-trade guided shell |
| [asset/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/first-trade/asset/page.tsx) | Step 4 — Asset selection |
| [delivery/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/first-trade/delivery/page.tsx) | Step 5 — Delivery method (vault or ship) |
| [review/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/first-trade/review/page.tsx) | Step 6 — Order review |
| [authorize/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/first-trade/authorize/page.tsx) | Step 7 — Final authorization |
| [success/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/first-trade/success/page.tsx) | Step 8 — Confirmation |

### Post-Onboarding Pages

| File | Purpose |
|------|---------|
| [compliance/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/compliance/page.tsx) | Compliance status dashboard |
| [marketplace/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/marketplace/page.tsx) | Institutional marketplace |
| [orders/page.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/institutional/orders/page.tsx) | Order history |

---

## 2. Shared Components (`src/components/institutional-flow/`)

| File | Purpose |
|------|---------|
| [MissionLayout.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/components/institutional-flow/MissionLayout.tsx) | Full-screen guided layout (gold bar, header, progress, footer) |
| [StepShell.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/components/institutional-flow/StepShell.tsx) | Per-step content wrapper (icon, headline, description, body, footer) |
| [SimpleProgress.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/components/institutional-flow/SimpleProgress.tsx) | Header progress indicator |
| [StickyPrimaryAction.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/components/institutional-flow/StickyPrimaryAction.tsx) | Primary CTA button + optional secondary action |
| [AutoCheckList.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/components/institutional-flow/AutoCheckList.tsx) | Animated milestone checklist (verification page) |
| [BigChoiceCard.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/components/institutional-flow/BigChoiceCard.tsx) | Method selection card (funding page) |
| [ReviewCard.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/components/institutional-flow/ReviewCard.tsx) | Read-only summary card |
| [index.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/components/institutional-flow/index.ts) | Barrel export |

Also used:
| [app-logo.tsx](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/components/app-logo.tsx) | AurumShield logo (SVG, theme-aware) |

---

## 3. Schemas & Validation (`src/lib/schemas/`)

| File | Purpose |
|------|---------|
| [institutional-journey-schema.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/schemas/institutional-journey-schema.ts) | Journey stage definitions + types |
| [onboarding-schema.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/schemas/onboarding-schema.ts) | Full onboarding Zod schema (jurisdiction list, field defs) |
| [organization-stage-schema.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/schemas/organization-stage-schema.ts) | Organization step Zod schema |
| [verification-stage-schema.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/schemas/verification-stage-schema.ts) | Verification milestone types |
| [funding-stage-schema.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/schemas/funding-stage-schema.ts) | Funding step Zod schema + readiness helpers |

---

## 4. Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| [use-onboarding-state.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/hooks/use-onboarding-state.ts) | GET/PATCH onboarding state + `useJourneyStage()` |
| [use-compliance-case.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/hooks/use-compliance-case.ts) | Compliance case queries + verification initiation mutation |

---

## 5. Server Actions (`src/lib/actions/`)

| File | Purpose |
|------|---------|
| [onboarding-actions.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/actions/onboarding-actions.ts) | Server-side onboarding orchestration |
| [initiate-verification-action.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/actions/initiate-verification-action.ts) | KYC/KYB provider session creation |

---

## 6. API Routes (`src/app/api/compliance/`)

| File | Purpose |
|------|---------|
| [state/route.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/compliance/state/route.ts) | GET/PATCH onboarding_state persistence |
| [cases/me/route.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/compliance/cases/me/route.ts) | Current user's compliance case |
| [cases/me/initiate/route.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/compliance/cases/me/initiate/route.ts) | Initiate provider verification |
| [cases/[caseId]/message/route.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/compliance/cases/%5BcaseId%5D/message/route.ts) | Case messaging |
| [funding-readiness/route.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/compliance/funding-readiness/route.ts) | Server-authoritative funding check |
| [wallets/register/route.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/compliance/wallets/register/route.ts) | Wallet registration + OFAC screening |
| [aml-status/route.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/compliance/aml-status/route.ts) | AML screening status |
| [stream/route.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/compliance/stream/route.ts) | SSE compliance event stream |

### Admin Migration Routes

| File | Purpose |
|------|---------|
| [migrate-onboarding/route.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/admin/migrate-onboarding/route.ts) | One-time schema migration endpoint |
| [migrate-kycaid/route.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/admin/migrate-kycaid/route.ts) | KYCaid-specific migration endpoint |

### Webhook Routes

| File | Purpose |
|------|---------|
| [webhooks/kycaid/](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/app/api/webhooks/kycaid/) | KYCaid verification result webhook |

---

## 7. Compliance Libraries (`src/lib/compliance/`)

| File | Purpose |
|------|---------|
| [onboarding-state.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/compliance/onboarding-state.ts) | DB CRUD for `onboarding_state` table |
| [compliance-engine.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/compliance/compliance-engine.ts) | Multi-vendor compliance router (KYCAID/VERIFF/IDENFY) |
| [funding-readiness.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/compliance/funding-readiness.ts) | Server-side funding readiness logic |
| [wallet-compliance-status.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/compliance/wallet-compliance-status.ts) | Wallet screening truth types |
| [kycaid-adapter.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/compliance/kycaid-adapter.ts) | KYCaid API integration |
| [kycaid-callback-verifier.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/compliance/kycaid-callback-verifier.ts) | KYCaid webhook signature verification |

---

## 8. Database Migrations (`src/db/migrations/`)

| File | Purpose |
|------|---------|
| [002_onboarding_state.sql](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/db/migrations/002_onboarding_state.sql) | Creates `onboarding_state` table |
| [041_patch_onboarding_columns.sql](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/db/migrations/041_patch_onboarding_columns.sql) | Adds missing columns idempotently |
| [040_kycaid_vendor.sql](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/db/migrations/040_kycaid_vendor.sql) | KYCaid vendor-specific schema |

---

## 9. Tests

| File | Purpose |
|------|---------|
| [kycaid-provider.test.ts](file:///c:/Users/jimbo/OneDrive/Desktop/gold/src/lib/__tests__/kycaid-provider.test.ts) | KYCaid adapter tests |

---

## 10. Scripts

| File | Purpose |
|------|---------|
| [fix-onboarding-schema.mjs](file:///c:/Users/jimbo/OneDrive/Desktop/gold/scripts/fix-onboarding-schema.mjs) | Standalone migration script (direct DB) |
