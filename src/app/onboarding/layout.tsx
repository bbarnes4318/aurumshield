/* ================================================================
   /onboarding — Layout (Inside AppShell)
   ================================================================
   Onboarding is now a guided workflow embedded within the full
   app shell. The sidebar and topbar remain visible so users don't
   feel trapped. This layout is a simple pass-through — the AppShell
   provides the chrome.
   ================================================================ */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AurumShield — Onboarding",
  description: "Complete your institutional compliance verification.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl py-4">
      {children}
    </div>
  );
}
