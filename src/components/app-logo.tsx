"use client";

/* ================================================================
   AppLogo — Single source of truth for logo rendering
   ================================================================
   Size tiers (enforced via inline style, immune to Tailwind overrides):
     sidebar:      160px height  (sidebar brand row)
     normal:       180px height  (login, signup, forgot-password)
     presentation: 200px height  (demo login, walkthrough, projection)
     document:     140px height  (certificates, receipts, audit)

   Usage:
     <AppLogo />                          → normal (white, 180px)
     <AppLogo variant="navy" />           → normal (navy, 180px)
     <AppLogo size="presentation" />      → presentation (white, 200px)
     <AppLogo size="document" />          → document (navy, 140px)
     <AppLogo size="sidebar" />           → sidebar (white, 160px)
   ================================================================ */

import { useEffect, useRef } from "react";
import Image from "next/image";

/** Enforced heights — the one-and-only source of truth. */
const SIZE_MAP = {
  sidebar: 160,
  normal: 180,
  presentation: 200,
  document: 140,
} as const;

export type LogoSize = keyof typeof SIZE_MAP;
export type LogoVariant = "white" | "navy";

interface AppLogoProps {
  /** Size tier. Defaults to "normal" (180px). */
  size?: LogoSize;
  /** Color variant. Defaults to "white". */
  variant?: LogoVariant;
  /** Optional extra className (use sparingly — cannot override height). */
  className?: string;
  /** Priority loading hint for next/image. */
  priority?: boolean;
}

const SRC_MAP: Record<LogoVariant, string> = {
  white: "/arum-logo-white.png",
  navy: "/arum-logo-navy.png",
};

/**
 * Renders the AurumShield logo at an enforced height.
 * Height is applied via inline `style` so Tailwind utility classes
 * (h-6, h-8, h-10, etc.) cannot override it.
 */
export function AppLogo({
  size = "normal",
  variant = "white",
  className,
  priority = false,
}: AppLogoProps) {
  const heightPx = SIZE_MAP[size];
  const ref = useRef<HTMLImageElement>(null);

  // ── Dev-mode sanity check ──
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;

    const isDemoMode =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      window.location.search.includes("debug=true");

    if (!isDemoMode) return;

    const timer = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.height < 44) {
        console.warn(
          `[AppLogo Sanity] Logo rendered at ${rect.height.toFixed(1)}px — below 44px threshold. ` +
            `Expected ${heightPx}px. Check parent for overflow/max-h constraints.`,
          { element: el, rect }
        );
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [heightPx]);

  return (
    <Image
      ref={ref}
      src={SRC_MAP[variant]}
      alt="AurumShield"
      width={800}
      height={200}
      className={className}
      priority={priority}
      style={{
        height: `${heightPx}px`,
        width: "auto",
        minHeight: `${heightPx}px`,
        maxHeight: `${heightPx}px`,
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
  const heightPx = SIZE_MAP[size];
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;

    const isDemoMode =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      window.location.search.includes("debug=true");

    if (!isDemoMode) return;

    const timer = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.height < 44) {
        console.warn(
          `[AppLogoImg Sanity] Logo rendered at ${rect.height.toFixed(1)}px — below 44px threshold.`,
          { element: el, rect }
        );
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [heightPx]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={SRC_MAP[variant]}
      alt="AurumShield"
      className={className}
      style={{
        height: `${heightPx}px`,
        width: "auto",
        minHeight: `${heightPx}px`,
        maxHeight: `${heightPx}px`,
        display: "block",
      }}
    />
  );
}
