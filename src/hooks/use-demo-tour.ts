"use client";

/* ================================================================
   USE-DEMO-TOUR — Global Demo State Hook
   ================================================================
   Lightweight hook that reads ?demo=active from the URL and
   determines whether spotlights + dimming overlay should be shown.
   
   This is NOT a context provider — it's a simple hook that reads
   searchParams. Each consuming component calls it independently.
   
   The DemoSpotlight CSS class and DemoDimmingOverlay are exported
   for use in target pages.
   ================================================================ */

import { useSearchParams, usePathname } from "next/navigation";

/** The spotlight CSS classes for the target button */
export const DEMO_SPOTLIGHT_CLASSES =
  "relative z-50 ring-4 ring-[#c6a86b] ring-offset-2 ring-offset-slate-950 shadow-[0_0_20px_rgba(198,168,107,0.5)]";

/** Hook: returns demo state based on URL params */
export function useDemoTour() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const isDemoActive = searchParams.get("demo") === "active";

  return {
    isDemoActive,
    pathname,
  };
}
