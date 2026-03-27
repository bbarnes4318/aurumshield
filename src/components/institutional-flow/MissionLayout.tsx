"use client";

/* ================================================================
   MISSION LAYOUT — Full-screen guided journey wrapper
   ================================================================
   Calm, full-screen layout for the institutional guided journey.
   No sidebar, no dashboard chrome, no PortalShell.

   Structure:
     ┌──── GOLD ACCENT BAR (2px) ───────────────────────┐
     ├──── HEADER (logo + progress + user) ─────────────┤
     │                                                    │
     │         CENTERED CONTENT (max-w-xl)               │
     │         scrollable, vertically centered            │
     │                                                    │
     ├──── TRUST FOOTER ────────────────────────────────┤
     └───────────────────────────────────────────────────┘

   Used by:
     /get-started/layout.tsx
     /first-trade/layout.tsx (future)
   ================================================================ */

import { type ReactNode } from "react";
import { AppLogo } from "@/components/app-logo";
import { SimpleProgress } from "@/components/institutional-flow/SimpleProgress";
import { type InstitutionalJourneyStage } from "@/lib/schemas/institutional-journey-schema";

interface MissionLayoutProps {
  children: ReactNode;
  /** Current journey stage — drives the progress indicator */
  currentStage?: InstitutionalJourneyStage | null;
  /** Whether to show the progress indicator (default: true) */
  showProgress?: boolean;
}

export function MissionLayout({
  children,
  currentStage = "WELCOME",
  showProgress = true,
}: MissionLayoutProps) {
  return (
    <div className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-slate-950 text-slate-300">
      {/* ── Gold Accent Bar ── */}
      <div className="h-0.5 w-full bg-linear-to-r from-[#C6A86B]/0 via-[#C6A86B]/60 to-[#C6A86B]/0 shrink-0" />

      {/* ── Header ── */}
      <header className="shrink-0 border-b border-slate-800/30 bg-slate-950 px-6 py-3">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          {/* Left spacer — balances layout */}
          <div className="w-20" />

          {showProgress && currentStage !== undefined && (
            <SimpleProgress currentStage={currentStage} />
          )}

          {/* Right spacer — balances layout when progress is centered */}
          <div className="w-20" />
        </div>
      </header>

      {/* ── Main Content — NO SCROLL. Content MUST fit viewport. ── */}
      <main className="flex-1 min-h-0 overflow-hidden px-6 py-4">
        <div className="mx-auto w-full max-w-xl flex flex-col items-center justify-center min-h-full">
          {children}
        </div>
      </main>

      {/* ── Trust Footer ── */}
      <footer className="shrink-0 border-t border-slate-800/50 bg-slate-950 px-6 py-2">
        <div className="flex items-center justify-between">
          <AppLogo className="h-5 w-auto opacity-30" variant="dark" />
          <p className="font-mono text-[9px] text-slate-700 tracking-wider uppercase">
            Progress auto-saved · TLS-encrypted session · Support: operations@aurumshield.com
          </p>
        </div>
      </footer>
    </div>
  );
}
