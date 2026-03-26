# Admin Institutional Portal Target Update

> Admins' "View Institutional Portal" action now opens the new institutional experience.

## Changes

| File | Change |
|------|--------|
| `src/components/layout/sidebar.tsx` L378 | Impersonation target: `/offtaker/marketplace` → `/institutional` |
| `src/components/layout/app-shell.tsx` L33 | Removed stale `/institutional-portal` from bypass list |
| `src/app/institutional-portal/` | **Deleted** — dead legacy route (rendered `UnifiedInstitutionalHub`) |

## Behavior

**Admin clicks "View Institutional Portal":**
1. Sidebar enters offtaker impersonation mode
2. Navigates to `/institutional`
3. `/institutional` respects the routing model:
   - Incomplete users → `/institutional/get-started/welcome` (guided flow)
   - Completed users → `/institutional/marketplace` (advanced workspace)

## What Was Left In Place

- `OFFTAKER_CLEARED_NAV` items (legacy offtaker nav) — still used when admin is physically inside `/offtaker/*` routes (pathname detection)
- Marketing "Access the Institutional Portal" button — already opens KYC modal, not a route link
