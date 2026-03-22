import React from "react";

/**
 * GoldwireBrandLogo — Reusable product logo component.
 *
 * Uses the official goldwire-logo.svg which contains the geometric
 * diamond mark + "GOLDWIRE" text baked in (#D4AF37 gold).
 *
 * DO NOT use this to replace the AurumShield navigation/footer logos.
 */
export function GoldwireBrandLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/goldwire-logo.svg"
        alt="Goldwire"
        className="h-10 md:h-11 lg:h-12 w-auto"
      />
    </div>
  );
}
