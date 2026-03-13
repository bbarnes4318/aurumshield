"use client";

/* ================================================================
   DEMO DIMMING OVERLAY — Focus Mode
   ================================================================
   When ?demo=active, renders a translucent backdrop that sits
   behind spotlighted buttons (z-50) but above the rest of the UI
   (z-40). Forces the investor's eye directly to the required action.
   
   Also renders a tooltip above the page content area pointing to
   the spotlighted element.
   ================================================================ */

import { useDemoTour } from "@/hooks/use-demo-tour";

export function DemoDimmingOverlay() {
  const { isDemoActive } = useDemoTour();

  if (!isDemoActive) return null;

  return (
    <div
      className="fixed inset-0 z-90 bg-slate-950/40 backdrop-blur-[1px] pointer-events-none"
      aria-hidden="true"
    />
  );
}
