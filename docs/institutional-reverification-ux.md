# Institutional Reverification UX

> How stale-session failures during first-trade authorization are handled gracefully.

## Problem

`requireReverification()` enforces a 5-minute session freshness window for first-trade authorization. If the session is stale, the server throws `AuthError("REVERIFICATION_REQUIRED")`, which the authorize page caught generically and dumped as a raw error string — confusing, with no recovery path.

## Solution

The authorize page now detects `REVERIFICATION_REQUIRED` in the error message and shows a **guided re-verification prompt** instead of a raw error.

## Recovery Flow

```
User clicks "Hold to Confirm" → submitFirstTrade()
  │
  ├─ Session fresh (< 5 min) → normal execution
  │
  └─ Session stale → throws AuthError("REVERIFICATION_REQUIRED")
       │
       └─ Authorize page catch block detects message
            │
            ├─ Sets needsReverification = true
            ├─ Hides raw error, shows amber re-auth prompt
            ├─ User clicks "Re-authenticate to Continue"
            │    ├─ saveMutation persists draft + journey state
            │    └─ Redirects to /sign-in?redirect_url=(current page)
            │
            └─ After Clerk re-auth:
                 ├─ Redirected back to /first-trade/authorize
                 ├─ Draft restored from onboarding metadata
                 └─ User retries with fresh session
```

## Re-Auth Pattern

**Redirect-based**, not modal. The user is sent to `/sign-in` with `redirect_url` pointing back to the authorize page. Clerk handles the authentication and redirects back. Progress is preserved because:
- Draft is persisted to `onboarding_state.metadata_json.__firstTradeDraft` before redirect
- Journey stage remains `FIRST_TRADE_AUTHORIZE`
- The page restores all state from metadata on mount

## What Remains Intact

| Layer | Status |
|-------|--------|
| `requireReverification()` in `authz.ts` | **Unchanged** |
| `submitFirstTrade()` 3-layer auth chain | **Unchanged** |
| All 13 first-trade authorization tests | **Pass** |
| Hold-to-confirm, scroll-to-unlock, typed phrase | **Preserved** |

## UI Treatment

Calm amber banner (not a red error):
- **KeyRound icon** + "Session Expired — Re-verification Required"
- Explanation of the 5-minute window
- Reassurance that progress is preserved
- Gold "Re-authenticate to Continue" button
