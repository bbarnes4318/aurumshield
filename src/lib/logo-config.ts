/* ================================================================
   Logo Sizing — Single source of truth
   ================================================================
   DEPRECATED: Use <AppLogo /> from @/components/app-logo instead.
   This file is kept for backward compatibility only.

   The canonical sizes are:
     sidebar:      160px (sidebar brand row)
     normal:       180px (login, signup, forgot-password)
     presentation: 200px (demo login, walkthrough, projection)
     document:     140px (certificates, receipts, audit pages)
   ================================================================ */

export const LOGO_SIZE = {
  sidebar: { height: 160, width: "auto" as const },
  normal: { height: 180, width: "auto" as const },
  presentation: { height: 200, width: "auto" as const },
  document: { height: 140, width: "auto" as const },
} as const;

/** CSS class to apply in presentation mode for logo scaling */
export const LOGO_PRESENTATION_CLASS = "presentation-logo";
