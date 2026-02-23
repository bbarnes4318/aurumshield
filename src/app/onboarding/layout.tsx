/* ================================================================
   /onboarding — Standalone Layout (No AppShell)
   ================================================================
   The onboarding page is a standalone experience without the
   sidebar, topbar, or any admin chrome. This layout renders
   children directly on a full-viewport color-1 background.
   ================================================================ */

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-color-1 flex items-center justify-center p-6">
      {children}
    </div>
  );
}
