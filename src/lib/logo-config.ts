/* ================================================================
   Logo Sizing — Single source of truth
   ================================================================
   Normal mode: 32px tall (legible at small sidebar widths).
   Presentation mode: 42px tall (sized for room projection).
   ================================================================ */

export const LOGO_SIZE = {
  normal: { height: 32, width: "auto" as const },
  presentation: { height: 42, width: "auto" as const },
} as const;

/** CSS class to apply in presentation mode for logo scaling */
export const LOGO_PRESENTATION_CLASS = "presentation-logo";
