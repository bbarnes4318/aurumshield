"use client";

/* ================================================================
   USE-DEMO-TOUR — Global Demo State Hook
   ================================================================
   Lightweight hook that reads ?demo=active from the URL and
   determines whether spotlights + dimming overlay should be shown.
   
   Exports the 5-step tour sequence for the institutional portal.
   
   The DemoSpotlight CSS class and DemoDimmingOverlay are exported
   for use in target pages.
   ================================================================ */

import { useSearchParams, usePathname } from "next/navigation";
import { INSTITUTIONAL_ROUTES } from "@/lib/routing/institutional-routes";

/* ---------- 5-Step Demo Tour Sequence (Institutional Portal) ---------- */
export const DEMO_TOUR_STEPS = [
  {
    id: "get-started",
    label: "Get Started",
    path: INSTITUTIONAL_ROUTES.GET_STARTED_WELCOME,
    tooltip: "Begin your institutional onboarding — welcome to AurumShield ↓",
  },
  {
    id: "verification",
    label: "Verification",
    path: INSTITUTIONAL_ROUTES.GET_STARTED_VERIFICATION,
    tooltip: "Complete identity and entity verification ↓",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    path: INSTITUTIONAL_ROUTES.MARKETPLACE,
    tooltip: "Initiate execution quote on the 400-oz Good Delivery Bar ↓",
  },
  {
    id: "orders",
    label: "Execution",
    path: INSTITUTIONAL_ROUTES.ORDERS,
    tooltip: "Execute DvP swap and download clearing certificate ↓",
  },
  {
    id: "compliance",
    label: "Compliance",
    path: INSTITUTIONAL_ROUTES.COMPLIANCE,
    tooltip: "Review compliance status and audit trail ↓",
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
