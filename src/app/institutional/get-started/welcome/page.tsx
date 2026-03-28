"use client";

/* ================================================================
   WELCOME — /institutional/get-started/welcome
   ================================================================
   First screen of the institutional guided journey.
   Uses the shared guided-flow component system.

   One headline. One explanation. One action.
   Macro progress framing without dashboard clutter.
   ================================================================ */

import { StepShell } from "@/components/institutional-flow/StepShell";
import { AppLogo } from "@/components/app-logo";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";

/* ── Guided stages (macro framing — preview of what's ahead) ── */
const GUIDED_STAGES = [
  { label: "Organization Setup", description: "We record your entity name and jurisdiction — nothing else" },
  { label: "Verification", description: "KYB, UBO review, and sanctions screening via our compliance provider" },
  { label: "Funding Readiness", description: "Connect a stablecoin wallet or banking details for settlement" },
  { label: "First Allocation", description: "Select an asset, choose custody, and confirm your trade intent" },
] as const;

export default function WelcomePage() {
  return (
    <StepShell
      icon={<AppLogo className="h-8 w-auto" variant="dark" />}
      headline="Welcome to AurumShield"
      description="4 steps · ~10 minutes · Progress auto-saved."
    >
      {/* ── Macro Progress Framing ── */}
      <div className="w-full max-w-sm mx-auto mb-2">
        <div className="space-y-0">
          {GUIDED_STAGES.map((stage, i) => (
            <div
              key={stage.label}
              className="flex items-center gap-3 px-3 py-1.5 border-b border-slate-800/50 last:border-0"
            >
              {/* Step Number */}
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60">
                <span className="font-mono text-[10px] text-slate-400 font-bold">
                  {i + 1}
                </span>
              </div>

              {/* Step Info */}
              <div className="text-left">
                <p className="text-xs font-medium text-slate-300">
                  {stage.label}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                  {stage.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Primary CTA ── */}
      <StickyPrimaryAction
        label="Get Started"
        href="/institutional/get-started/organization"
      />
    </StepShell>
  );
}
