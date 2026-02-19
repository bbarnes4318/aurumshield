/* ================================================================
   Logo Sizing — Single source of truth
   ================================================================
   Normal mode: 40px tall (legible at a glance).
   Presentation mode: 52px tall (sized for room projection).
   ================================================================ */

export const LOGO_SIZE = {
  normal: { height: 40, width: "auto" as const },
  presentation: { height: 52, width: "auto" as const },
} as const;

/** CSS class to apply in presentation mode for logo scaling */
export const LOGO_PRESENTATION_CLASS = "presentation-logo";
