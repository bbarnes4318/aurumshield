import React from "react";

/**
 * GoldwireBrandLogo — Reusable product logo component.
 *
 * Uses an icon-only SVG for the geometric mark and Tailwind CSS
 * for the "GOLDWIRE" text gradient. This prevents cross-browser
 * font degradation that occurs when text is baked into SVGs.
 *
 * DO NOT use this to replace the AurumShield navigation/footer logos.
 */
export function GoldwireBrandLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3.5 lg:gap-4 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/goldwire-icon.svg"
        alt=""
        className="h-10 md:h-11 lg:h-12 w-auto"
        aria-hidden="true"
      />
      <span
        className="text-2xl md:text-[28px] lg:text-[32px] font-bold tracking-[0.22em] uppercase bg-gradient-to-r from-[#F5EACF] via-[#D4AF37] to-[#BFA052] bg-clip-text text-transparent drop-shadow-sm select-none"
        aria-label="Goldwire"
      >
        GOLDWIRE
      </span>
    </div>
  );
}
