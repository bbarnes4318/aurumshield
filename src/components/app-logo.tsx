"use client";

/* ================================================================
   AppLogo — Single source of truth for logo rendering
   ================================================================
   CRITICAL FIX: The logo image is 2000×2000 (square) but the actual
   wordmark/shield content only occupies ~20% of the vertical space.
   Previous height-based sizing made the visible text tiny (e.g., a
   160px height on a square image gave ~30px visible text).

   Now sizes by WIDTH so the logo fills its container horizontally,
   and the browser auto-calculates the proportional height.

   Width tiers:
     sidebar:      180px  (sidebar brand row, ~224px container)
     normal:       320px  (login, signup, forgot-password)
     presentation: 400px  (demo login, walkthrough, projection)
     document:     240px  (certificates, receipts, audit)

   Usage:
     <AppLogo />                          → normal (white, 320px)
     <AppLogo variant="navy" />           → normal (navy, 320px)
     <AppLogo size="presentation" />      → presentation (white, 400px)
     <AppLogo size="document" />          → document (navy, 240px)
     <AppLogo size="sidebar" />           → sidebar (white, 180px)
   ================================================================ */

import Image from "next/image";

/** Enforced widths — the one-and-only source of truth. */
const SIZE_MAP = {
  sidebar: 180,
  normal: 320,
  presentation: 400,
  document: 240,
} as const;

export type LogoSize = keyof typeof SIZE_MAP;
export type LogoVariant = "white" | "navy";

interface AppLogoProps {
  /** Size tier. Defaults to "normal" (320px wide). */
  size?: LogoSize;
  /** Color variant. Defaults to "white". */
  variant?: LogoVariant;
  /** Optional extra className (use sparingly — cannot override width). */
  className?: string;
  /** Priority loading hint for next/image. */
  priority?: boolean;
}

const SRC_MAP: Record<LogoVariant, string> = {
  white: "/arum-logo-white.png",
  navy: "/arum-logo-navy.png",
};

/**
 * Renders the AurumShield logo at an enforced width.
 * Width is applied via inline `style` so Tailwind utility classes
 * (w-6, w-8, etc.) cannot override it.
 */
export function AppLogo({
  size = "normal",
  variant = "white",
  className,
  priority = false,
}: AppLogoProps) {
  const widthPx = SIZE_MAP[size];

  return (
    <Image
      src={SRC_MAP[variant]}
      alt="AurumShield"
      width={2000}
      height={2000}
      className={className}
      priority={priority}
      style={{
        width: `${widthPx}px`,
        height: "auto",
        minWidth: `${widthPx}px`,
        maxWidth: "100%",
        display: "block",
      }}
    />
  );
}

/**
 * Plain <img> version for pages that render outside Next.js app shell
 * (e.g. /platform, /demo/walkthrough with embedded <style>).
 * Same enforced sizing, no next/image optimization.
 */
export function AppLogoImg({
  size = "normal",
  variant = "white",
  className,
}: Omit<AppLogoProps, "priority">) {
  const widthPx = SIZE_MAP[size];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC_MAP[variant]}
      alt="AurumShield"
      className={className}
      style={{
        width: `${widthPx}px`,
        height: "auto",
        minWidth: `${widthPx}px`,
        maxWidth: "100%",
        display: "block",
      }}
    />
  );
}
