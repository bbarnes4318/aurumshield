import React from "react";

/* ================================================================
   AppLogo — Theme-aware static SVG logo wrapper
   ================================================================
   Renders one of two static SVG logo files based on background:
     variant="dark"  → /arum-logo-gold.svg  (gold logo on dark bg)
     variant="light" → /arum-logo-navy.svg  (navy logo on light bg)

   Usage:
     <AppLogo />                                   → gold logo, h-8
     <AppLogo variant="light" />                   → navy logo, h-8
     <AppLogo className="h-10 w-auto" />           → gold logo, h-10
     <AppLogo className="h-14 w-auto" variant="dark" /> → gold, h-14
   ================================================================ */

interface AppLogoProps {
  className?: string;
  variant?: "light" | "dark";
}

export function AppLogo({
  className = "h-8 w-auto",
  variant = "dark",
}: AppLogoProps) {
  const src =
    variant === "dark" ? "/arum-logo-gold.svg" : "/arum-logo-navy.svg";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="AurumShield Logo" className={className} />
  );
}
