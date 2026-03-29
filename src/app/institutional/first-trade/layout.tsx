"use client";

/* ================================================================
   GUIDED SHELL LAYOUT — /institutional/first-trade/*
   ================================================================
   Full-screen guided layout for the institutional first-trade flow.
   Identical pattern to /get-started/layout.tsx.

   No sidebar, no dense navigation, no command-center chrome.

   Reusable for all first-trade steps:
     /first-trade/asset
     /first-trade/delivery
     /first-trade/review
     /first-trade/authorize
     /first-trade/success  (renders fullBleed — its own dashboard)
   ================================================================ */

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MissionLayout } from "@/components/institutional-flow/MissionLayout";
import { useJourneyStage } from "@/hooks/use-onboarding-state";

export default function FirstTradeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { stage } = useJourneyStage();
  const pathname = usePathname();
  const isSuccessPage = pathname.endsWith("/success");

  return (
    <MissionLayout
      currentStage={stage ?? undefined}
      showProgress
      fullBleed={isSuccessPage}
    >
      {children}
    </MissionLayout>
  );
}
