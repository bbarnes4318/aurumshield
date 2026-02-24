/* ================================================================
   /onboarding — Isolated Compliance Layout (No AppShell)
   ================================================================
   Renders a minimal top-bar with the AurumShield logo ONLY.
   No sidebar, no navbar, no dashboard chrome. Unverified users
   must see nothing except the compliance protocol.
   ================================================================ */

import { AppLogo } from "@/components/app-logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-color-1 flex flex-col">
      {/* ── Minimal Top Bar — Logo Only ── */}
      <header className="shrink-0 flex items-center px-6 py-4 border-b border-color-5/20">
        <AppLogo className="h-8 w-auto" variant="dark" />
      </header>

      {/* ── Content Area ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
