"use client";

/* ================================================================
   USE-DEMO-TOUR — Global Demo State Hook
   ================================================================
   Lightweight hook that reads ?demo=active from the URL and
   determines whether spotlights + dimming overlay should be shown.
   
   Exports the 5-step tour sequence for the offtaker portal.
   
   The DemoSpotlight CSS class and DemoDimmingOverlay are exported
   for use in target pages.
   ================================================================ */

import { useSearchParams, usePathname } from "next/navigation";

/* ---------- 5-Step Demo Tour Sequence ---------- */
export const DEMO_TOUR_STEPS = [
  {
    id: "org-select",
    label: "Org Select",
    path: "/offtaker/org/select",
    tooltip: "Select your Corporate Entity to enter the secure perimeter ↓",
  },
  {
    id: "intake",
    label: "Entity Intake",
    path: "/offtaker/onboarding/intake",
    tooltip: "Complete entity registration and declare UBOs ↓",
  },
  {
    id: "kyb",
    label: "KYB / AML",
    path: "/offtaker/onboarding/kyb",
    tooltip: "Verify identity via biometric liveness detection ↓",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    path: "/offtaker/marketplace",
    tooltip: "Initiate execution quote on the 400-oz Good Delivery Bar ↓",
  },
  {
    id: "orders",
    label: "Execution",
    path: "/offtaker/orders",
    tooltip: "Execute DvP swap and download clearing certificate ↓",
  },
] as const;

/** The spotlight CSS classes for the target button */
export const DEMO_SPOTLIGHT_CLASSES =
  "ring-2 ring-[#c6a86b] ring-offset-2 ring-offset-slate-950";

/** Helper: find current step index from pathname */
export function getDemoStepIndex(pathname: string): number {
  return DEMO_TOUR_STEPS.findIndex((s) => pathname.includes(s.path));
}

/** Hook: returns demo state based on URL params */
export function useDemoTour() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const isDemoActive = searchParams.get("demo") === "active";
  const currentStepIndex = getDemoStepIndex(pathname);

  return {
    isDemoActive,
    pathname,
    currentStepIndex,
    currentStep: currentStepIndex >= 0 ? DEMO_TOUR_STEPS[currentStepIndex] : null,
    totalSteps: DEMO_TOUR_STEPS.length,
  };
}
