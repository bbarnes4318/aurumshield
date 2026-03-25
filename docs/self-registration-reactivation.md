# Self-Registration Reactivation

> How user self-registration was re-enabled in the AurumShield auth flow.

## Before

`/signup` was disabled — it redirected to `/login` immediately. Users could only be invited or manually created.

## After

`/signup` renders a real Clerk `<SignUp>` component. Users can self-register and land in the institutional guided journey.

## Architecture

```
/signup → Clerk <SignUp> → Clerk creates user → redirect to /platform
  │
  └─ /platform detects new user (no onboarding state)
       └─ Routes to /institutional/get-started/welcome
```

## What Changed

| Component | Change |
|-----------|--------|
| `src/app/signup/page.tsx` | Replaced redirect with real `<SignUp>` component |
| Middleware | **None** — `/signup(.*)` was already a public route |
| Clerk env vars | **None** — `SIGN_UP_URL=/signup` and `SIGN_UP_FALLBACK_REDIRECT_URL=/platform` already set |

## Design

Visually identical to `/login`:
- Same layout, brand treatment, and institutional tone
- Same Clerk appearance overrides (dark sovereign styling)
- Same fallback UI when Clerk is not configured
- Subtitle reads "Create Your Account" instead of "Institutional Access"

## Post-Signup Routing

1. Clerk completes registration
2. User redirected to `/platform` (via `fallbackRedirectUrl`)
3. Platform page detects new user (no onboarding state)
4. Routes to `/institutional/get-started/welcome`
5. Guided journey begins

## Cross-References

- Login page: `signUpUrl="/signup"` — Clerk "Sign up" link points here
- Signup page: `signInUrl="/login"` — Clerk "Sign in" link points back
