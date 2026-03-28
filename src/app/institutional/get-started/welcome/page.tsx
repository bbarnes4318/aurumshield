"use client";

/* ================================================================
   WELCOME — /institutional/get-started/welcome
   ================================================================
   First screen of the institutional guided journey.
   Must exude institutional trust and premium quality.

   One headline. Four steps previewed. One action.
   ================================================================ */

import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import { Building2, ShieldCheck, Landmark, BarChart3, Shield } from "lucide-react";

/* ── Guided stages (macro framing — preview of what's ahead) ── */
const GUIDED_STAGES = [
  {
    icon: Building2,
    label: "Organization Setup",
    description: "Entity name, jurisdiction, and authorized signatory",
  },
  {
    icon: ShieldCheck,
    label: "Identity Verification",
    description: "KYB, UBO review, and OFAC sanctions screening",
  },
  {
    icon: Landmark,
    label: "Funding Readiness",
    description: "Connect settlement rails — stablecoin or Fedwire",
  },
  {
    icon: BarChart3,
    label: "First Allocation",
    description: "Select an asset, choose custody, and confirm intent",
  },
] as const;

export default function WelcomePage() {
  return (
    <StepShell
      icon={Shield}
      headline="Institutional Onboarding"
      description="Complete your compliance review to begin trading physical gold. 4&nbsp;steps&nbsp;·&nbsp;~10&nbsp;minutes."
    >
      {/* ── Macro Progress Framing ── */}
      <div className="w-full max-w-md mx-auto mb-3">
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 divide-y divide-slate-800/40 overflow-hidden">
          {GUIDED_STAGES.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.label}
                className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-slate-800/20"
              >
                {/* Step Number + Icon */}
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/80">
                  <Icon className="h-4 w-4 text-[#C6A86B]" strokeWidth={1.5} />
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-[9px] font-mono font-bold text-slate-400">
                    {i + 1}
                  </span>
                </div>

                {/* Step Info */}
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-slate-200 leading-tight">
                    {stage.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Trust Signal ── */}
      <p className="text-[10px] text-slate-600 font-mono tracking-wider uppercase mb-2">
        SOC 2 Compliant · Bank-Grade Encryption · OFAC Screened
      </p>

      {/* ── Primary CTA ── */}
      <StickyPrimaryAction
        label="Get Started"
        href="/institutional/get-started/organization"
      />
    </StepShell>
  );
}
