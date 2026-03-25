"use client";

/* ================================================================
   GUIDED SHELL LAYOUT — /institutional/get-started/*
   ================================================================
   Uses MissionLayout from the guided-flow component system.
   No sidebar, no dense navigation, no command-center chrome.

   Reusable for all guided steps:
     /get-started/welcome
     /get-started/organization
     /get-started/verification
     /get-started/funding
   ================================================================ */

import { type ReactNode } from "react";
import { MissionLayout } from "@/components/institutional-flow/MissionLayout";
import { useJourneyStage } from "@/hooks/use-onboarding-state";

export default function GuidedShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { stage } = useJourneyStage();

  return (
    <MissionLayout currentStage={stage} showProgress>
      {children}
    </MissionLayout>
  );
}
