# Institutional Rejected Case Recovery

> How rejected institutional verification cases are handled in the guided onboarding flow.

## Problem

Users with a `REJECTED` compliance case hit a dead-end: milestones appeared pending with a vague "please contact support" status label, but no actionable path forward.

## Recovery Type: Support-Driven

`REJECTED` is a **terminal state** in the compliance state machine. The codebase has no `reopenCase`, `resetCase`, or automated re-application mechanism. Recovery requires a compliance officer to create a new case.

**This is honest.** No fake "retry" button is shown.

## What the User Sees

When `caseStatus === "REJECTED"`:

1. **Milestones**: All show as pending (fail-closed — nothing verified)
2. **Red rejection panel** (not amber — this is final):
   - `XCircle` icon + "Verification Not Approved"
   - Explanation of common reasons (documentation, discrepancies, screening)
   - "What you can do" guidance card:
     - Contact compliance team
     - Provide additional documentation
     - Request a new review
   - Reassurance that onboarding progress is preserved
   - `mailto:compliance@aurumshield.com` button
3. **Progress summary**: Shows red `statusLabel` text
4. **"Begin Verification" CTA**: Hidden (canInitiate is false for REJECTED)
5. **"Continue to Funding"**: Disabled (allComplete is false)

## State Machine Truth

| Transition | Allowed? |
|-----------|----------|
| REJECTED → APPROVED | ❌ Blocked |
| REJECTED → OPEN | ❌ Blocked |
| New case for same user | ✅ Compliance officer creates via admin |

## Deferred

- **TODO**: Automated re-application flow (new case creation by the user)
- **TODO**: Admin-triggered "re-open for re-application" button in the compliance inbox
- The current path is: user contacts compliance → officer creates new case → user returns to verification page → page reads the new case status
